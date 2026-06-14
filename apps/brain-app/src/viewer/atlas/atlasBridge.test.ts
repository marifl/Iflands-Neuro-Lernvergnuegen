import { describe, it, expect } from 'vitest'
import { bridgeFor, julichBridgeFor } from './atlasBridge'

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

describe('julichBridgeFor', () => {
  it('mappt Julich-Carve-Slug (side-gestrippt) auf fsaverage-Julich-Areal', () => {
    expect(julichBridgeFor('julich3-area-44-ifg-l')).toEqual({ layer: 'julich', name: 'Area 44 (IFG)' })
    expect(julichBridgeFor('julich3-area-45-ifg-r')).toEqual({ layer: 'julich', name: 'Area 45 (IFG)' })
  })

  it('gibt null fuer GapMaps (kein praezises Areal) und null-Input', () => {
    expect(julichBridgeFor('julich3-frontal-i-1-gapmap-l')).toBeNull()
    expect(julichBridgeFor(null)).toBeNull()
  })
})
