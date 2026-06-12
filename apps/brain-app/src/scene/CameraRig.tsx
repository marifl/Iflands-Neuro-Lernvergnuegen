import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { directionVec } from './cameraPresets'
import { loadCoords, unionBounds, type StructureCoords } from './structureCoords'

/** Framt die Kamera auf die Union-Bounds der aktuell hervorgehobenen Meshes (aus structure-coords.json),
 *  aus der Richtung des aktiven Shots. Animiert per Lerp; nutzt die makeDefault-OrbitControls. */
export default function CameraRig() {
  const { camera, controls } = useThree()
  const highlight = useViewerStore((s) => s.highlight)
  const shot = useSceneStore((s) => s.cameraShot)
  const [coords, setCoords] = useState<StructureCoords | null>(null)
  const target = useRef(new THREE.Vector3())
  const camGoal = useRef(new THREE.Vector3())
  const want = useRef(false)

  useEffect(() => {
    loadCoords().then(setCoords)
  }, [])

  // DEV-only: aktive Kamera exponieren (Smoke-Verifikation des Fit-to-Highlight-Framings).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __CAMERA__: unknown }).__CAMERA__ = camera
  }, [camera])

  // Bei Highlight-/Shot-Wechsel Ziel deterministisch aus der Tabelle berechnen.
  useEffect(() => {
    if (!coords || !shot || highlight.length === 0) return
    const { center, radius } = unionBounds(coords, highlight)
    const fov = (camera as THREE.PerspectiveCamera).fov
    const dist = (radius / Math.sin((fov * Math.PI) / 360)) * 1.4
    target.current.set(...center)
    camGoal.current.set(...center).addScaledVector(directionVec(shot), dist)
    want.current = true
  }, [coords, shot, highlight, camera])

  useFrame(() => {
    if (!want.current) return
    camera.position.lerp(camGoal.current, 0.12)
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void } | null
    if (oc?.target) {
      oc.target.lerp(target.current, 0.12)
      oc.update()
    }
    if (camera.position.distanceTo(camGoal.current) < 1) want.current = false
  })
  return null
}
