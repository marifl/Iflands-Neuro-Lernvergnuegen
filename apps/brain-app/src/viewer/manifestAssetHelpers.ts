import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { applyManifestRootTransform, loadPhineasAssetManifest, type AssetManifestDocument, type AssetManifestEntry } from './assetManifest'

export const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
export const NO_RAYCAST = () => {}

export function cloneMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  return Array.isArray(material) ? material.map((entry) => entry.clone()) : material.clone()
}

export function forEachMaterial(material: THREE.Material | THREE.Material[], apply: (entry: THREE.Material) => void): void {
  if (Array.isArray(material)) material.forEach(apply)
  else apply(material)
}

export function cloneSceneWithOwnMaterials(scene: THREE.Group): THREE.Group {
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

export function cloneSceneForAsset(scene: THREE.Group, asset: AssetManifestEntry): THREE.Group {
  const clone = cloneSceneWithOwnMaterials(scene)
  applyManifestRootTransform(clone, asset)
  return clone
}

export function vec3Tuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z]
}

export function useAssetManifest(): AssetManifestDocument | null {
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
