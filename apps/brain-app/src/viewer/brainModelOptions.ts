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
  reviewNote: string
}

export const BRAIN_MODEL_QUERY_PARAM = 'brainModel'

export const BRAIN_MODEL_OPTIONS: readonly BrainModelOption[] = [
  {
    id: 'taro',
    label: 'TARO Standard',
    url: '/assets/bodyparts3d/brain.glb',
    reviewNote: 'aktuelles Produktionsmodell',
  },
  {
    id: 'mni-mobile-r05',
    label: 'MNI mobile r05',
    url: '/assets/brain-models/mni152/mni152-mobile-r05.glb',
    reviewNote: 'kleinste MNI Review-LOD',
  },
  {
    id: 'mni-mobile-r06',
    label: 'MNI mobile r06',
    url: '/assets/brain-models/mni152/mni152-mobile-r06.glb',
    reviewNote: 'balancierte MNI Review-LOD',
  },
  {
    id: 'mni-mobile-r08',
    label: 'MNI mobile r08',
    url: '/assets/brain-models/mni152/mni152-mobile-r08.glb',
    reviewNote: 'ehemalige Mobile-Referenz',
  },
  {
    id: 'mni-desktop-r18',
    label: 'MNI desktop r18',
    url: '/assets/brain-models/mni152/mni152-desktop-r18.glb',
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

export function resolveBrainModelOptionId(search: string): BrainModelOptionId {
  const params = new URLSearchParams(search)
  const requested = params.get(BRAIN_MODEL_QUERY_PARAM)
  if (!requested) return DEFAULT_BRAIN_MODEL_OPTION.id
  if (isBrainModelOptionId(requested)) return requested
  throw new Error(`Brain model "${requested}" ist nicht registriert`)
}

export function resolveBrainModelOptionFromSearch(search: string): BrainModelOption {
  const id = resolveBrainModelOptionId(search)
  return BRAIN_MODEL_OPTIONS_BY_ID.get(id) ?? DEFAULT_BRAIN_MODEL_OPTION
}

export function brainModelReviewSearch(optionId: BrainModelOptionId, search: string): string {
  const params = new URLSearchParams(search)
  if (optionId === DEFAULT_BRAIN_MODEL_OPTION.id) params.delete(BRAIN_MODEL_QUERY_PARAM)
  else params.set(BRAIN_MODEL_QUERY_PARAM, optionId)
  const nextSearch = params.toString()
  return nextSearch ? `?${nextSearch}` : ''
}
