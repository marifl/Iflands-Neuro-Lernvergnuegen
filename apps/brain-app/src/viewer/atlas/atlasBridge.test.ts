import { describe, it, expect } from 'vitest'
import { bridgeFor } from './atlasBridge'

describe('bridgeFor', () => {
  it('mappt TARO-Gyrus (side-gestrippt) auf DKT-Areal', () => {
    expect(bridgeFor('left-middle-frontal-gyrus')).toEqual({ layer: 'dkt', name: 'rostralmiddlefrontal' })
    expect(bridgeFor('right-superior-frontal-gyrus')).toEqual({ layer: 'dkt', name: 'superiorfrontal' })
  })

  it('strippt die -v2-Variante', () => {
    expect(bridgeFor('left-medial-orbital-gyrus-v2')).toEqual({ layer: 'dkt', name: 'medialorbitofrontal' })
  })

  it('mappt Carve-Sub-Patches mit aparc-identischem Namen', () => {
    expect(bridgeFor('parsopercularis')).toEqual({ layer: 'dkt', name: 'parsopercularis' })
  })

  it('gibt null fuer nicht verlinkte Regionen und null-Input', () => {
    expect(bridgeFor('left-thalamus')).toBeNull()
    expect(bridgeFor('left-occipital-pole')).toBeNull()
    expect(bridgeFor(null)).toBeNull()
  })
})
