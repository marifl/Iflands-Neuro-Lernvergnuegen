import { afterEach, describe, expect, it } from 'vitest'
import {
  applyAppearanceSettings,
  resolveMotionPreference,
  resolveThemePreference,
  type AppearanceSettings,
} from './appearanceRuntime'

function settings(patch: Partial<AppearanceSettings> = {}): AppearanceSettings {
  return {
    display: {
      theme: 'system',
      contrast: 'standard',
      fontSize: 'standard',
      ...patch.display,
    },
    accessibility: {
      quietMode: false,
      motion: 'system',
      focusRings: true,
      readableFont: false,
      ...patch.accessibility,
    },
  }
}

describe('appearanceRuntime', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-contrast')
    document.documentElement.removeAttribute('data-font-size')
    document.documentElement.removeAttribute('data-readable-font')
    document.documentElement.removeAttribute('data-focus-rings')
    document.documentElement.removeAttribute('data-motion')
    document.documentElement.removeAttribute('data-quiet-mode')
  })

  it('resolvt System-Theme und Motion aus Media-Praeferenzen', () => {
    expect(resolveThemePreference('system', true)).toBe('light')
    expect(resolveThemePreference('system', false)).toBe('dark')
    expect(resolveMotionPreference('system', true)).toBe('reduce')
    expect(resolveMotionPreference('system', false)).toBe('allow')
  })

  it('setzt nur aktive Appearance-Datasets', () => {
    applyAppearanceSettings(settings({
      display: { theme: 'light', contrast: 'high', fontSize: 'extra-large' },
      accessibility: { quietMode: true, motion: 'reduce', focusRings: false, readableFont: true },
    }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(document.documentElement.dataset.fontSize).toBe('extra-large')
    expect(document.documentElement.dataset.readableFont).toBe('true')
    expect(document.documentElement.dataset.focusRings).toBe('off')
    expect(document.documentElement.dataset.motion).toBe('reduce')
    expect(document.documentElement.dataset.quietMode).toBe('true')
  })

  it('raeumt inaktive Appearance-Datasets wieder ab', () => {
    applyAppearanceSettings(settings({
      display: { theme: 'light', contrast: 'high', fontSize: 'large' },
      accessibility: { quietMode: true, motion: 'reduce', focusRings: false, readableFont: true },
    }))

    applyAppearanceSettings(settings({
      display: { theme: 'dark', contrast: 'standard', fontSize: 'standard' },
      accessibility: { quietMode: false, motion: 'allow', focusRings: true, readableFont: false },
    }))

    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(document.documentElement.dataset.contrast).toBeUndefined()
    expect(document.documentElement.dataset.fontSize).toBeUndefined()
    expect(document.documentElement.dataset.readableFont).toBeUndefined()
    expect(document.documentElement.dataset.focusRings).toBeUndefined()
    expect(document.documentElement.dataset.motion).toBeUndefined()
    expect(document.documentElement.dataset.quietMode).toBeUndefined()
  })
})
