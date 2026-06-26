import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ATLAS_VIEWER_COLORS } from './atlasColorSystem'
import type { AssetManifestEntry, AssetManifestPart } from './assetManifest'
import { objectGraphIdForTarget, type SequenceTargetRef } from './sequenceTargetRef'
import {
  SEQUENCE_TARGET_REF_USER_DATA,
  TARGET_PICKABLE_USER_DATA,
  pickTargetFromTargetRef,
  sequenceTargetUserData,
  type ViewerPickTarget,
} from './targetPicking'
import { useViewerStore } from './viewerStore'
import ManifestEditableObject from './ManifestEditableObject'
import { DRACO_DECODER_PATH, NO_RAYCAST, cloneSceneForAsset, forEachMaterial, vec3Tuple, useAssetManifest } from './manifestAssetHelpers'

const PHINEAS_GAGE_COLLECTION_ID = 'case-phineas-gage'

type ManifestAssetLayerSnapshot = {
  collectionId: string
  assetId: string
  instanceId: string
  visible: boolean
  meshCount: number
  visibleMeshCount: number
  pickableMeshCount: number
  objectGraphIds: string[]
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

type ManifestAssetObjectsSnapshot = {
  groupName: 'manifest-asset-objects'
  assets: Record<string, ManifestAssetLayerSnapshot>
}

type ManifestAssetObjectsWindow = Window & {
  __manifestAssetObjects?: ManifestAssetObjectsSnapshot
}

useGLTF.setDecoderPath(DRACO_DECODER_PATH)

function targetRefForPart(asset: AssetManifestEntry, part: AssetManifestPart): SequenceTargetRef {
  if (!asset.runtimeInstanceId) {
    throw new Error(`ManifestAssetObjects: runtimeInstanceId fehlt fuer ${asset.assetId}`)
  }
  return {
    targetKind: 'asset-part',
    collectionId: asset.collectionId,
    instanceId: asset.runtimeInstanceId,
    partId: part.partId,
  }
}

function materialColorForPart(asset: AssetManifestEntry, part: AssetManifestPart): THREE.ColorRepresentation {
  if (asset.assetId.includes('iron') || part.partId.includes('rod')) return ATLAS_VIEWER_COLORS.rod
  return ATLAS_VIEWER_COLORS.bone
}

function baseOpacityForAsset(asset: AssetManifestEntry): number {
  return asset.materialPolicy.transparency === 'opaque' ? 1 : 0.72
}

function findPartRoot(root: THREE.Object3D, part: AssetManifestPart): THREE.Object3D {
  return root.getObjectByName(part.nodeName) ?? root
}

function attachTarget(root: THREE.Object3D, partRoot: THREE.Object3D, target: ViewerPickTarget, pickable: boolean): void {
  partRoot.userData = { ...partRoot.userData, ...sequenceTargetUserData(target, pickable) }
  partRoot.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.userData = { ...mesh.userData, ...sequenceTargetUserData(target, pickable) }
  })
  if (partRoot !== root) return
  root.traverse((object) => {
    if (object === root) return
    if (object.userData[SEQUENCE_TARGET_REF_USER_DATA] !== undefined) return
    object.userData = { ...object.userData, ...sequenceTargetUserData(target, false) }
  })
}

function updateMaterial(material: THREE.Material, options: {
  active: boolean
  dimmed: boolean
  hover: boolean
  mirrored: boolean
  opacity: number
  color: THREE.ColorRepresentation
}): void {
  const opacity = options.dimmed ? Math.min(options.opacity, 0.22) : options.opacity
  material.transparent = opacity < 1
  material.opacity = opacity
  material.depthWrite = opacity >= 0.55
  if (options.mirrored) material.side = THREE.DoubleSide
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.color.set(options.color)
    material.emissive.set(options.active ? ATLAS_VIEWER_COLORS.selection : options.hover ? ATLAS_VIEWER_COLORS.hover : ATLAS_VIEWER_COLORS.emissiveOff)
    material.emissiveIntensity = options.active ? 0.55 : options.hover ? 0.25 : 0
    material.roughness = material instanceof THREE.MeshPhysicalMaterial ? Math.max(material.roughness, 0.42) : material.roughness
  }
  material.needsUpdate = true
}

function resetMeshes(root: THREE.Object3D, assetVisible: boolean, mirrored: boolean): void {
  root.visible = assetVisible
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.visible = assetVisible
    mesh.raycast = NO_RAYCAST
    forEachMaterial(mesh.material, (material) => {
      if (mirrored) material.side = THREE.DoubleSide
      material.needsUpdate = true
    })
  })
}

function layerSnapshot(root: THREE.Object3D, asset: AssetManifestEntry, objectGraphIds: string[]): ManifestAssetLayerSnapshot {
  let meshCount = 0
  let visibleMeshCount = 0
  let pickableMeshCount = 0
  root.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    meshCount += 1
    if (mesh.visible) visibleMeshCount += 1
    if (mesh.userData[TARGET_PICKABLE_USER_DATA] === true && mesh.raycast !== NO_RAYCAST) pickableMeshCount += 1
  })
  return {
    collectionId: asset.collectionId,
    assetId: asset.assetId,
    instanceId: asset.runtimeInstanceId ?? '',
    visible: root.visible,
    meshCount,
    visibleMeshCount,
    pickableMeshCount,
    objectGraphIds,
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

function publishDevSnapshot(asset: AssetManifestEntry, snapshot: ManifestAssetLayerSnapshot): void {
  if (!import.meta.env.DEV) return
  const current = (window as ManifestAssetObjectsWindow).__manifestAssetObjects ?? {
    groupName: 'manifest-asset-objects',
    assets: {},
  }
  current.assets[asset.assetId] = snapshot
  ;(window as ManifestAssetObjectsWindow).__manifestAssetObjects = current
}

function removeDevSnapshot(assetId: string): void {
  if (!import.meta.env.DEV) return
  const win = window as ManifestAssetObjectsWindow
  if (!win.__manifestAssetObjects) return
  delete win.__manifestAssetObjects.assets[assetId]
  if (Object.keys(win.__manifestAssetObjects.assets).length === 0) delete win.__manifestAssetObjects
}

function ManifestAssetInstance({ asset, dimOpacity }: { asset: AssetManifestEntry; dimOpacity: number }) {
  const { scene } = useGLTF(asset.uri)
  const hidden = useViewerStore((s) => s.hidden)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const root = useMemo(() => cloneSceneForAsset(scene, asset), [scene, asset])
  const targets = useMemo(() => asset.parts.map((part) => {
    const targetRef = targetRefForPart(asset, part)
    return {
      part,
      objectGraphId: objectGraphIdForTarget(targetRef),
      pickTarget: pickTargetFromTargetRef(targetRef, part.label),
    }
  }), [asset])
  const objectGraphIds = useMemo(() => targets.map((target) => target.objectGraphId), [targets])

  useEffect(() => {
    for (const target of targets) {
      attachTarget(root, findPartRoot(root, target.part), target.pickTarget, target.part.pickable && target.part.role !== 'helper')
    }
  }, [root, targets])

  useEffect(() => {
    const visibleTargets = targets.filter((target) => !hidden.has(target.objectGraphId))
    const assetVisible = visibleTargets.length > 0
    const mirrored = root.scale.x * root.scale.y * root.scale.z < 0
    resetMeshes(root, assetVisible, mirrored)

    for (const target of targets) {
      const visible = !hidden.has(target.objectGraphId)
      const dimmed = isolatedSlugs.size > 0 && !isolatedSlugs.has(target.objectGraphId)
      const active = selectedSlugs.has(target.objectGraphId)
      const hover = hovered === target.objectGraphId
      const pickable = target.part.pickable && target.part.role !== 'helper' && visible && !dimmed
      const opacity = dimmed ? dimOpacity : baseOpacityForAsset(asset)
      findPartRoot(root, target.part).traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.visible = visible
        mesh.raycast = pickable ? THREE.Mesh.prototype.raycast : NO_RAYCAST
        forEachMaterial(mesh.material, (material) => updateMaterial(material, {
          active,
          dimmed,
          hover,
          mirrored,
          opacity,
          color: materialColorForPart(asset, target.part),
        }))
      })
    }

    publishDevSnapshot(asset, layerSnapshot(root, asset, objectGraphIds))
  }, [asset, dimOpacity, hidden, hovered, isolatedSlugs, objectGraphIds, root, selectedSlugs, targets])

  useEffect(() => () => removeDevSnapshot(asset.assetId), [asset.assetId])

  return <ManifestEditableObject object={root} asset={asset} />
}

export default function ManifestAssetObjects({ dimOpacity }: { dimOpacity: number }) {
  const appMode = useViewerStore((s) => s.appMode)
  const manifest = useAssetManifest()
  const assets = useMemo(() => (
    manifest?.assets.filter((asset) => asset.collectionId === PHINEAS_GAGE_COLLECTION_ID && asset.runtimeInstanceId) ?? []
  ), [manifest])

  if (appMode !== 'explore' || assets.length === 0) return null
  return (
    <group name="manifest-asset-objects">
      {assets.map((asset) => (
        <ManifestAssetInstance key={`${asset.collectionId}:${asset.runtimeInstanceId}`} asset={asset} dimOpacity={dimOpacity} />
      ))}
    </group>
  )
}
