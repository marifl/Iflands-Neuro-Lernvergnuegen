import type { ColorMode } from './ontology'

export type BaseColorMode = Exclude<ColorMode, 'preset'>

export interface ColorModeDefinition {
  mode: BaseColorMode
  label: string
}

export const BASE_COLOR_MODE_DEFINITIONS = [
  { mode: 'anatomical', label: 'Anatomisch' },
  { mode: 'function', label: 'Funktionssystem' },
  { mode: 'laterality', label: 'Lateralität' },
  { mode: 'region', label: 'Region' },
] as const satisfies readonly ColorModeDefinition[]

export const ALL_COLOR_MODES = [
  'anatomical',
  'function',
  'laterality',
  'region',
  'preset',
] as const satisfies readonly ColorMode[]

export const COLOR_MODE_LABEL: Record<ColorMode, string> = {
  anatomical: BASE_COLOR_MODE_DEFINITIONS[0].label,
  function: BASE_COLOR_MODE_DEFINITIONS[1].label,
  laterality: BASE_COLOR_MODE_DEFINITIONS[2].label,
  region: BASE_COLOR_MODE_DEFINITIONS[3].label,
  preset: 'Figur',
}
