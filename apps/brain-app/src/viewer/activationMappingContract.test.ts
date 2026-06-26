import { describe, expect, it } from 'vitest'
import { parseActivationResult, ACTIVATION_PIPELINE_VERSION } from './activationMappingContract'

const meta = {
  pipelineVersion: ACTIVATION_PIPELINE_VERSION,
  brainModelId: 'mni-desktop-r18',
  montage: '10-20-19ch',
  band: 'alpha',
  timeWindow: { startMs: 0, endMs: 2000 },
}

const roiValue = { ...meta, kind: 'roi-value', atlasId: 'dkt', values: { 'rostralmiddlefrontal': 1.4 } }
const zScore = {
  ...meta,
  kind: 'z-score',
  atlasId: 'dkt',
  normReference: 'projektdefinierte Referenz N=40',
  zScores: { 'rostralmiddlefrontal': 2.6 },
  solver: { method: 'sLORETA', version: '1.0', lambda: 0.05 },
}

describe('activationMappingContract', () => {
  it('parst eine roi-value-Stufe und setzt MNI als Default-Space', () => {
    const r = parseActivationResult(roiValue)
    expect(r.kind).toBe('roi-value')
    expect(r.space).toBe('mni152')
  })

  it('parst eine z-score-Stufe mit Normreferenz + Solver-Metadaten', () => {
    const r = parseActivationResult(zScore)
    expect(r.kind).toBe('z-score')
    if (r.kind === 'z-score') expect(r.normReference).toContain('N=40')
  })

  it('lehnt z-score ohne Normreferenz ab (keine proprietaere Annahme)', () => {
    const { normReference, ...noNorm } = zScore
    void normReference
    expect(() => parseActivationResult(noNorm)).toThrow(/normReference/)
  })

  it('wirft bei unbekanntem Frequenzband', () => {
    expect(() => parseActivationResult({ ...roiValue, band: 'mu' })).toThrow()
  })

  it('wirft bei fehlender brainModelId (nicht renderbar ohne Metadaten)', () => {
    const { brainModelId, ...noModel } = roiValue
    void brainModelId
    expect(() => parseActivationResult(noModel)).toThrow()
  })

  it('wirft bei umgekehrtem Zeitfenster', () => {
    expect(() => parseActivationResult({ ...roiValue, timeWindow: { startMs: 2000, endMs: 0 } })).toThrow()
  })

  it('wirft bei unbekannter Pipeline-Stufe', () => {
    expect(() => parseActivationResult({ ...meta, kind: 'fourier' })).toThrow()
  })

  it('wirft bei leerer Kanalliste in raw-eeg', () => {
    expect(() => parseActivationResult({ ...meta, kind: 'raw-eeg', channels: [], sampleRateHz: 256 })).toThrow()
  })
})
