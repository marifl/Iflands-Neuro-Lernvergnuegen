import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ATLAS_VIEWER_COLORS } from './atlasColorSystem'
import { PHINEAS_GAGE_ASSETS, PHINEAS_GAGE_TARGETS } from './phineasGage'
import { pickTargetFromTargetRef, sequenceTargetUserData, type ViewerPickTarget } from './targetPicking'
import { useViewerStore } from './viewerStore'

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const NO_RAYCAST = () => {}

useGLTF.setDecoderPath(DRACO_DECODER_PATH)
useGLTF.preload(PHINEAS_GAGE_ASSETS.skull)
useGLTF.preload(PHINEAS_GAGE_ASSETS.calvariumCut)
useGLTF.preload(PHINEAS_GAGE_ASSETS.ironRod)

function cloneMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  return Array.isArray(material) ? material.map((entry) => entry.clone()) : material.clone()
}

function forEachMaterial(material: THREE.Material | THREE.Material[], apply: (entry: THREE.Material) => void): void {
  if (Array.isArray(material)) material.forEach(apply)
  else apply(material)
}

function cloneSceneWithOwnMaterials(scene: THREE.Group): THREE.Group {
  const clone = scene.clone(true)
  clone.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.material = cloneMaterial(mesh.material)
    mesh.raycast = NO_RAYCAST
    mesh.renderOrder = 7
  })
  return clone
}

function attachTarget(root: THREE.Object3D, target: ViewerPickTarget): void {
  root.userData = { ...root.userData, ...sequenceTargetUserData(target, true) }
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.userData = { ...mesh.userData, ...sequenceTargetUserData(target, true) }
  })
}

function updateLayer(root: THREE.Object3D, options: {
  visible: boolean
  opacity: number
  pickable: boolean
  color?: THREE.ColorRepresentation
  metalness?: number
  roughness?: number
}): void {
  root.visible = options.visible
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.visible = options.visible
    mesh.raycast = options.visible && options.pickable ? THREE.Mesh.prototype.raycast : NO_RAYCAST
    forEachMaterial(mesh.material, (material) => {
      material.transparent = options.opacity < 1
      material.opacity = options.opacity
      material.depthWrite = options.opacity >= 0.6
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
        if (options.color) material.color.set(options.color)
        if (options.metalness !== undefined) material.metalness = options.metalness
        if (options.roughness !== undefined) material.roughness = options.roughness
      }
      material.needsUpdate = true
    })
  })
}

function PhineasGageAssetScenes({
  showSkull,
  skullOpacity,
  rodVisible,
}: {
  showSkull: boolean
  skullOpacity: number
  rodVisible: boolean
}) {
  const { scene: skullScene } = useGLTF(PHINEAS_GAGE_ASSETS.skull)
  const { scene: calvariumScene } = useGLTF(PHINEAS_GAGE_ASSETS.calvariumCut)
  const { scene: rodScene } = useGLTF(PHINEAS_GAGE_ASSETS.ironRod)
  const skull = useMemo(() => cloneSceneWithOwnMaterials(skullScene), [skullScene])
  const calvarium = useMemo(() => cloneSceneWithOwnMaterials(calvariumScene), [calvariumScene])
  const rod = useMemo(() => cloneSceneWithOwnMaterials(rodScene), [rodScene])
  const targets = useMemo(() => ({
    skull: pickTargetFromTargetRef(PHINEAS_GAGE_TARGETS.skull, 'Gage skull'),
    calvariumCut: pickTargetFromTargetRef(PHINEAS_GAGE_TARGETS.calvariumCut, 'Gage calvarium cut'),
    ironRod: pickTargetFromTargetRef(PHINEAS_GAGE_TARGETS.ironRod, 'Gage iron rod'),
  }), [])

  useEffect(() => {
    attachTarget(skull, targets.skull)
    attachTarget(calvarium, targets.calvariumCut)
    attachTarget(rod, targets.ironRod)
  }, [skull, calvarium, rod, targets])

  useEffect(() => {
    const showFullSkull = showSkull && !rodVisible
    const showCalvariumCut = showSkull && rodVisible
    updateLayer(skull, {
      visible: showFullSkull,
      opacity: Math.max(0.18, Math.min(1, skullOpacity)),
      pickable: true,
      color: ATLAS_VIEWER_COLORS.bone,
      roughness: 0.72,
      metalness: 0,
    })
    updateLayer(calvarium, {
      visible: showCalvariumCut,
      opacity: Math.max(0.24, Math.min(0.82, skullOpacity + 0.18)),
      pickable: true,
      color: ATLAS_VIEWER_COLORS.bone,
      roughness: 0.72,
      metalness: 0,
    })
    updateLayer(rod, {
      visible: rodVisible,
      opacity: 1,
      pickable: true,
      color: ATLAS_VIEWER_COLORS.rod,
      roughness: 0.42,
      metalness: 0.72,
    })
  }, [skull, calvarium, rod, showSkull, skullOpacity, rodVisible])

  return (
    <group name="phineas-gage-assets">
      <primitive object={skull} />
      <primitive object={calvarium} />
      <primitive object={rod} />
    </group>
  )
}

export default function PhineasGageAssets() {
  const appMode = useViewerStore((state) => state.appMode)
  const showSkull = useViewerStore((state) => state.showSkull)
  const skullOpacity = useViewerStore((state) => state.skullOpacity)
  const rodVisible = useViewerStore((state) => state.rodVisible)

  if (appMode !== 'phineas') return null
  return <PhineasGageAssetScenes showSkull={showSkull} skullOpacity={skullOpacity} rodVisible={rodVisible} />
}
