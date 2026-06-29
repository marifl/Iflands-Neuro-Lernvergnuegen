import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, type BrainAppSettings } from './settingsStore'
import {
  LAST_APP_MODE_STORAGE_KEY,
  applySupportedViewerDefaults,
  caseStudyLaunchFromSearch,
  explicitAppModeFromSearch,
  loadRememberedAppMode,
  rememberAppMode,
  shouldShowLauncher,
  startupAppModeFromSettings,
} from './settingsRuntime'
import { useViewerStore } from './viewerStore'

function settingsWith(patch: Partial<BrainAppSettings>): BrainAppSettings {
  return {
    ...defaultSettings(),
    ...patch,
    display: { ...defaultSettings().display, ...patch.display },
    accessibility: { ...defaultSettings().accessibility, ...patch.accessibility },
    start: { ...defaultSettings().start, ...patch.start },
    viewport: { ...defaultSettings().viewport, ...patch.viewport },
    coloring: { ...defaultSettings().coloring, ...patch.coloring },
    learning: { ...defaultSettings().learning, ...patch.learning },
    language: { ...defaultSettings().language, ...patch.language },
    atlas: { ...defaultSettings().atlas, ...patch.atlas },
    presenter: { ...defaultSettings().presenter, ...patch.presenter },
    dataAccount: { ...defaultSettings().dataAccount, ...patch.dataAccount },
  }
}

describe('settingsRuntime', () => {
  beforeEach(() => {
    localStorage.clear()
    useViewerStore.setState({
      appMode: 'explore',
      activePreset: null,
      cameraView: null,
      colorMode: 'region',
      lang: 'de',
      showAtlasDkt: false,
      showAtlasJulich: false,
      showCarveBrodmann: false,
      showCarveDkt: false,
      showCarveJulich: false,
    })
  })

  it('laesst explizite Routen vor Settings-Defaults gewinnen', () => {
    const settings = settingsWith({ start: { defaultMode: 'explore', showOnboarding: false } })

    expect(explicitAppModeFromSearch('?scene=vcpt')).toBe('learn')
    expect(explicitAppModeFromSearch('?config=vcpt')).toBe('explore')
    expect(startupAppModeFromSettings('?mode=atlas', settings)).toBe('atlas')
  })

  it('erkennt Case-Study-Launches aus der URL', () => {
    expect(caseStudyLaunchFromSearch('?mode=phineas')).toBe('phineas-gage')
    expect(caseStudyLaunchFromSearch('?case-study=phineas-gage')).toBe('phineas-gage')
    expect(caseStudyLaunchFromSearch('?mode=learn&scene=vcpt')).toBeNull()
    expect(caseStudyLaunchFromSearch('')).toBeNull()
    expect(explicitAppModeFromSearch('?case-study=phineas-gage')).toBe('explore')
  })

  it('wirft laut bei unbekannter Case-Study-ID statt sie still zu aktivieren', () => {
    expect(() => caseStudyLaunchFromSearch('?case-study=gibt-es-nicht')).toThrow(/unbekannte Case-Study-ID/)
  })

  it('nutzt den Default-Modus nur wenn Onboarding ausgeschaltet ist', () => {
    expect(shouldShowLauncher('', defaultSettings())).toBe(true)
    expect(startupAppModeFromSettings('', settingsWith({ start: { defaultMode: 'explore', showOnboarding: false } }))).toBe('explore')
  })

  it('merkt den letzten regulaeren Modus fuer den naechsten Start', () => {
    rememberAppMode('atlas')
    expect(localStorage.getItem(LAST_APP_MODE_STORAGE_KEY)).toBeNull()
    expect(loadRememberedAppMode()).toBeNull()

    rememberAppMode('explore')
    expect(loadRememberedAppMode()).toBe('explore')
    expect(startupAppModeFromSettings('', settingsWith({ start: { defaultMode: 'last', showOnboarding: false } }))).toBe('explore')
  })

  it('verdrahtet unterstuetzte Viewer-Defaults ohne Inhalts-Deep-Link', () => {
    const settings = settingsWith({
      viewport: { defaultCameraView: 'superior', skullContext: 'transparent', autoRotate: true, renderQuality: 'quality' },
      coloring: { defaultColorMode: 'function', dimOthers: true, dimOpacity: 0.5 },
      language: { primary: 'en', termStyle: 'german', abbreviations: true },
      atlas: { defaultLayer: 'brodmann', visibleCollections: ['dkt', 'julich'] },
    })

    applySupportedViewerDefaults(settings, '?mode=explore')

    const state = useViewerStore.getState()
    expect(state.lang).toBe('en')
    expect(state.cameraView?.name).toBe('superior')
    expect(state.colorMode).toBe('function')
    expect(state.showAtlasDkt).toBe(true)
    expect(state.showAtlasJulich).toBe(true)
    expect(state.showCarveBrodmann).toBe(true)
    expect(state.showCarveDkt).toBe(false)
    expect(state.showCarveJulich).toBe(false)
  })

  it('ueberschreibt keine Inhalts-Deep-Links mit Viewer-Defaults', () => {
    const settings = settingsWith({
      viewport: { defaultCameraView: 'anterior', skullContext: 'solid', autoRotate: false, renderQuality: 'auto' },
      coloring: { defaultColorMode: 'laterality', dimOthers: false, dimOpacity: 0.28 },
      language: { primary: 'la', termStyle: 'german', abbreviations: true },
      atlas: { defaultLayer: 'dkt', visibleCollections: ['dkt'] },
    })

    applySupportedViewerDefaults(settings, '?config=vcpt&scene=vcpt')

    const state = useViewerStore.getState()
    expect(state.lang).toBe('de')
    expect(state.cameraView).toBeNull()
    expect(state.colorMode).toBe('region')
    expect(state.showCarveDkt).toBe(false)
  })
})
