import type { Intersection, Mesh } from 'three'
import { ATLAS_PARCEL_FLAG, ATLAS_SURFACE_FLAG } from './atlasParcels'
import { isClippedRaycastHit } from './cutPick'

export function isAtlasHit(hit: Intersection): boolean {
  const object = hit.object as Mesh
  return Boolean(object.visible && (object.userData[ATLAS_SURFACE_FLAG] || object.userData[ATLAS_PARCEL_FLAG]))
}

export function pickFirstAtlasHit(hits: Intersection[]): Intersection | null {
  return hits.find((hit) => isAtlasHit(hit) && isClippedRaycastHit(hit)) ?? null
}
