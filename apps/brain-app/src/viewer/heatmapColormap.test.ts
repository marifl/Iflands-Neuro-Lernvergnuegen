import { describe, expect, it } from 'vitest'
import { applyColormap, colormapRgb, rgbToCss } from './heatmapColormap'
import type { ContinuousScale } from './overlayContract'

const diverging: ContinuousScale = { min: -5, max: 5, unit: 'z-score', colormap: 'diverging', clamp: true }

describe('heatmapColormap', () => {
  it('diverging: niedriger Wert ist blau, hoher Wert ist rot', () => {
    const [rLow, , bLow] = applyColormap(-5, diverging)
    const [rHigh, , bHigh] = applyColormap(5, diverging)
    expect(bLow).toBeGreaterThan(rLow)
    expect(rHigh).toBeGreaterThan(bHigh)
  })

  it('grayscale: Mittelwert ist neutralgrau (r=g=b)', () => {
    const [r, g, b] = colormapRgb('grayscale', 0.5)
    expect(r).toBeCloseTo(0.5)
    expect(g).toBe(r)
    expect(b).toBe(r)
  })

  it('hot: Maximum ist nahezu weiss', () => {
    const [r, g, b] = colormapRgb('hot', 1)
    expect(Math.min(r, g, b)).toBeGreaterThan(0.9)
  })

  it('threshold: Werte unter dem Schwellwert sind No-Data (alpha 0)', () => {
    const withThreshold: ContinuousScale = { ...diverging, threshold: 2 }
    expect(applyColormap(1, withThreshold)[3]).toBe(0)
    expect(applyColormap(3, withThreshold)[3]).toBe(1)
  })

  it('clamp: Wert ueber max ergibt dieselbe Farbe wie max', () => {
    expect(applyColormap(99, diverging)).toEqual(applyColormap(5, diverging))
  })

  it('in-range Werte sind opak', () => {
    expect(applyColormap(0, diverging)[3]).toBe(1)
  })

  it('rgbToCss formatiert auf 0..255', () => {
    expect(rgbToCss([0, 0.5, 1])).toBe('rgb(0, 128, 255)')
  })
})
