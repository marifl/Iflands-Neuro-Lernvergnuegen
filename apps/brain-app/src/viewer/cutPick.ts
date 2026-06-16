// Cut-aware Picking — Port aus dem Monorepo (lib/clippedRaycastPick + compositionCutPick),
// entkoppelt von der composition-Pickability. Die Pickbarkeit (hidden/isoliert) ist bereits
// ueber mesh.raycast=noop abgebildet: der Raycaster und die direkte mesh.raycast-Probe
// ueberspringen solche Meshes automatisch. Pickbare Strukturen tragen das CUT_SOURCE_FLAG.
import { Box3, Raycaster, Vector3 } from 'three'
import type { Intersection, Mesh, Plane, Ray } from 'three'
import { ATLAS_PARCEL_FLAG, ATLAS_SURFACE_FLAG } from './atlasParcels'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { isSequenceTargetPickableMesh } from './targetPicking'

const PLANE_TOL_MM = 2
const PROBE_MM = 0.4

const _point = new Vector3()
const _origin = new Vector3()
const _dir = new Vector3()
const _box = new Box3()
const _probe = new Raycaster()

/** Treffer auf der weggeschnittenen Seite (oder auf Cap-Helfern / unsichtbar) verwerfen. */
export function isClippedRaycastHit(hit: Intersection): boolean {
  const obj = hit.object as Mesh
  if (!obj.isMesh || !obj.visible) return false
  if (obj.userData[CUT_CAP_HELPER_FLAG]) return false

  const mat = obj.material as { clippingPlanes?: readonly Plane[] | null } | undefined
  const planes = mat?.clippingPlanes
  if (planes && planes.length > 0) {
    for (const plane of planes) {
      if (plane.distanceToPoint(hit.point) < 0) return false
    }
  }
  return true
}

/** Nur benannte Cut-Source-Strukturen sind pickbar (wie das bisherige onClick auf Brain/Skull/Head). */
function isPickableSource(obj: Mesh): boolean {
  return obj.userData[CUT_SOURCE_FLAG] === true || isSequenceTargetPickableMesh(obj)
}

function isPickableCutCapSource(obj: Mesh): boolean {
  return (
    isPickableSource(obj) ||
    obj.userData[ATLAS_SURFACE_FLAG] === true ||
    obj.userData[ATLAS_PARCEL_FLAG] === true
  )
}

/** Erster gueltiger Oberflaechen-Treffer (geclippte Seite + nicht-pickbare uebersprungen). */
export function pickFirstSurfaceHit(intersections: Intersection[]): Intersection | null {
  for (const hit of intersections) {
    if (isClippedRaycastHit(hit) && isPickableSource(hit.object as Mesh)) return hit
  }
  return null
}

/** Schnittpunkt des Strahls mit der (ersten) aktiven Cut-Ebene, sofern auf allen Ebenen gueltig. */
function intersectRayWithCutPlanes(
  ray: Ray,
  planes: readonly Plane[],
): { point: Vector3; distance: number } | null {
  if (planes.length === 0) return null
  const d0 = ray.distanceToPlane(planes[0])
  if (d0 === null || d0 < 0) return null
  ray.at(d0, _point)
  for (let i = 1; i < planes.length; i++) {
    if (Math.abs(planes[i].distanceToPoint(_point)) > PLANE_TOL_MM) return null
  }
  return { point: _point.clone(), distance: d0 }
}

function meshBoundsCrossPlane(mesh: Mesh, plane: Plane): boolean {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
  const bb = mesh.geometry.boundingBox
  if (!bb) return false
  if (mesh.matrixWorldNeedsUpdate) mesh.updateMatrixWorld(true)
  _box.copy(bb).applyMatrix4(mesh.matrixWorld)
  const d1 = plane.distanceToPoint(_box.min)
  const d2 = plane.distanceToPoint(_box.max)
  return d1 * d2 <= 0 || Math.abs(d1) < PLANE_TOL_MM || Math.abs(d2) < PLANE_TOL_MM
}

/**
 * Kurzer Normalen-Probe-Strahl an der Schnittflaeche: liefert die Distanz von P zur echten
 * Mesh-Geometrie (null = kein Treffer). Nutzt mesh.raycast → nicht-pickbare (noop) Meshes
 * geben keine Treffer. So wird nur das Mesh getroffen, das die Cap an P tatsaechlich fuellt.
 */
function meshCutProbeHit(
  mesh: Mesh,
  cutPlane: Plane,
  pointOnPlane: Vector3,
): { score: number; hit: Intersection } | null {
  if (!meshBoundsCrossPlane(mesh, cutPlane)) return null
  if (mesh.matrixWorldNeedsUpdate) mesh.updateMatrixWorld(true)
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
  const bb = mesh.geometry.boundingBox
  if (!bb) return null
  _box.copy(bb).applyMatrix4(mesh.matrixWorld).expandByScalar(PLANE_TOL_MM)
  if (!_box.containsPoint(pointOnPlane)) return null

  _origin.copy(pointOnPlane).addScaledVector(cutPlane.normal, PROBE_MM)
  _dir.copy(cutPlane.normal).negate()
  _probe.set(_origin, _dir)
  _probe.near = 0
  _probe.far = PROBE_MM * 4
  const hits: Intersection[] = []
  mesh.raycast(_probe, hits)
  let best: { score: number; hit: Intersection } | null = null
  for (const hit of hits) {
    if (!isClippedRaycastHit({ ...hit, object: mesh } as Intersection)) continue
    if (Math.abs(cutPlane.distanceToPoint(hit.point)) > PLANE_TOL_MM) continue
    const score = hit.point.distanceTo(pointOnPlane)
    if (!best || score < best.score) best = { score, hit: { ...hit, object: mesh } as Intersection }
  }
  return best
}

export function meshCutProbeScore(mesh: Mesh, cutPlane: Plane, pointOnPlane: Vector3): number | null {
  return meshCutProbeHit(mesh, cutPlane, pointOnPlane)?.score ?? null
}

function tieBreakCutCandidates(
  candidates: Array<{ mesh: Mesh; score: number; probeHit: Intersection }>,
): { mesh: Mesh; probeHit: Intersection } {
  let best = candidates[0]
  for (const c of candidates) if (c.score < best.score) best = c
  return { mesh: best.mesh, probeHit: best.probeHit }
}

/** Klick auf die sichtbare Schnittflaeche → Struktur, die die Cap an diesem Punkt fuellt. */
export function pickAtActiveCutPlanes(
  raycaster: Raycaster,
  cutPlanes: readonly Plane[],
  sourceMeshes: readonly Mesh[],
): Intersection | null {
  const hit = intersectRayWithCutPlanes(raycaster.ray, cutPlanes)
  if (!hit) return null

  const primary = cutPlanes[0]
  const candidates: Array<{ mesh: Mesh; score: number; probeHit: Intersection }> = []
  for (const mesh of sourceMeshes) {
    if (!isPickableCutCapSource(mesh)) continue
    const probe = meshCutProbeHit(mesh, primary, hit.point)
    if (probe) candidates.push({ mesh, score: probe.score, probeHit: probe.hit })
  }
  if (candidates.length === 0) return null

  const chosen = tieBreakCutCandidates(candidates)
  return { ...chosen.probeHit, object: chosen.mesh, distance: hit.distance } as Intersection
}

/**
 * Bevorzugt den Schnittflaechen-Treffer (sichtbare Cap), sonst den ersten gueltigen
 * Oberflaechen-Treffer. Ohne aktive Cut-Ebene reiner Oberflaechen-Pick (= bisheriges Verhalten).
 */
export function pickCutAwareHit(
  raycaster: Raycaster,
  intersections: Intersection[],
  cutPlanes: readonly Plane[],
  sourceMeshes: readonly Mesh[],
): Intersection | null {
  const surfaceHit = pickFirstSurfaceHit(intersections)
  if (cutPlanes.length === 0) return surfaceHit
  const cutHit = pickAtActiveCutPlanes(raycaster, cutPlanes, sourceMeshes)
  return cutHit ?? surfaceHit
}
