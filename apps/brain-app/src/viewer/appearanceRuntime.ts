import type { BrainAppSettings } from './settingsStore'

export const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)'
export const PREFERS_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export interface AppearanceSettings {
  display: Pick<BrainAppSettings['display'], 'theme' | 'contrast' | 'fontSize'>
  accessibility: Pick<BrainAppSettings['accessibility'], 'quietMode' | 'motion' | 'focusRings' | 'readableFont'>
}

interface AppearanceEnvironment {
  prefersLight?: boolean
  prefersReducedMotion?: boolean
}

function mediaMatches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

export function resolveThemePreference(
  theme: BrainAppSettings['display']['theme'],
  prefersLight = mediaMatches(PREFERS_LIGHT_QUERY),
): 'dark' | 'light' {
  if (theme === 'light' || theme === 'dark') return theme
  return prefersLight ? 'light' : 'dark'
}

export function resolveMotionPreference(
  motion: BrainAppSettings['accessibility']['motion'],
  prefersReducedMotion = mediaMatches(PREFERS_REDUCED_MOTION_QUERY),
): 'allow' | 'reduce' {
  if (motion === 'reduce') return 'reduce'
  if (motion === 'allow') return 'allow'
  return prefersReducedMotion ? 'reduce' : 'allow'
}

function setDatasetValue(root: HTMLElement, key: string, value: string | null): void {
  if (value === null) delete root.dataset[key]
  else root.dataset[key] = value
}

export function applyAppearanceSettings(
  settings: AppearanceSettings,
  root = typeof document === 'undefined' ? null : document.documentElement,
  environment: AppearanceEnvironment = {},
): void {
  if (!root) return
  const theme = resolveThemePreference(settings.display.theme, environment.prefersLight)
  const motion = resolveMotionPreference(settings.accessibility.motion, environment.prefersReducedMotion)

  setDatasetValue(root, 'theme', theme === 'light' ? 'light' : null)
  setDatasetValue(root, 'contrast', settings.display.contrast === 'high' ? 'high' : null)
  setDatasetValue(root, 'fontSize', settings.display.fontSize === 'standard' ? null : settings.display.fontSize)
  setDatasetValue(root, 'readableFont', settings.accessibility.readableFont ? 'true' : null)
  setDatasetValue(root, 'focusRings', settings.accessibility.focusRings ? null : 'off')
  setDatasetValue(root, 'motion', motion === 'reduce' ? 'reduce' : null)
  setDatasetValue(root, 'quietMode', settings.accessibility.quietMode ? 'true' : null)
}
