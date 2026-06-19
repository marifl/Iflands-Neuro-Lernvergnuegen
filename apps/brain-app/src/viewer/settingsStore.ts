import { create } from 'zustand'
import type { ColorMode, Lang } from './ontology'
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from '../safeLocalStorage'
import { SETTINGS_STORAGE_KEY as LOCAL_SETTINGS_STORAGE_KEY } from '../localAppStorageKeys'

export const SETTINGS_SCHEMA_VERSION = 1
export const SETTINGS_STORAGE_KEY = LOCAL_SETTINGS_STORAGE_KEY
export const SETTINGS_CHANGE_EVENT = 'brain-app:settings-changed'

export const SETTINGS_CATEGORIES = [
  'display', 'accessibility', 'start', 'viewport', 'coloring',
  'learning', 'language', 'atlas', 'presenter', 'dataAccount',
] as const

export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number]

export type ThemePreference = 'system' | 'light' | 'dark'
export type ContrastPreference = 'standard' | 'high'
export type FontSizePreference = 'standard' | 'large' | 'extra-large'
export type MotionPreference = 'system' | 'reduce' | 'allow'
export type DefaultAppMode = 'learn' | 'explore' | 'phineas' | 'last'
export type DefaultCameraView = 'lateral-left' | 'anterior' | 'superior'
export type SkullContextDefault = 'hidden' | 'transparent' | 'solid'
export type RenderQuality = 'auto' | 'battery' | 'quality'
export type TermStyle = 'german' | 'latin' | 'both'
export type DefaultAtlasLayer = 'off' | 'dkt' | 'julich' | 'brodmann' | 'destrieux'
export type SyncDefault = 'off' | 'follow-presenter' | 'broadcast'
export type AccountRole = 'student' | 'dozent' | 'presenter' | 'developer'

export interface BrainAppSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION
  display: {
    theme: ThemePreference
    accentColor: 'orange'
    contrast: ContrastPreference
    fontSize: FontSizePreference
  }
  accessibility: {
    quietMode: boolean
    motion: MotionPreference
    focusRings: boolean
    haptics: boolean
    readAloud: boolean
    readableFont: boolean
  }
  start: {
    defaultMode: DefaultAppMode
    showOnboarding: boolean
  }
  viewport: {
    defaultCameraView: DefaultCameraView
    skullContext: SkullContextDefault
    autoRotate: boolean
    renderQuality: RenderQuality
  }
  coloring: {
    defaultColorMode: ColorMode
    dimOthers: boolean
    dimOpacity: number
  }
  learning: {
    autoAdvance: boolean
    saveProgress: boolean
    showSpeakerNotes: boolean
  }
  language: {
    primary: Lang
    termStyle: TermStyle
    abbreviations: boolean
  }
  atlas: {
    defaultLayer: DefaultAtlasLayer
    visibleCollections: string[]
  }
  presenter: {
    syncDefault: SyncDefault
    timer: boolean
    notes: boolean
  }
  dataAccount: {
    role: AccountRole
    autoExportSnapshots: boolean
  }
}

type SettingsData = Omit<BrainAppSettings, 'schemaVersion'>

export interface SettingsStore extends BrainAppSettings {
  setCategory: <K extends SettingsCategory>(category: K, value: SettingsData[K]) => void
  updateCategory: <K extends SettingsCategory>(category: K, patch: Partial<SettingsData[K]>) => void
  resetCategory: (category: SettingsCategory) => void
  resetSettings: () => void
  reloadSettings: () => void
}

const DEFAULT_SETTINGS: BrainAppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  display: {
    theme: 'system',
    accentColor: 'orange',
    contrast: 'standard',
    fontSize: 'standard',
  },
  accessibility: {
    quietMode: false,
    motion: 'system',
    focusRings: true,
    haptics: false,
    readAloud: false,
    readableFont: false,
  },
  start: { defaultMode: 'learn', showOnboarding: true },
  viewport: { defaultCameraView: 'lateral-left', skullContext: 'hidden', autoRotate: false, renderQuality: 'auto' },
  coloring: { defaultColorMode: 'anatomical', dimOthers: false, dimOpacity: 0.28 },
  learning: { autoAdvance: false, saveProgress: true, showSpeakerNotes: true },
  language: { primary: 'de', termStyle: 'german', abbreviations: true },
  atlas: { defaultLayer: 'off', visibleCollections: [] },
  presenter: { syncDefault: 'off', timer: true, notes: true },
  dataAccount: { role: 'student', autoExportSnapshots: false },
}

const COLOR_MODES = ['anatomical', 'function', 'laterality', 'region', 'preset'] as const satisfies readonly ColorMode[]
const LANGS = ['de', 'la', 'en'] as const satisfies readonly Lang[]

function emitSettingsChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT))
}

function copySettings(settings: BrainAppSettings): BrainAppSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    display: { ...settings.display },
    accessibility: { ...settings.accessibility },
    start: { ...settings.start },
    viewport: { ...settings.viewport },
    coloring: { ...settings.coloring },
    learning: { ...settings.learning },
    language: { ...settings.language },
    atlas: { ...settings.atlas, visibleCollections: [...settings.atlas.visibleCollections] },
    presenter: { ...settings.presenter },
    dataAccount: { ...settings.dataAccount },
  }
}

export function defaultSettings(): BrainAppSettings {
  return copySettings(DEFAULT_SETTINGS)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Settings: ${field} muss ein Objekt sein`)
  return value
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string): T {
  if (value === undefined) return fallback
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`Settings: ${field} hat einen ungueltigen Wert`)
}

function booleanValue(value: unknown, fallback: boolean, field: string): boolean {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  throw new Error(`Settings: ${field} muss boolean sein`)
}

function unitValue(value: unknown, fallback: number, field: string): number {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Settings: ${field} muss zwischen 0 und 1 liegen`)
  }
  return value
}

function stringArray(value: unknown, fallback: readonly string[], field: string): string[] {
  if (value === undefined) return [...fallback]
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`Settings: ${field} muss ein String-Array sein`)
  }
  return [...value]
}

function parseSettingsObject(value: Record<string, unknown>): BrainAppSettings {
  const base = DEFAULT_SETTINGS
  const display = record(value.display ?? {}, 'display')
  const accessibility = record(value.accessibility ?? {}, 'accessibility')
  const start = record(value.start ?? {}, 'start')
  const viewport = record(value.viewport ?? {}, 'viewport')
  const coloring = record(value.coloring ?? {}, 'coloring')
  const learning = record(value.learning ?? {}, 'learning')
  const language = record(value.language ?? {}, 'language')
  const atlas = record(value.atlas ?? {}, 'atlas')
  const presenter = record(value.presenter ?? {}, 'presenter')
  const dataAccount = record(value.dataAccount ?? {}, 'dataAccount')

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    display: {
      theme: enumValue(display.theme, ['system', 'light', 'dark'], base.display.theme, 'display.theme'),
      accentColor: enumValue(display.accentColor, ['orange'], base.display.accentColor, 'display.accentColor'),
      contrast: enumValue(display.contrast, ['standard', 'high'], base.display.contrast, 'display.contrast'),
      fontSize: enumValue(display.fontSize, ['standard', 'large', 'extra-large'], base.display.fontSize, 'display.fontSize'),
    },
    accessibility: {
      quietMode: booleanValue(accessibility.quietMode, base.accessibility.quietMode, 'accessibility.quietMode'),
      motion: enumValue(accessibility.motion, ['system', 'reduce', 'allow'], base.accessibility.motion, 'accessibility.motion'),
      focusRings: booleanValue(accessibility.focusRings, base.accessibility.focusRings, 'accessibility.focusRings'),
      haptics: booleanValue(accessibility.haptics, base.accessibility.haptics, 'accessibility.haptics'),
      readAloud: booleanValue(accessibility.readAloud, base.accessibility.readAloud, 'accessibility.readAloud'),
      readableFont: booleanValue(accessibility.readableFont, base.accessibility.readableFont, 'accessibility.readableFont'),
    },
    start: {
      defaultMode: enumValue(start.defaultMode, ['learn', 'explore', 'phineas', 'last'], base.start.defaultMode, 'start.defaultMode'),
      showOnboarding: booleanValue(start.showOnboarding, base.start.showOnboarding, 'start.showOnboarding'),
    },
    viewport: {
      defaultCameraView: enumValue(viewport.defaultCameraView, ['lateral-left', 'anterior', 'superior'], base.viewport.defaultCameraView, 'viewport.defaultCameraView'),
      skullContext: enumValue(viewport.skullContext, ['hidden', 'transparent', 'solid'], base.viewport.skullContext, 'viewport.skullContext'),
      autoRotate: booleanValue(viewport.autoRotate, base.viewport.autoRotate, 'viewport.autoRotate'),
      renderQuality: enumValue(viewport.renderQuality, ['auto', 'battery', 'quality'], base.viewport.renderQuality, 'viewport.renderQuality'),
    },
    coloring: {
      defaultColorMode: enumValue(coloring.defaultColorMode, COLOR_MODES, base.coloring.defaultColorMode, 'coloring.defaultColorMode'),
      dimOthers: booleanValue(coloring.dimOthers, base.coloring.dimOthers, 'coloring.dimOthers'),
      dimOpacity: unitValue(coloring.dimOpacity, base.coloring.dimOpacity, 'coloring.dimOpacity'),
    },
    learning: {
      autoAdvance: booleanValue(learning.autoAdvance, base.learning.autoAdvance, 'learning.autoAdvance'),
      saveProgress: booleanValue(learning.saveProgress, base.learning.saveProgress, 'learning.saveProgress'),
      showSpeakerNotes: booleanValue(learning.showSpeakerNotes, base.learning.showSpeakerNotes, 'learning.showSpeakerNotes'),
    },
    language: {
      primary: enumValue(language.primary, LANGS, base.language.primary, 'language.primary'),
      termStyle: enumValue(language.termStyle, ['german', 'latin', 'both'], base.language.termStyle, 'language.termStyle'),
      abbreviations: booleanValue(language.abbreviations, base.language.abbreviations, 'language.abbreviations'),
    },
    atlas: {
      defaultLayer: enumValue(atlas.defaultLayer, ['off', 'dkt', 'julich', 'brodmann', 'destrieux'], base.atlas.defaultLayer, 'atlas.defaultLayer'),
      visibleCollections: stringArray(atlas.visibleCollections, base.atlas.visibleCollections, 'atlas.visibleCollections'),
    },
    presenter: {
      syncDefault: enumValue(presenter.syncDefault, ['off', 'follow-presenter', 'broadcast'], base.presenter.syncDefault, 'presenter.syncDefault'),
      timer: booleanValue(presenter.timer, base.presenter.timer, 'presenter.timer'),
      notes: booleanValue(presenter.notes, base.presenter.notes, 'presenter.notes'),
    },
    dataAccount: {
      role: enumValue(dataAccount.role, ['student', 'dozent', 'presenter', 'developer'], base.dataAccount.role, 'dataAccount.role'),
      autoExportSnapshots: booleanValue(dataAccount.autoExportSnapshots, base.dataAccount.autoExportSnapshots, 'dataAccount.autoExportSnapshots'),
    },
  }
}

export function parseSettingsState(raw: unknown): BrainAppSettings {
  const value = record(raw, 'Root')
  const version = value.schemaVersion
  if (version !== undefined && version !== 0 && version !== SETTINGS_SCHEMA_VERSION) {
    throw new Error(`Settings: schemaVersion "${String(version)}" wird nicht unterstuetzt`)
  }
  return parseSettingsObject(value)
}

export function loadSettings(): BrainAppSettings {
  const raw = getLocalStorageItem(SETTINGS_STORAGE_KEY)
  if (!raw) return defaultSettings()
  try {
    return parseSettingsState(JSON.parse(raw))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${SETTINGS_STORAGE_KEY}: lokale Settings konnten nicht geladen werden (${detail})`)
  }
}

function persistSettings(settings: BrainAppSettings): void {
  setLocalStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  emitSettingsChange()
}

function replaceSettings(settings: BrainAppSettings): BrainAppSettings {
  const parsed = parseSettingsState(settings)
  persistSettings(parsed)
  return parsed
}

function settingsFromStore(state: BrainAppSettings): BrainAppSettings {
  return copySettings(state)
}

function resetCategoryData(settings: BrainAppSettings, category: SettingsCategory): BrainAppSettings {
  return {
    ...copySettings(settings),
    [category]: copySettings(DEFAULT_SETTINGS)[category],
  }
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...loadSettings(),

  setCategory: (category, value) => set((state) => {
    const next = {
      ...settingsFromStore(state),
      [category]: value,
    }
    return replaceSettings(next)
  }),

  updateCategory: (category, patch) => set((state) => {
    const current = settingsFromStore(state)
    const next = {
      ...current,
      [category]: { ...current[category], ...patch },
    }
    return replaceSettings(next)
  }),

  resetCategory: (category) => set((state) => replaceSettings(resetCategoryData(state, category))),

  resetSettings: () => set(() => {
    removeLocalStorageItem(SETTINGS_STORAGE_KEY)
    emitSettingsChange()
    return defaultSettings()
  }),

  reloadSettings: () => set(() => loadSettings()),
}))
