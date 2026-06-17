import type { AppMode } from './viewerStore'

export type RegularAppMode = Extract<AppMode, 'learn' | 'explore' | 'phineas'>

export interface AppModeDefinition {
  mode: RegularAppMode
  label: string
  description: string
  recommended?: boolean
}

export const REGULAR_APP_MODE_DEFINITIONS = [
  {
    mode: 'learn',
    label: 'Lernen',
    description: 'Lernpfad: geführte Szenen zu Kapitel 11, ERP-Komponenten und Basalganglien-Schleifen.',
    recommended: true,
  },
  {
    mode: 'explore',
    label: 'Explorer',
    description: 'Freies Anklicken und Isolieren: das Gehirn ohne geführte Szenen erkunden.',
    recommended: false,
  },
  {
    mode: 'phineas',
    label: 'Phineas Gage',
    description: 'Fallszene: die historische Läsions-Fallstudie als animierte Rekonstruktion.',
    recommended: false,
  },
] as const satisfies readonly AppModeDefinition[]

export const APP_MODE_LABEL: Record<AppMode, string> = {
  learn: REGULAR_APP_MODE_DEFINITIONS[0].label,
  explore: REGULAR_APP_MODE_DEFINITIONS[1].label,
  phineas: REGULAR_APP_MODE_DEFINITIONS[2].label,
  atlas: 'Atlas',
}
