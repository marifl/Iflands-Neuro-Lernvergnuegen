import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes } from './cutCapsMerged'
import { pickCutAwareHit } from './cutPick'
import { ATLAS_SURFACE_FLAG, prettyParcel } from './atlasParcels'
import { nearestCornerVertex } from './atlas/atlasPick'
import { pickFirstAtlasHit } from './atlasInteraction'
import { createCutPickTargetCache } from './cutPickTargets'

// Klick-vs-Orbit-Drag: ueber diese Pixel-Distanz gilt ein pointerup als Drag, nicht als Pick.
const DRAG_PX = 4

/**
 * Zentraler cut-aware Pick: ersetzt die R3F-Events auf Brain/Skull/Head durch einen
 * manuellen Raycast. Verwirft Treffer auf der weggeschnittenen Seite und macht die
 * gefuellten Schnittflaechen (Caps) anklickbar. Ohne aktiven Schnitt verhaelt es sich
 * wie der bisherige Oberflaechen-Pick (nur CUT_SOURCE_FLAG-Strukturen sind pickbar).
 */
export default function CutPickBridge() {
  const { gl, camera, raycaster, scene } = useThree()
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const pick = useViewerStore((s) => s.pick)
  const drill = useViewerStore((s) => s.drill)
  const select = useViewerStore((s) => s.select)
  const setHovered = useViewerStore((s) => s.setHovered)
  const setPickedAtlasArea = useViewerStore((s) => s.setPickedAtlasArea)
  const setHoveredAtlasArea = useViewerStore((s) => s.setHoveredAtlasArea)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const showSkull = useViewerStore((s) => s.showSkull)
  const showAtlasJulich = useViewerStore((s) => s.showAtlasJulich)
  const showAtlasDkt = useViewerStore((s) => s.showAtlasDkt)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)

  const pointer = useMemo(() => new THREE.Vector2(), [])
  const targetCache = useMemo(() => createCutPickTargetCache(scene), [scene])
  const down = useRef<{ x: number; y: number } | null>(null)
  const lastHover = useRef<string | null>(null)
  const lastAtlasHover = useRef<string | null>(null)

  // Cap-Picking nur im 'slice'-Modus; im 'hide'-Modus ist nichts geschnitten → reiner Oberflaechen-Pick.
  const cutPlanes = useMemo(() => (cutMode === 'slice' ? activeCutPlanes(cuts) : []), [cuts, cutMode])

  useEffect(() => {
    targetCache.markDirty()
  }, [
    targetCache,
    hidden,
    isolatedSlugs,
    cuts,
    cutMode,
    showSkull,
    showAtlasJulich,
    showAtlasDkt,
    showCarveJulich,
    showCarveDkt,
    showCarveBrodmann,
  ])

  useEffect(() => {
    const el = gl.domElement
    // Atlas-Areal aus einem Flaechen-Treffer (EIN vertex-gelabeltes Mesh): naechste Face-Ecke
    // -> Per-Vertex-Label -> Slug -> lesbarer Name + roher Slug (fuer die Bruecke).
    const surfaceArea = (hit: THREE.Intersection): { name: string; slug: string } | null => {
      const obj = hit.object as THREE.Mesh
      const pickData = obj.userData.atlasPick as { slugs: string[]; vlabels: Int16Array } | undefined
      if (!pickData || !hit.face) return null
      const local = obj.worldToLocal(hit.point.clone())
      const posAttr = obj.geometry.getAttribute('position') as THREE.BufferAttribute
      const vi = nearestCornerVertex(posAttr.array as Float32Array, hit.face.a, hit.face.b, hit.face.c, [local.x, local.y, local.z])
      const lbl = pickData.vlabels[vi]
      if (lbl < 0) return null
      const slug = pickData.slugs[lbl]
      return { name: prettyParcel(slug), slug }
    }

    // Liefert TARO-Struktur UND (falls getroffen) Atlas-Areal-Name + -Slug aus EINEM Raycast.
    const hitAt = (ev: MouseEvent): { taro: string | null; area: string | null; areaSlug: string | null } => {
      const rect = el.getBoundingClientRect()
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const targets = targetCache.get()
      const hits = raycaster.intersectObjects(targets.raycastTargets, false)
      // Atlas-Overlay (Carve) liegt auf der Oberflaeche -> naechster Treffer (Flaeche ODER Parzelle).
      const atlasHit = pickFirstAtlasHit(hits)
      let area: string | null = null
      let areaSlug: string | null = null
      if (atlasHit) {
        const obj = atlasHit.object as THREE.Mesh
        if (obj.userData[ATLAS_SURFACE_FLAG]) {
          const sa = surfaceArea(atlasHit)
          if (sa) { area = sa.name; areaSlug = sa.slug }
        } else {
          area = prettyParcel(obj.name); areaSlug = obj.name
        }
      }
      const taroHit = pickCutAwareHit(raycaster, hits, cutPlanes, targets.cutSources)
      return { taro: taroHit ? (taroHit.object as THREE.Mesh).name : null, area, areaSlug }
    }

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button === 0) down.current = { x: ev.clientX, y: ev.clientY }
    }
    const onPointerUp = (ev: PointerEvent) => {
      if (ev.button !== 0 || !down.current) return
      const dx = ev.clientX - down.current.x
      const dy = ev.clientY - down.current.y
      down.current = null
      if (dx * dx + dy * dy > DRAG_PX * DRAG_PX) return // Orbit-Drag (Kamera), kein Pick/Deselect
      const { taro, area, areaSlug } = hitAt(ev)
      // Liegt ein Atlas-Areal (Carve-Overlay) unter dem Klick -> dessen Name hat Vorrang.
      if (area) {
        setPickedAtlasArea(area, areaSlug)
        setHoveredAtlasArea(area, areaSlug)
        return
      }
      setPickedAtlasArea(null, null)
      if (taro) pick(taro)
      else select(null) // Klick in den leeren Raum hebt die Auswahl auf
    }
    const onPointerMove = (ev: PointerEvent) => {
      const { taro: name, area, areaSlug } = hitAt(ev)
      if (lastHover.current !== name) {
        lastHover.current = name
        setHovered(name)
      }
      if (lastAtlasHover.current !== areaSlug) {
        lastAtlasHover.current = areaSlug
        setHoveredAtlasArea(area, areaSlug)
      }
    }
    const onPointerLeave = () => {
      lastHover.current = null
      lastAtlasHover.current = null
      setHovered(null)
      setHoveredAtlasArea(null, null)
    }
    const onDoubleClick = (ev: MouseEvent) => {
      const name = hitAt(ev).taro
      if (name) drill(name)
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('dblclick', onDoubleClick)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.removeEventListener('dblclick', onDoubleClick)
    }
  }, [gl, camera, raycaster, pointer, targetCache, cutPlanes, pick, drill, select, setHovered, setPickedAtlasArea, setHoveredAtlasArea])

  return null
}
