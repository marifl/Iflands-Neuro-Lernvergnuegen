import { describe, it, expect } from 'vitest'
import { buildLutTextureData, labelName, type AtlasLut } from './atlasLut'

const lut: AtlasLut = {
  0: { rgb: [40, 40, 46], name: '—', medial: true },
  1: { rgb: [200, 100, 50], name: 'G_temp_sup' },
  3: { rgb: [60, 180, 90], name: 'S_central' },
}

describe('atlasLut', () => {
  it('baut eine luekenlose RGBA-LUT bis zur hoechsten ID', () => {
    const { data, size } = buildLutTextureData(lut)
    expect(size).toBe(4) // hoechste ID 3 -> 4 Eintraege (0..3)
    expect(Array.from(data.slice(0, 4))).toEqual([40, 40, 46, 255]) // ID 0
    expect(Array.from(data.slice(4, 8))).toEqual([200, 100, 50, 255]) // ID 1
    expect(Array.from(data.slice(8, 12))).toEqual([0, 0, 0, 0]) // ID 2 (Luecke) -> transparent
    expect(Array.from(data.slice(12, 16))).toEqual([60, 180, 90, 255]) // ID 3
  })
  it('liefert Namen, leerer String fuer unbekannte ID', () => {
    expect(labelName(lut, 1)).toBe('G_temp_sup')
    expect(labelName(lut, 99)).toBe('')
  })
})
