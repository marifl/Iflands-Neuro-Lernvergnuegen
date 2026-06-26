/**
 * PickTargetContract (9xGQeXYPZqS1, Description-Punkt 5).
 *
 * Typisiertes Ergebnis eines Picks/einer Projektion auf einem Brain Model. Jedes
 * Ergebnis traegt `brainModelId`, `spaceId` und `validationStatus` — kein Pick darf
 * ohne diese Metadaten gezeichnet werden (assertDrawablePickTarget wirft sonst).
 *
 * Kein Zod: Pick-Targets werden INTERN von der Pick-/Projektionslogik erzeugt, sind
 * also kein Trust-Boundary fuer externe Daten (anders als overlayContract/Manifest).
 * Reine diskriminierte TypeScript-Union + Guards (ponytail: keine ueberfluessige Runtime-Validierung).
 */
import type { BrainSpace } from './overlayContract'

export type PickValidationStatus = 'valid' | 'out-of-bounds' | 'ambiguous'

interface PickTargetBase {
  brainModelId: string
  spaceId: BrainSpace
  validationStatus: PickValidationStatus
}

export interface VertexPickTarget extends PickTargetBase {
  kind: 'vertex'
  coords: [number, number, number]
  vertexIndex: number
  distanceMm: number
  normal: [number, number, number]
}

export interface FacePickTarget extends PickTargetBase {
  kind: 'face'
  coords: [number, number, number]
  faceIndex: number
  distanceMm: number
}

export interface RoiPickTarget extends PickTargetBase {
  kind: 'roi'
  atlasId: string
  regionId: string
  label: string
}

export interface SubcortexPickTarget extends PickTargetBase {
  kind: 'subcortex-mesh'
  structureId: string
  side: 'L' | 'R'
  label: string
}

export type PickTarget = VertexPickTarget | FacePickTarget | RoiPickTarget | SubcortexPickTarget

export const isVertexPick = (t: PickTarget): t is VertexPickTarget => t.kind === 'vertex'
export const isFacePick = (t: PickTarget): t is FacePickTarget => t.kind === 'face'
export const isRoiPick = (t: PickTarget): t is RoiPickTarget => t.kind === 'roi'
export const isSubcortexPick = (t: PickTarget): t is SubcortexPickTarget => t.kind === 'subcortex-mesh'

/**
 * Wirft, wenn ein Pick-Target nicht gezeichnet werden darf. Ein nicht-valider Status
 * (out-of-bounds, ambiguous) ist ein blockierender Fehler, kein stiller Skip.
 */
export function assertDrawablePickTarget(t: PickTarget): void {
  if (t.validationStatus !== 'valid') {
    throw new Error(
      `Pick-Target (${t.kind}) auf Modell "${t.brainModelId}" ist "${t.validationStatus}", nicht "valid" — wird nicht gezeichnet`,
    )
  }
}
