import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConfigCamera } from '../viewer/atlas/atlasConfig'
import { useEffectiveConfig } from '../viewer/atlas/atlasConfig'
import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { loadCoords, unionBounds, type StructureCoords } from './structureCoords'
import { globalCameraBoundsForConfig, resolveCameraTarget, resolveGlobalCameraViewTarget, type ResolvedCameraTarget } from './cameraResolve'
import { EMPTY_TARGET_MESHES, selectCameraRigConfig, type CameraConfigSource } from './cameraRigConfig'

const CAMERA_LERP_PER_FRAME_AT_60HZ = 0.12

function perspectiveCamera(camera: THREE.Camera): THREE.PerspectiveCamera {
  const cam = camera as THREE.PerspectiveCamera
  if (!cam.isPerspectiveCamera) throw new Error('CameraRig: PerspectiveCamera erwartet')
  return cam
}

function frameLerpAlpha(delta: number): number {
  return 1 - Math.pow(1 - CAMERA_LERP_PER_FRAME_AT_60HZ, delta * 60)
}

function exposeCameraRigDebug(debug: {
  source: CameraConfigSource
  activeConfiguration: string | null
  config: ConfigCamera
  fallbackShot: string | null
  highlight: string[]
  targetMeshes: string[]
  figureTargetMeshes: string[]
  bounds: { center: [number, number, number]; radius: number }
  targetBounds: { center: [number, number, number]; radius: number } | null
  resolved: ResolvedCameraTarget
}) {
  if (!import.meta.env.DEV) return
  ;(window as unknown as { __CAMERA_RIG__: unknown }).__CAMERA_RIG__ = debug
}

/** Framt die Kamera auf die Union-Bounds der aktuell hervorgehobenen Meshes (aus structure-coords.json),
 *  aus der Richtung des aktiven Shots. Animiert per Lerp; nutzt die makeDefault-OrbitControls. */
export default function CameraRig() {
  const { camera, controls } = useThree()
  const highlight = useViewerStore((s) => s.highlight)
  const cameraView = useViewerStore((s) => s.cameraView)
  const cameraPose = useViewerStore((s) => s.cameraPose)
  const setCameraPose = useViewerStore((s) => s.setCameraPose)
  const shot = useSceneStore((s) => s.cameraShot)
  const sceneCameraConfig = useSceneStore((s) => s.cameraConfig)
  const sceneTargetMeshes = useSceneStore((s) => s.scenes[s.index]?.configCameraTargetMeshes ?? EMPTY_TARGET_MESHES)
  const effectiveConfig = useEffectiveConfig()
  const [coords, setCoords] = useState<StructureCoords | null>(null)
  const target = useRef(new THREE.Vector3())
  const camGoal = useRef(new THREE.Vector3())
  const want = useRef(false)
  const cameraConfigRef = useRef<ConfigCamera | null>(null)
  const legacyCameraConfig = useMemo<ConfigCamera | null>(() => (shot ? { shot } : null), [shot])
  const {
    activeConfiguration,
    figureTargetMeshes,
    cameraConfig,
    cameraConfigSource,
    targetMeshes,
  } = selectCameraRigConfig({
    effectiveConfig,
    sceneCameraConfig,
    sceneTargetMeshes,
    legacyCameraConfig,
  })

  useEffect(() => {
    loadCoords().then(setCoords)
  }, [])

  // DEV-only: aktive Kamera exponieren (Smoke-Verifikation des Fit-to-Highlight-Framings).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const globals = window as unknown as { __CAMERA__: unknown; __CAMERA_CONTROLS__: unknown }
    globals.__CAMERA__ = camera
    globals.__CAMERA_CONTROLS__ = controls
  }, [camera, controls])

  const setGoal = (resolved: ResolvedCameraTarget) => {
    const cam = perspectiveCamera(camera)
    if (cam.fov !== resolved.fov) {
      cam.fov = resolved.fov
      cam.updateProjectionMatrix()
    }
    target.current.set(...resolved.target)
    camGoal.current.set(...resolved.position)
    want.current = true
  }

  const captureCameraPose = useCallback(() => {
    const cam = perspectiveCamera(camera)
    const oc = controls as unknown as { target?: THREE.Vector3 } | null
    const lookTarget = oc?.target ?? target.current
    setCameraPose({
      position: [cam.position.x, cam.position.y, cam.position.z],
      target: [lookTarget.x, lookTarget.y, lookTarget.z],
      fov: cam.fov,
    })
  }, [camera, controls, setCameraPose])

  useEffect(() => {
    cameraConfigRef.current = cameraConfig
  }, [cameraConfig])

  // Bei Highlight-/Shot-Wechsel Ziel deterministisch aus der Tabelle berechnen.
  useEffect(() => {
    if (!cameraConfig) return
    const hasPose = cameraConfig.pose !== undefined
    let bounds = globalCameraBoundsForConfig(cameraConfig)
    let targetBounds = null
    if (!hasPose) {
      if (!coords || highlight.length === 0) return
      bounds = unionBounds(coords, highlight)
      targetBounds = targetMeshes.length > 0 ? unionBounds(coords, targetMeshes) : null
      if (cameraConfig.fit === 'target' && !targetBounds) return
    }
    const resolved = resolveCameraTarget({
      config: cameraConfig,
      bounds,
      targetBounds,
      fallbackShot: shot,
      fallbackFov: perspectiveCamera(camera).fov,
    })
    exposeCameraRigDebug({
      source: cameraConfigSource,
      activeConfiguration,
      config: cameraConfig,
      fallbackShot: shot,
      highlight,
      targetMeshes,
      figureTargetMeshes,
      bounds,
      targetBounds,
      resolved,
    })
    setGoal(resolved)
  }, [coords, cameraConfig, cameraConfigSource, activeConfiguration, shot, highlight, targetMeshes, camera])

  // Globale Ansicht-Box: das Gesamt-Hirn aus einer benannten Richtung framen (one-shot, nonce-getriggert).
  useEffect(() => {
    if (!cameraView) return
    setGoal(resolveGlobalCameraViewTarget({
      config: cameraConfigRef.current,
      shot: cameraView.name,
      fallbackFov: perspectiveCamera(camera).fov,
    }))
  }, [cameraView, camera])

  useEffect(() => {
    if (!cameraPose) return
    const cam = perspectiveCamera(camera)
    cam.position.set(...cameraPose.position)
    cam.fov = cameraPose.fov
    cam.updateProjectionMatrix()
    const oc = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null
    if (oc?.target) oc.target.set(...cameraPose.target)
    oc?.update?.()
    want.current = false
  }, [cameraPose, camera, controls])

  useEffect(() => {
    const evented = controls as unknown as { addEventListener?: (event: string, listener: () => void) => void; removeEventListener?: (event: string, listener: () => void) => void } | null
    evented?.addEventListener?.('end', captureCameraPose)
    return () => evented?.removeEventListener?.('end', captureCameraPose)
  }, [controls, captureCameraPose])

  useFrame((_, delta) => {
    if (!want.current) return
    const alpha = frameLerpAlpha(delta)
    camera.position.lerp(camGoal.current, alpha)
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void } | null
    if (oc?.target) {
      oc.target.lerp(target.current, alpha)
      oc.update()
    }
    if (camera.position.distanceTo(camGoal.current) < 1) {
      want.current = false
      captureCameraPose()
    }
  })
  return null
}
