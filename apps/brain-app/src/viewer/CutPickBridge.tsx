import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes, CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { pickCutAwareHit } from './cutPick'

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

  const pointer = useMemo(() => new THREE.Vector2(), [])
  const down = useRef<{ x: number; y: number } | null>(null)
  const lastHover = useRef<string | null>(null)

  // Cap-Picking nur im 'slice'-Modus; im 'hide'-Modus ist nichts geschnitten → reiner Oberflaechen-Pick.
  const cutPlanes = useMemo(() => (cutMode === 'slice' ? activeCutPlanes(cuts) : []), [cuts, cutMode])

  useEffect(() => {
    const el = gl.domElement

    const collectSources = (): THREE.Mesh[] => {
      const out: THREE.Mesh[] = []
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh
        if (!m.isMesh || !m.visible || !m.geometry) return
        if (m.userData[CUT_CAP_HELPER_FLAG]) return
        if (!m.userData[CUT_SOURCE_FLAG]) return
        out.push(m)
      })
      return out
    }

    const nameAt = (ev: MouseEvent): string | null => {
      const rect = el.getBoundingClientRect()
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const hit = pickCutAwareHit(raycaster, hits, cutPlanes, collectSources())
      return hit ? (hit.object as THREE.Mesh).name : null
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
      const name = nameAt(ev)
      if (name) pick(name)
      else select(null) // Klick in den leeren Raum hebt die Auswahl auf
    }
    const onPointerMove = (ev: PointerEvent) => {
      const name = nameAt(ev)
      if (lastHover.current === name) return
      lastHover.current = name
      setHovered(name)
    }
    const onPointerLeave = () => {
      if (lastHover.current === null) return
      lastHover.current = null
      setHovered(null)
    }
    const onDoubleClick = (ev: MouseEvent) => {
      const name = nameAt(ev)
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
  }, [gl, camera, raycaster, scene, pointer, cutPlanes, pick, drill, select, setHovered])

  return null
}
