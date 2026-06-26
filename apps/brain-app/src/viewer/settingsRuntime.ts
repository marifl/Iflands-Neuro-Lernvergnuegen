import { getLocalStorageItem, setLocalStorageItem } from '../safeLocalStorage'
import { REGULAR_APP_MODE_DEFINITIONS, type RegularAppMode } from './appModeDefinitions'
import { appModeForRegistryLaunch, parseRegistryLaunchFromSearch } from './registryLaunch'
import type { BrainAppSettings } from './settingsStore'
import { APP_MODES, useViewerStore, type AppMode } from './viewerStore'

export const LAST_APP_MODE_STORAGE_KEY = 'brain-app-last-app-mode'

export interface SupportedViewerDefaults {
  viewport: Pick<BrainAppSettings['viewport'], 'defaultCameraView'>
  coloring: Pick<BrainAppSettings['coloring'], 'defaultColorMode' | 'dimOthers'>
  language: Pick<BrainAppSettings['language'], 'primary'>
  atlas: Pick<BrainAppSettings['atlas'], 'defaultLayer' | 'visibleCollections'>
}

const REGULAR_APP_MODES = REGULAR_APP_MODE_DEFINITIONS.map((definition) => definition.mode)

function isRegularAppMode(value: string | null): value is RegularAppMode {
  return REGULAR_APP_MODES.includes(value as RegularAppMode)
}

export function explicitAppModeFromSearch(search: string): AppMode | null {
  const launch = parseRegistryLaunchFromSearch(search)
  if (launch) return appModeForRegistryLaunch(launch)

  const params = new URLSearchParams(search)
  const mode = params.get('mode')
  if (mode === 'phineas') return 'explore'
  if (mode && APP_MODES.includes(mode as AppMode)) return mode as AppMode
  if (params.has('scene')) return 'learn'
  if (params.has('config')) return 'explore'
  if (params.has('spike')) return 'learn'
  return null
}

function defaultAppModeFromSettings(settings: BrainAppSettings): RegularAppMode | null {
  if (settings.start.defaultMode === 'last') {
    return loadRememberedAppMode()
  }
  return settings.start.defaultMode
}

export function startupAppModeFromSettings(search: string, settings: BrainAppSettings): AppMode | null {
  const explicitMode = explicitAppModeFromSearch(search)
  if (explicitMode) return explicitMode
  if (settings.start.showOnboarding) return null
  return defaultAppModeFromSettings(settings)
}

export function shouldShowModeLauncher(search: string, settings: BrainAppSettings): boolean {
  return startupAppModeFromSettings(search, settings) === null
}

export function rememberAppMode(mode: AppMode): void {
  if (isRegularAppMode(mode)) setLocalStorageItem(LAST_APP_MODE_STORAGE_KEY, mode)
}

export function loadRememberedAppMode(): RegularAppMode | null {
  const remembered = getLocalStorageItem(LAST_APP_MODE_STORAGE_KEY)
  return isRegularAppMode(remembered) ? remembered : null
}

function shouldApplyFunctionalDefaults(search: string): boolean {
  const params = new URLSearchParams(search)
  if (params.has('scene') || params.has('config') || params.has('spike')) return false
  const launch = parseRegistryLaunchFromSearch(search)
  return !launch || launch.entrypoint.kind === 'app-mode'
}

export function canApplyFunctionalDefaults(
  search = typeof window === 'undefined' ? '' : window.location.search,
): boolean {
  return shouldApplyFunctionalDefaults(search)
}

export function applyLanguageDefault(settings: Pick<SupportedViewerDefaults, 'language'>): void {
  useViewerStore.getState().setLang(settings.language.primary)
}

export function applyViewportDefaults(settings: Pick<SupportedViewerDefaults, 'viewport'>): void {
  const store = useViewerStore.getState()
  store.setCameraView(settings.viewport.defaultCameraView)
}

export function applyColoringDefaults(settings: Pick<SupportedViewerDefaults, 'coloring'>): void {
  const store = useViewerStore.getState()
  store.setColorMode(settings.coloring.defaultColorMode === 'preset' ? 'region' : settings.coloring.defaultColorMode)
  const activePreset = useViewerStore.getState().activePreset
  if (activePreset) {
    useViewerStore.getState().setPreset({ ...activePreset, dimOthers: settings.coloring.dimOthers })
  }
}

export function applyAtlasDefaults(settings: Pick<SupportedViewerDefaults, 'atlas'>): void {
  const store = useViewerStore.getState()
  store.setAtlasOverlay('julich', settings.atlas.visibleCollections.includes('julich'))
  store.setAtlasOverlay('dkt', settings.atlas.visibleCollections.includes('dkt'))
  store.setCarveOverlay('julich', settings.atlas.defaultLayer === 'julich')
  store.setCarveOverlay('dkt', settings.atlas.defaultLayer === 'dkt')
  store.setCarveOverlay('brodmann', settings.atlas.defaultLayer === 'brodmann')
}

export function applySupportedViewerDefaults(
  settings: SupportedViewerDefaults,
  search = typeof window === 'undefined' ? '' : window.location.search,
): void {
  if (!shouldApplyFunctionalDefaults(search)) return

  applyLanguageDefault(settings)
  applyViewportDefaults(settings)
  applyColoringDefaults(settings)
  applyAtlasDefaults(settings)
}
