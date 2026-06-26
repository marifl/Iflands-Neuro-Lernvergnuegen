import { describe, expect, it } from 'vitest'
import {
  assertOverlayMatchesBrainModel,
  BRAIN_MODEL_OPTIONS,
  brainModelReviewSearch,
  getBrainModelOption,
  resolveBrainModelOptionFromSearch,
  resolveBrainModelOptionId,
} from './brainModelOptions'
import type { LabOverlay } from './overlayContract'

function overlay(brainModelId: string, space: LabOverlay['space']): LabOverlay {
  return {
    version: 1,
    id: 'ov-1',
    label: 'Test-Overlay',
    brainModelId,
    space,
    provenance: { source: 'Test' },
    layers: [{ kind: 'discrete', atlasId: 'dkt', unit: 'unitless', regions: [{ id: 'r', label: 'R' }] }],
    callouts: [],
  }
}

describe('brainModelOptions', () => {
  it('laedt TARO als Default ohne URL-Parameter', () => {
    expect(resolveBrainModelOptionId('')).toBe('taro')
    expect(resolveBrainModelOptionFromSearch('').url).toBe('/assets/bodyparts3d/brain.glb')
  })

  it('parst MNI-Review-Modelle aus dem URL-Parameter', () => {
    const option = resolveBrainModelOptionFromSearch('?brainModel=mni-mobile-r06&mode=explore')

    expect(option.id).toBe('mni-mobile-r06')
    expect(option.url).toBe('/assets/brain-models/mni152/mni152-mobile-r06.glb')
  })

  it('weist unbekannte Brain-Modelle laut zurueck', () => {
    expect(() => resolveBrainModelOptionId('?brainModel=mni-ghost')).toThrow(/mni-ghost/)
  })

  it('rundet Review-Links ohne andere Suchparameter zu verlieren', () => {
    expect(brainModelReviewSearch('mni-mobile-r05', '?mode=explore')).toBe('?mode=explore&brainModel=mni-mobile-r05')
    expect(brainModelReviewSearch('taro', '?mode=explore&brainModel=mni-mobile-r05')).toBe('?mode=explore')
  })

  it('registriert nur Public-Asset-URLs', () => {
    expect(BRAIN_MODEL_OPTIONS.map((option) => option.url)).toEqual(
      expect.arrayContaining([
        '/assets/bodyparts3d/brain.glb',
        '/assets/brain-models/mni152/mni152-mobile-r05.glb',
        '/assets/brain-models/mni152/mni152-mobile-r06.glb',
        '/assets/brain-models/mni152/mni152-mobile-r08.glb',
        '/assets/brain-models/mni152/mni152-desktop-r18.glb',
      ]),
    )
    expect(BRAIN_MODEL_OPTIONS.every((option) => option.url.startsWith('/assets/'))).toBe(true)
  })

  it('traegt Space-Metadaten pro Modell', () => {
    expect(getBrainModelOption('taro').space).toBe('taro')
    expect(getBrainModelOption('mni-desktop-r18').space).toBe('mni152')
    expect(BRAIN_MODEL_OPTIONS.every((option) => option.space === 'taro' || option.space === 'mni152')).toBe(true)
  })

  it('akzeptiert ein passendes Overlay', () => {
    expect(() => assertOverlayMatchesBrainModel(overlay('taro', 'taro'), 'taro')).not.toThrow()
  })

  it('lehnt Overlay mit falschem Modell blockierend ab', () => {
    expect(() => assertOverlayMatchesBrainModel(overlay('mni-mobile-r05', 'mni152'), 'taro')).toThrow(/gehoert zu Brain model/)
  })

  it('lehnt Overlay mit falschem Raum blockierend ab', () => {
    expect(() => assertOverlayMatchesBrainModel(overlay('taro', 'mni152'), 'taro')).toThrow(/Raum/)
  })
})
