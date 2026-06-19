import { describe, expect, it } from 'vitest'
import {
  BRAIN_MODEL_OPTIONS,
  brainModelReviewSearch,
  resolveBrainModelOptionFromSearch,
  resolveBrainModelOptionId,
} from './brainModelOptions'

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
})
