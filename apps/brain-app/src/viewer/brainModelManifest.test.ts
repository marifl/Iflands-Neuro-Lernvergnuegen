import { describe, expect, it } from 'vitest'
import { parseBrainModelManifest, BRAIN_MODEL_MANIFEST_VERSION } from './brainModelManifest'

const valid = {
  schemaVersion: BRAIN_MODEL_MANIFEST_VERSION,
  id: 'mni152-desktop',
  label: 'MNI152 Desktop',
  modelVersion: 'r18',
  license: 'CC-BY-4.0',
  space: 'mni152',
  units: 'mm',
  orientation: 'RAS',
  hemispheres: ['L', 'R'],
  files: [{ role: 'cortex-surface', path: '/assets/brain-models/mni152/mni152-desktop-r18.glb' }],
}

describe('brainModelManifest', () => {
  it('parst ein vollstaendiges Manifest', () => {
    expect(parseBrainModelManifest(valid).space).toBe('mni152')
  })

  it('wirft bei unbekanntem Space', () => {
    expect(() => parseBrainModelManifest({ ...valid, space: 'colin27' })).toThrow()
  })

  it('wirft bei ungueltiger Einheit', () => {
    expect(() => parseBrainModelManifest({ ...valid, units: 'inch' })).toThrow()
  })

  it('wirft bei ungueltiger Orientierung', () => {
    expect(() => parseBrainModelManifest({ ...valid, orientation: 'XYZ' })).toThrow()
  })

  it('wirft bei leerer Datei-Liste', () => {
    expect(() => parseBrainModelManifest({ ...valid, files: [] })).toThrow()
  })

  it('wirft bei unbekannter Datei-Rolle', () => {
    expect(() => parseBrainModelManifest({ ...valid, files: [{ role: 'texture', path: '/x' }] })).toThrow()
  })

  it('wirft bei falscher Schemaversion', () => {
    expect(() => parseBrainModelManifest({ ...valid, schemaVersion: 99 })).toThrow()
  })
})
