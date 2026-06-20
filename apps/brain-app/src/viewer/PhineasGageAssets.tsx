import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { ATLAS_VIEWER_COLORS } from './atlasColorSystem'
import type { AssetManifestDocument, AssetManifestEntry } from './assetManifest'
import {
  applyManifestRootTransform,
  assetManifestEntryByUri,
  loadPhineasAssetManifest,
} from './phineasAssetManifest'
import { PHINEAS_GAGE_ASSETS, PHINEAS_GAGE_TARGETS, useCaseStudyViewStore } from './phineasGage'
import {
  SEQUENCE_TARGET_REF_USER_DATA,
  TARGET_PICKABLE_USER_DATA,
  pickTargetFromTargetRef,
  sequenceTargetUserData,
  type ViewerPickTarget,
} from './targetPicking'
import ManifestEditableObject from './ManifestEditableObject'

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const NO_RAYCAST = () => {}

type PhineasLayerSnapshot = {
  asset: string
  visible: boolean
  meshCount: number
  visibleMeshCount: number
  pickableMeshCount: number
  meshNames: string[]
  targetInstanceIds: string[]
  transform: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
    size: [number, number, number]
    center: [number, number, number]
  }
}

type PhineasGageAssetsSnapshot = {
  groupName: 'phineas-gage-assets'
  showSkull: boolean
  skullOpacity: number
  rodVisible: boolean
  layers: {
    skullBase: PhineasLayerSnapshot
    skullCalvaria: PhineasLayerSnapshot
    ironRod: PhineasLayerSnapshot
  }
}

type PhineasGageAssetsWindow = Window & {
  __phineasGageAssets?: PhineasGageAssetsSnapshot
}

useGLTF.setDecoderPath(DRACO_DECODER_PATH)
useGLTF.preload(PHINEAS_GAGE_ASSETS.skullBase)
useGLTF.preload(PHINEAS_GAGE_ASSETS.skullCalvaria)
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

function cloneSceneForAsset(scene: THREE.Group, asset: AssetManifestEntry): THREE.Group {
  const clone = cloneSceneWithOwnMaterials(scene)
  applyManifestRootTransform(clone, asset)
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

function vec3Tuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z]
}

function layerSnapshot(root: THREE.Object3D, asset: string): PhineasLayerSnapshot {
  const meshNames: string[] = []
  const targetInstanceIds = new Set<string>()
  let meshCount = 0
  let visibleMeshCount = 0
  let pickableMeshCount = 0

  root.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())

  root.traverse((object) => {
    const targetRef = object.userData[SEQUENCE_TARGET_REF_USER_DATA]
    const instanceId = typeof targetRef === 'object' && targetRef !== null && 'instanceId' in targetRef
      ? targetRef.instanceId
      : undefined
    if (typeof instanceId === 'string') targetInstanceIds.add(instanceId)

    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    meshCount += 1
    if (mesh.visible) visibleMeshCount += 1
    if (mesh.userData[TARGET_PICKABLE_USER_DATA] === true && mesh.raycast !== NO_RAYCAST) pickableMeshCount += 1
    if (mesh.name) meshNames.push(mesh.name)
  })

  return {
    asset,
    visible: root.visible,
    meshCount,
    visibleMeshCount,
    pickableMeshCount,
    meshNames,
    targetInstanceIds: [...targetInstanceIds].sort(),
    transform: {
      position: vec3Tuple(root.position),
      rotation: [root.rotation.x, root.rotation.y, root.rotation.z],
      scale: vec3Tuple(root.scale),
    },
    bounds: {
      min: vec3Tuple(bounds.min),
      max: vec3Tuple(bounds.max),
      size: vec3Tuple(size),
      center: vec3Tuple(center),
    },
  }
}

function usePhineasAssetManifest(): AssetManifestDocument | null {
  const [state, setState] = useState<{ manifest: AssetManifestDocument | null; error: Error | null }>({
    manifest: null,
    error: null,
  })

  useEffect(() => {
    let active = true
    loadPhineasAssetManifest()
      .then((manifest) => {
        if (active) setState({ manifest, error: null })
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error))
        if (active) setState({ manifest: null, error: err })
      })
    return () => {
      active = false
    }
  }, [])

  if (state.error) throw state.error
  return state.manifest
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
  const manifest = usePhineasAssetManifest()
  const { scene: skullBaseScene } = useGLTF(PHINEAS_GAGE_ASSETS.skullBase)
  const { scene: skullCalvariaScene } = useGLTF(PHINEAS_GAGE_ASSETS.skullCalvaria)
  const { scene: rodScene } = useGLTF(PHINEAS_GAGE_ASSETS.ironRod)
  const assets = useMemo(() => {
    if (!manifest) return null
    return {
      skullBase: assetManifestEntryByUri(manifest, PHINEAS_GAGE_ASSETS.skullBase),
      skullCalvaria: assetManifestEntryByUri(manifest, PHINEAS_GAGE_ASSETS.skullCalvaria),
      ironRod: assetManifestEntryByUri(manifest, PHINEAS_GAGE_ASSETS.ironRod),
    }
  }, [manifest])
  const skullBase = useMemo(
    () => (assets ? cloneSceneForAsset(skullBaseScene, assets.skullBase) : null),
    [skullBaseScene, assets],
  )
  const skullCalvaria = useMemo(
    () => (assets ? cloneSceneForAsset(skullCalvariaScene, assets.skullCalvaria) : null),
    [skullCalvariaScene, assets],
  )
  const rod = useMemo(() => (assets ? cloneSceneForAsset(rodScene, assets.ironRod) : null), [rodScene, assets])
  const targets = useMemo(() => ({
    skullBase: pickTargetFromTargetRef(PHINEAS_GAGE_TARGETS.skullBase, 'Gage skull base'),
    skullCalvaria: pickTargetFromTargetRef(PHINEAS_GAGE_TARGETS.skullCalvaria, 'Gage skull calvaria'),
    ironRod: pickTargetFromTargetRef(PHINEAS_GAGE_TARGETS.ironRod, 'Gage iron rod'),
  }), [])

  useEffect(() => {
    if (!skullBase || !skullCalvaria || !rod) return
    attachTarget(skullBase, targets.skullBase)
    attachTarget(skullCalvaria, targets.skullCalvaria)
    attachTarget(rod, targets.ironRod)
  }, [skullBase, skullCalvaria, rod, targets])

  useEffect(() => {
    if (!skullBase || !skullCalvaria || !rod) return
    updateLayer(skullBase, {
      visible: showSkull,
      opacity: Math.max(0.28, Math.min(1, skullOpacity)),
      pickable: true,
      color: ATLAS_VIEWER_COLORS.bone,
      roughness: 0.72,
      metalness: 0,
    })
    updateLayer(skullCalvaria, {
      visible: showSkull,
      opacity: rodVisible ? 0.34 : Math.max(0.18, Math.min(0.92, skullOpacity)),
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

    if (import.meta.env.DEV) {
      ;(window as PhineasGageAssetsWindow).__phineasGageAssets = {
        groupName: 'phineas-gage-assets',
        showSkull,
        skullOpacity,
        rodVisible,
        layers: {
          skullBase: layerSnapshot(skullBase, PHINEAS_GAGE_ASSETS.skullBase),
          skullCalvaria: layerSnapshot(skullCalvaria, PHINEAS_GAGE_ASSETS.skullCalvaria),
          ironRod: layerSnapshot(rod, PHINEAS_GAGE_ASSETS.ironRod),
        },
      }
    }
  }, [skullBase, skullCalvaria, rod, showSkull, skullOpacity, rodVisible])

  useEffect(() => () => {
    if (import.meta.env.DEV) delete (window as PhineasGageAssetsWindow).__phineasGageAssets
  }, [])

  if (!assets || !skullBase || !skullCalvaria || !rod) return null

  return (
    <group name="phineas-gage-assets">
      <ManifestEditableObject object={skullBase} asset={assets.skullBase} />
      <ManifestEditableObject object={skullCalvaria} asset={assets.skullCalvaria} />
      <ManifestEditableObject object={rod} asset={assets.ironRod} />
    </group>
  )
}

export default function PhineasGageAssets() {
  const showSkull = useCaseStudyViewStore((s) => s.showSkull)
  const skullOpacity = useCaseStudyViewStore((s) => s.skullOpacity)
  const rodVisible = useCaseStudyViewStore((s) => s.rodVisible)

  if (!showSkull && !rodVisible) return null
  return <PhineasGageAssetScenes showSkull={showSkull} skullOpacity={skullOpacity} rodVisible={rodVisible} />
}
