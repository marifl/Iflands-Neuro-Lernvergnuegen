import type { Mesh, Object3D } from 'three'
import { ATLAS_PARCEL_FLAG, ATLAS_SURFACE_FLAG } from './atlasParcels'
import { ATLAS_CAP_PROXY_OWNER_FLAG, ATLAS_CAP_SOURCE_FLAG } from './atlasCapProxies'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { isSequenceTargetPickableMesh } from './targetPicking'

export interface CutPickTargets {
  raycastTargets: Mesh[]
  cutSources: Mesh[]
}

export interface CutPickTargetCache {
  get: () => CutPickTargets
  markDirty: () => void
}

function hasActiveClippingPlanes(mesh: Mesh): boolean {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.some((material) => {
    const planes = (material as { clippingPlanes?: unknown }).clippingPlanes
    return Array.isArray(planes) && planes.length > 0
  })
}

function isAtlasTarget(mesh: Mesh): boolean {
  return mesh.userData[ATLAS_SURFACE_FLAG] === true || mesh.userData[ATLAS_PARCEL_FLAG] === true
}

export function isCutCapSource(mesh: Mesh): boolean {
  if (mesh.userData[ATLAS_CAP_SOURCE_FLAG] === true) return hasActiveClippingPlanes(mesh)
  if (mesh.userData[ATLAS_CAP_PROXY_OWNER_FLAG] === true) return false
  if (mesh.userData[CUT_SOURCE_FLAG] === true) return true
  return isAtlasTarget(mesh) && hasActiveClippingPlanes(mesh)
}

function isCutPickSource(mesh: Mesh): boolean {
  if (mesh.userData[ATLAS_CAP_SOURCE_FLAG] === true) return false
  if (mesh.userData[CUT_SOURCE_FLAG] === true) return true
  if (isSequenceTargetPickableMesh(mesh)) return true
  return isAtlasTarget(mesh) && hasActiveClippingPlanes(mesh)
}

function collectCutPickTargets(root: Object3D): CutPickTargets {
  const raycastTargets: Mesh[] = []
  const cutSources: Mesh[] = []
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return
    if (mesh.userData[CUT_CAP_HELPER_FLAG]) return
    const isCutSource = mesh.userData[CUT_SOURCE_FLAG] === true || isSequenceTargetPickableMesh(mesh)
    const atlasTarget = isAtlasTarget(mesh)
    if (isCutPickSource(mesh)) cutSources.push(mesh)
    if (mesh.userData[ATLAS_CAP_SOURCE_FLAG] !== true && (isCutSource || atlasTarget)) raycastTargets.push(mesh)
  })
  return { raycastTargets, cutSources }
}

export function createCutPickTargetCache(root: Object3D): CutPickTargetCache {
  let dirty = true
  let childCount = -1
  let cached: CutPickTargets | null = null
  return {
    markDirty: () => {
      dirty = true
    },
    get: () => {
      if (dirty || childCount !== root.children.length || !cached) {
        cached = collectCutPickTargets(root)
        childCount = root.children.length
        dirty = false
      }
      return cached
    },
  }
}
