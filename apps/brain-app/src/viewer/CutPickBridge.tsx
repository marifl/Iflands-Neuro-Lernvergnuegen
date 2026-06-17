import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes } from './cutCapsMerged'
import { pickCutAwareHit } from './cutPick'
import { ATLAS_SURFACE_FLAG, prettyParcel } from './atlasParcels'
import { nearestCornerVertex } from './atlas/atlasPick'
import { isAtlasHit, pickFirstAtlasHit } from './atlasInteraction'
import { createCutPickTargetCache } from './cutPickTargets'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import {
  isAuthoringTargetRef,
  pickTargetFromLegacyMeshName,
  resolvePickTargetFromObject,
  type ViewerPickTarget,
} from './targetPicking'

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
  const pickTarget = useViewerStore((s) => s.pickTarget)
  const drill = useViewerStore((s) => s.drill)
  const select = useViewerStore((s) => s.select)
  const setHovered = useViewerStore((s) => s.setHovered)
  const setPickedAtlasArea = useViewerStore((s) => s.setPickedAtlasArea)
  const setHoveredAtlasArea = useViewerStore((s) => s.setHoveredAtlasArea)
  const hidden = useViewerStore((s) => s.hidden)
  const appMode = useViewerStore((s) => s.appMode)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const showSkull = useViewerStore((s) => s.showSkull)
  const rodVisible = useViewerStore((s) => s.rodVisible)
  const showAtlasJulich = useViewerStore((s) => s.showAtlasJulich)
  const showAtlasDkt = useViewerStore((s) => s.showAtlasDkt)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)
  const clipAtlasOverlay = useViewerStore((s) => s.clipAtlasOverlay)
  const cutSourceRevision = useViewerStore((s) => s.cutSourceRevision)
  const authoring = useAuthoringSnapshotStore((s) => s.authoring)

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
    appMode,
    hidden,
    isolatedSlugs,
    cuts,
    cutMode,
    showSkull,
    rodVisible,
    showAtlasJulich,
    showAtlasDkt,
    showCarveJulich,
    showCarveDkt,
    showCarveBrodmann,
    clipAtlasOverlay,
    cutSourceRevision,
    authoring,
  ])

  useEffect(() => {
    const el = gl.domElement
    if (import.meta.env.DEV) {
      ;(window as unknown as { __THREE_CAMERA__?: unknown }).__THREE_CAMERA__ = camera
    }
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
    const targetForHit = (hit: THREE.Intersection | null): ViewerPickTarget | null => {
      if (!hit) return null
      const mesh = hit.object as THREE.Mesh
      return resolvePickTargetFromObject(mesh) ?? pickTargetFromLegacyMeshName(mesh.name)
    }

    const updateAuthoringTarget = (target: ViewerPickTarget | null) => {
      if (!target || !isAuthoringTargetRef(target.targetRef)) return
      const snapshotStore = useAuthoringSnapshotStore.getState()
      const current = snapshotStore.authoring
      if (!current) return
      snapshotStore.setAuthoringSnapshotState({
        ...current,
        activeTargetRef: target.targetRef,
      })
    }

    const debugPickTarget = (target: ViewerPickTarget | null) => {
      if (!import.meta.env.DEV) return
      ;(window as unknown as { __BRAIN_LAST_PICK_TARGET__?: unknown }).__BRAIN_LAST_PICK_TARGET__ = target?.targetRef ?? null
    }

    const hitAt = (ev: MouseEvent): { target: ViewerPickTarget | null; area: string | null; areaSlug: string | null } => {
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
      if (!area && taroHit && isAtlasHit(taroHit)) {
        const obj = taroHit.object as THREE.Mesh
        if (obj.userData[ATLAS_SURFACE_FLAG]) {
          const sa = surfaceArea(taroHit)
          if (sa) { area = sa.name; areaSlug = sa.slug }
        } else {
          area = prettyParcel(obj.name); areaSlug = obj.name
        }
      }
      return { target: targetForHit(taroHit), area, areaSlug }
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
      const pickStartedAt = performance.now()
      const recordPick = (hit: boolean) => {
        const globals = window as unknown as {
          __brainPerformanceGateRecordPick?: (latencyMs: number, hit: boolean) => void
        }
        globals.__brainPerformanceGateRecordPick?.(performance.now() - pickStartedAt, hit)
      }
      const { target, area, areaSlug } = hitAt(ev)
      // Liegt ein Atlas-Areal (Carve-Overlay) unter dem Klick -> dessen Name hat Vorrang.
      if (area) {
        setPickedAtlasArea(area, areaSlug)
        setHoveredAtlasArea(area, areaSlug)
        debugPickTarget(null)
        recordPick(true)
        return
      }
      setPickedAtlasArea(null, null)
      const additive = ev.shiftKey || ev.metaKey || ev.ctrlKey
      if (target) {
        pickTarget(target, { additive })
        updateAuthoringTarget(target)
        debugPickTarget(target)
        recordPick(true)
      } else if (!additive) {
        select(null) // Klick in den leeren Raum hebt die Auswahl auf
        debugPickTarget(null)
        recordPick(false)
      }
    }
    const onPointerMove = (ev: PointerEvent) => {
      const { target, area, areaSlug } = hitAt(ev)
      const name = target?.selectionId ?? null
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
      const target = hitAt(ev).target
      if (target?.targetRef.targetKind === 'ontology-node') drill(target.selectionId)
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
  }, [gl, camera, raycaster, pointer, targetCache, cutPlanes, pickTarget, drill, select, setHovered, setPickedAtlasArea, setHoveredAtlasArea])

  return null
}
