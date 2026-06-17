import { describe, expect, it } from 'vitest'
import { APP_MODE_LABEL, REGULAR_APP_MODE_DEFINITIONS } from './appModeDefinitions'

describe('appModeDefinitions', () => {
  it('definiert die regulären Umschalter-Modi in Produkt-Reihenfolge', () => {
    expect(REGULAR_APP_MODE_DEFINITIONS.map((definition) => definition.mode)).toEqual([
      'learn',
      'explore',
      'phineas',
    ])
    expect(REGULAR_APP_MODE_DEFINITIONS.map((definition) => definition.label)).toEqual([
      'Lernen',
      'Explorer',
      'Phineas Gage',
    ])
  })

  it('hält atlas aus dem regulären Umschalter heraus', () => {
    expect(REGULAR_APP_MODE_DEFINITIONS.map((definition) => definition.mode)).not.toContain('atlas')
    expect(APP_MODE_LABEL.atlas).toBe('Atlas')
  })

  it('beschreibt die drei Modi mit dem fachlichen Zweck', () => {
    expect(REGULAR_APP_MODE_DEFINITIONS[0].description).toContain('Lernpfad')
    expect(REGULAR_APP_MODE_DEFINITIONS[1].description).toContain('Freies Anklicken und Isolieren')
    expect(REGULAR_APP_MODE_DEFINITIONS[2].description).toContain('Fallszene')
  })
})
