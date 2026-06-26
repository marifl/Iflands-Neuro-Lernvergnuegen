import type { BrainSpace, LabOverlay } from './overlayContract'

export type BrainModelOptionId =
  | 'taro'
  | 'mni-mobile-r05'
  | 'mni-mobile-r06'
  | 'mni-mobile-r08'
  | 'mni-desktop-r18'

export type BrainModelOption = {
  id: BrainModelOptionId
  label: string
  url: string
  /** Koordinatenraum des Modells; bestimmt, welche Overlays kompatibel sind. */
  space: BrainSpace
  reviewNote: string
}

const BRAIN_MODEL_QUERY_PARAM = 'brainModel'

export const BRAIN_MODEL_OPTIONS: readonly BrainModelOption[] = [
  {
    id: 'taro',
    label: 'TARO Standard',
    url: '/assets/bodyparts3d/brain.glb',
    space: 'taro',
    reviewNote: 'aktuelles Produktionsmodell',
  },
  {
    id: 'mni-mobile-r05',
    label: 'MNI mobile r05',
    url: '/assets/brain-models/mni152/mni152-mobile-r05.glb',
    space: 'mni152',
    reviewNote: 'kleinste MNI Review-LOD',
  },
  {
    id: 'mni-mobile-r06',
    label: 'MNI mobile r06',
    url: '/assets/brain-models/mni152/mni152-mobile-r06.glb',
    space: 'mni152',
    reviewNote: 'balancierte MNI Review-LOD',
  },
  {
    id: 'mni-mobile-r08',
    label: 'MNI mobile r08',
    url: '/assets/brain-models/mni152/mni152-mobile-r08.glb',
    space: 'mni152',
    reviewNote: 'ehemalige Mobile-Referenz',
  },
  {
    id: 'mni-desktop-r18',
    label: 'MNI desktop r18',
    url: '/assets/brain-models/mni152/mni152-desktop-r18.glb',
    space: 'mni152',
    reviewNote: 'Desktop-Referenz fuer Detailvergleich',
  },
] as const

export const DEFAULT_BRAIN_MODEL_OPTION = BRAIN_MODEL_OPTIONS[0]

const BRAIN_MODEL_OPTIONS_BY_ID = new Map<BrainModelOptionId, BrainModelOption>(
  BRAIN_MODEL_OPTIONS.map((option) => [option.id, option]),
)

function isBrainModelOptionId(value: string): value is BrainModelOptionId {
  return BRAIN_MODEL_OPTIONS_BY_ID.has(value as BrainModelOptionId)
}

/** Liefert das registrierte Modell oder wirft laut (kein stiller Fallback). */
export function getBrainModelOption(id: BrainModelOptionId): BrainModelOption {
  const option = BRAIN_MODEL_OPTIONS_BY_ID.get(id)
  if (!option) throw new Error(`Brain model "${id}" ist nicht registriert`)
  return option
}

export function resolveBrainModelOptionId(search: string): BrainModelOptionId {
  const params = new URLSearchParams(search)
  const requested = params.get(BRAIN_MODEL_QUERY_PARAM)
  if (!requested) return DEFAULT_BRAIN_MODEL_OPTION.id
  if (isBrainModelOptionId(requested)) return requested
  throw new Error(`Brain model "${requested}" ist nicht registriert`)
}

export function resolveBrainModelOptionFromSearch(search: string): BrainModelOption {
  return getBrainModelOption(resolveBrainModelOptionId(search))
}

/**
 * Prueft ein Lab-Overlay gegen das registrierte Brain Model. Inkompatible Overlays
 * werden blockierend mit erklaerbarem Fehler abgelehnt (kein stiller Fallback,
 * kein stiller Modellwechsel).
 */
export function assertOverlayMatchesBrainModel(overlay: LabOverlay, modelId: BrainModelOptionId): void {
  const model = getBrainModelOption(modelId)
  if (overlay.brainModelId !== model.id) {
    throw new Error(
      `Overlay "${overlay.id}" gehoert zu Brain model "${overlay.brainModelId}", nicht zum aktiven "${model.id}"`,
    )
  }
  if (overlay.space !== model.space) {
    throw new Error(
      `Overlay "${overlay.id}" ist im Raum "${overlay.space}", Brain model "${model.id}" erwartet Raum "${model.space}"`,
    )
  }
}

export function brainModelReviewSearch(optionId: BrainModelOptionId, search: string): string {
  const params = new URLSearchParams(search)
  if (optionId === DEFAULT_BRAIN_MODEL_OPTION.id) params.delete(BRAIN_MODEL_QUERY_PARAM)
  else params.set(BRAIN_MODEL_QUERY_PARAM, optionId)
  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}
