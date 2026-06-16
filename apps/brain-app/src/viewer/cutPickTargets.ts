import type { Mesh, Object3D } from 'three'
import { ATLAS_PARCEL_FLAG, ATLAS_SURFACE_FLAG } from './atlasParcels'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'

export interface CutPickTargets {
  raycastTargets: Mesh[]
  cutSources: Mesh[]
}

export interface CutPickTargetCache {
  get: () => CutPickTargets
  markDirty: () => void
}

export function collectCutPickTargets(root: Object3D): CutPickTargets {
  const raycastTargets: Mesh[] = []
  const cutSources: Mesh[] = []
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return
    if (mesh.userData[CUT_CAP_HELPER_FLAG]) return
    const isCutSource = mesh.userData[CUT_SOURCE_FLAG] === true
    const isAtlasTarget = mesh.userData[ATLAS_SURFACE_FLAG] === true || mesh.userData[ATLAS_PARCEL_FLAG] === true
    if (isCutSource) cutSources.push(mesh)
    if (isCutSource || isAtlasTarget) raycastTargets.push(mesh)
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
