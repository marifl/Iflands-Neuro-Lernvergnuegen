import { describe, expect, it } from 'vitest'
import { ALL_COLOR_MODES, BASE_COLOR_MODE_DEFINITIONS, COLOR_MODE_LABEL } from './colorModeDefinitions'

describe('colorModeDefinitions', () => {
  it('deckt alle fünf Färbungsmodi in Store-Reihenfolge ab', () => {
    expect(ALL_COLOR_MODES).toEqual([
      'anatomical',
      'function',
      'laterality',
      'region',
      'preset',
    ])
  })

  it('trennt die vier Basis-Modi vom figur-spezifischen Preset-Modus', () => {
    expect(BASE_COLOR_MODE_DEFINITIONS.map((definition) => definition.mode)).toEqual([
      'anatomical',
      'function',
      'laterality',
      'region',
    ])
    expect(BASE_COLOR_MODE_DEFINITIONS.map((definition) => definition.label)).toEqual([
      'Anatomisch',
      'Funktionssystem',
      'Lateralität',
      'Region',
    ])
    expect(COLOR_MODE_LABEL.preset).toBe('Figur')
  })
})
