import { beforeEach, describe, expect, it } from 'vitest'
import {
  SETTINGS_CHANGE_EVENT,
  SETTINGS_CATEGORIES,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  loadSettings,
  parseSettingsState,
  useSettingsStore,
} from './settingsStore'

beforeEach(() => {
  localStorage.clear()
  useSettingsStore.getState().resetSettings()
})

describe('settingsStore', () => {
  it('liefert zentrale Defaults fuer alle Settings-Kategorien', () => {
    const settings = defaultSettings()

    expect(settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
    expect(SETTINGS_CATEGORIES).toEqual([
      'display',
      'accessibility',
      'start',
      'viewport',
      'coloring',
      'learning',
      'language',
      'atlas',
      'presenter',
      'dataAccount',
    ])
    expect(settings.display.theme).toBe('system')
    expect(settings.accessibility.focusRings).toBe(true)
    expect(settings.start.defaultMode).toBe('learn')
    expect(settings.viewport.defaultCameraView).toBe('lateral-left')
    expect(settings.coloring.defaultColorMode).toBe('anatomical')
    expect(settings.coloring.dimOpacity).toBe(0.28)
    expect(settings.learning.saveProgress).toBe(true)
    expect(settings.language.primary).toBe('de')
    expect(settings.atlas.defaultLayer).toBe('off')
    expect(settings.presenter.timer).toBe(true)
    expect(settings.dataAccount.role).toBe('student')
  })

  it('kopiert Array-Defaults statt geteilte Referenzen auszugeben', () => {
    const first = defaultSettings()
    const second = defaultSettings()

    first.atlas.visibleCollections.push('dkt')

    expect(second.atlas.visibleCollections).toEqual([])
  })

  it('migriert schemaVersion 0 oder fehlende Version auf das aktuelle Schema', () => {
    const migrated = parseSettingsState({
      schemaVersion: 0,
      display: { theme: 'dark' },
      coloring: { defaultColorMode: 'function', dimOpacity: 0.5 },
      atlas: { visibleCollections: ['dkt', 'julich'] },
    })

    expect(migrated.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
    expect(migrated.display.theme).toBe('dark')
    expect(migrated.display.fontSize).toBe('standard')
    expect(migrated.coloring.defaultColorMode).toBe('function')
    expect(migrated.coloring.dimOpacity).toBe(0.5)
    expect(migrated.atlas.visibleCollections).toEqual(['dkt', 'julich'])
  })

  it('weist nicht unterstuetzte Versionen und ungueltige Werte laut ab', () => {
    expect(() => parseSettingsState({ ...defaultSettings(), schemaVersion: 2 })).toThrow(/schemaVersion/)
    expect(() => parseSettingsState({
      ...defaultSettings(),
      coloring: { ...defaultSettings().coloring, dimOpacity: 2 },
    })).toThrow(/dimOpacity/)
    expect(() => parseSettingsState({
      ...defaultSettings(),
      atlas: { ...defaultSettings().atlas, visibleCollections: [''] },
    })).toThrow(/visibleCollections/)
  })

  it('wirft beim Laden korrupter localStorage-Daten laut statt Defaults zu maskieren', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{kaputt')

    expect(() => loadSettings()).toThrow(/brain-app-settings/)

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      ...defaultSettings(),
      display: { theme: 'neon' },
    }))

    expect(() => loadSettings()).toThrow(/brain-app-settings/)
  })

  it('persistiert Kategorie-Updates und meldet Settings-Aenderungen', () => {
    let events = 0
    window.addEventListener(SETTINGS_CHANGE_EVENT, () => { events += 1 })

    useSettingsStore.getState().updateCategory('display', { theme: 'dark', fontSize: 'large' })
    useSettingsStore.getState().setCategory('coloring', {
      defaultColorMode: 'preset',
      dimOthers: true,
      dimOpacity: 0.45,
    })

    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)

    expect(useSettingsStore.getState().display.theme).toBe('dark')
    expect(useSettingsStore.getState().display.fontSize).toBe('large')
    expect(useSettingsStore.getState().coloring.defaultColorMode).toBe('preset')
    expect(stored.display.theme).toBe('dark')
    expect(stored.coloring.dimOpacity).toBe(0.45)
    expect(events).toBe(2)
  })

  it('setzt einzelne Kategorien auf Defaults zurueck und erhaelt andere Kategorien', () => {
    const store = useSettingsStore.getState()
    store.updateCategory('display', { theme: 'dark' })
    store.updateCategory('coloring', { dimOthers: true, dimOpacity: 0.4 })

    useSettingsStore.getState().resetCategory('display')

    expect(useSettingsStore.getState().display).toEqual(defaultSettings().display)
    expect(useSettingsStore.getState().coloring.dimOthers).toBe(true)
    expect(useSettingsStore.getState().coloring.dimOpacity).toBe(0.4)
  })

  it('setzt alle Settings zurueck und entfernt den Storage-Key', () => {
    useSettingsStore.getState().updateCategory('start', { defaultMode: 'last' })
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeTruthy()

    useSettingsStore.getState().resetSettings()

    expect(useSettingsStore.getState().start.defaultMode).toBe('learn')
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
  })
})
