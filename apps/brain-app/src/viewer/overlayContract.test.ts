import { describe, expect, it } from 'vitest'
import { parseLabOverlay, serializeLabOverlay, OVERLAY_CONTRACT_VERSION } from './overlayContract'

const discreteOverlay = {
  version: OVERLAY_CONTRACT_VERSION,
  id: 'tdcs-study-7',
  label: 'tDCS DLPFC-Aktivierung',
  brainModelId: 'taro',
  space: 'taro',
  provenance: { source: 'Studie X 2026', method: 'tDCS', subjectCount: 24 },
  layers: [
    {
      kind: 'discrete',
      atlasId: 'dkt',
      regions: [{ id: 'dkt-lh-rostralmiddlefrontal', label: 'DLPFC links', value: 3.1 }],
    },
  ],
}

const continuousOverlay = {
  version: OVERLAY_CONTRACT_VERSION,
  id: 'fmri-bold-1',
  label: 'fMRI BOLD',
  brainModelId: 'mni152-standard',
  space: 'mni152',
  provenance: { source: 'Lab Y' },
  layers: [
    {
      kind: 'continuous',
      atlasId: 'julich',
      scale: { min: -5, max: 5, unit: 'z-score', colormap: 'diverging', threshold: 2 },
      values: { 'julich-area-44-l': 3.4, 'julich-area-45-l': -2.1 },
    },
  ],
  callouts: [{ regionId: 'julich-area-44-l', text: 'Peak-Aktivierung' }],
}

describe('overlayContract', () => {
  it('parst ein diskretes Overlay und setzt Defaults', () => {
    const parsed = parseLabOverlay(discreteOverlay)
    expect(parsed.layers[0]).toMatchObject({ kind: 'discrete', unit: 'unitless' })
    expect(parsed.callouts).toEqual([])
  })

  it('parst ein kontinuierliches Overlay mit Skala + Schwelle', () => {
    const parsed = parseLabOverlay(continuousOverlay)
    const layer = parsed.layers[0]
    expect(layer.kind).toBe('continuous')
    if (layer.kind === 'continuous') {
      expect(layer.scale.clamp).toBe(true)
      expect(layer.scale.threshold).toBe(2)
    }
  })

  it('serialisiert validiert und round-trippt', () => {
    const json = serializeLabOverlay(parseLabOverlay(continuousOverlay))
    expect(parseLabOverlay(JSON.parse(json)).id).toBe('fmri-bold-1')
  })

  it('wirft bei uneindeutigem/unbekanntem Space', () => {
    expect(() => parseLabOverlay({ ...discreteOverlay, space: 'colin27' })).toThrow()
  })

  it('wirft bei unbekanntem Atlas', () => {
    expect(() =>
      parseLabOverlay({ ...discreteOverlay, layers: [{ kind: 'discrete', atlasId: 'aal', regions: discreteOverlay.layers[0].regions }] }),
    ).toThrow()
  })

  it('wirft bei leerer Region-ID', () => {
    expect(() =>
      parseLabOverlay({ ...discreteOverlay, layers: [{ kind: 'discrete', atlasId: 'dkt', regions: [{ id: '', label: 'x' }] }] }),
    ).toThrow()
  })

  it('wirft bei leerer Layer-Liste', () => {
    expect(() => parseLabOverlay({ ...discreteOverlay, layers: [] })).toThrow()
  })

  it('wirft wenn max <= min', () => {
    const bad = { ...continuousOverlay, layers: [{ ...continuousOverlay.layers[0], scale: { min: 5, max: 5, unit: 'z-score', colormap: 'hot' } }] }
    expect(() => parseLabOverlay(bad)).toThrow()
  })

  it('wirft wenn threshold ausserhalb [min, max]', () => {
    const bad = { ...continuousOverlay, layers: [{ ...continuousOverlay.layers[0], scale: { min: 0, max: 4, unit: 'z-score', colormap: 'hot', threshold: 9 } }] }
    expect(() => parseLabOverlay(bad)).toThrow()
  })

  it('wirft bei leerem kontinuierlichem Wertefeld', () => {
    const bad = { ...continuousOverlay, layers: [{ ...continuousOverlay.layers[0], values: {} }] }
    expect(() => parseLabOverlay(bad)).toThrow()
  })

  it('wirft bei falscher Vertragsversion', () => {
    expect(() => parseLabOverlay({ ...discreteOverlay, version: 99 })).toThrow()
  })
})
