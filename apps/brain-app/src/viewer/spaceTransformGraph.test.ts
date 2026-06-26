import { describe, expect, it } from 'vitest'
import { assertSpaceCompatible, findTransformPath } from './spaceTransformGraph'
import type { BrainSpace } from './overlayContract'

describe('spaceTransformGraph', () => {
  it('liefert leeren Pfad fuer identischen Raum', () => {
    expect(findTransformPath('taro', 'taro')).toEqual([])
  })

  it('findet die direkte Kante mni152 -> fsaverage', () => {
    const path = findTransformPath('mni152', 'fsaverage')
    expect(path).toHaveLength(1)
    expect(path[0]).toMatchObject({ method: 'affine-mni2fs', residualMm: 2.0 })
  })

  it('findet den 2-Kanten-Pfad mni152 -> taro ueber fsaverage', () => {
    const path = findTransformPath('mni152', 'taro')
    expect(path.map((e) => e.to)).toEqual(['fsaverage', 'taro'])
  })

  it('invertiert Kanten bidirektional (taro -> mni152)', () => {
    const path = findTransformPath('taro', 'mni152')
    expect(path.map((e) => `${e.from}->${e.to}`)).toEqual(['taro->fsaverage', 'fsaverage->mni152'])
  })

  it('wirft laut bei unbekanntem Raum (kein stilles Umrechnen)', () => {
    expect(() => findTransformPath('eeg-10-20' as BrainSpace, 'taro')).toThrow(/unbekannter Raum/)
  })

  it('assertSpaceCompatible wirft bei unbekanntem Raum', () => {
    expect(() => assertSpaceCompatible('taro', 'colin27' as BrainSpace)).toThrow()
  })
})
