import * as THREE from 'three'
import {
  parseAssetManifestDocument,
  type AssetManifestDocument,
  type AssetManifestEntry,
} from './assetManifest'
import type { AuthoringTransform, Vec3 } from './authoringScene'

const PHINEAS_ASSET_MANIFEST_URI = '/assets/phineas/asset-manifest.json'

let manifestPromise: Promise<AssetManifestDocument> | null = null

function scaledVec3(values: Vec3, factor: number): Vec3 {
  return [values[0] * factor, values[1] * factor, values[2] * factor]
}

export function manifestRuntimeTransform(asset: AssetManifestEntry): AuthoringTransform {
  const { rootTransform, scale } = asset.normalization
  return {
    position: [...rootTransform.position],
    rotation: [...rootTransform.rotation],
    scale: scaledVec3(rootTransform.scale, scale),
  }
}

export function assetManifestEntryByUri(manifest: AssetManifestDocument, uri: string): AssetManifestEntry {
  const asset = manifest.assets.find((candidate) => candidate.uri === uri)
  if (!asset) throw new Error(`PhineasAssetManifest: Asset-URI fehlt im Manifest: ${uri}`)
  return asset
}

export function applyManifestRootTransform(root: THREE.Object3D, asset: AssetManifestEntry): void {
  const transform = manifestRuntimeTransform(asset)
  root.position.set(...transform.position)
  root.rotation.set(...transform.rotation)
  root.scale.set(...transform.scale)
  root.updateMatrix()
  root.updateMatrixWorld(true)
}

export function loadPhineasAssetManifest(): Promise<AssetManifestDocument> {
  if (manifestPromise) return manifestPromise
  manifestPromise = fetch(PHINEAS_ASSET_MANIFEST_URI)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`PhineasAssetManifest: Manifest konnte nicht geladen werden (${response.status})`)
      }
      return response.json()
    })
    .then((document) => parseAssetManifestDocument(document))
  return manifestPromise
}
