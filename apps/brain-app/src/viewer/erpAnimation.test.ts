import { describe, expect, it } from 'vitest'
import { envelope, sampleCurve, type Point } from './erpAnimation'

// No-go-P3a-Kurve aus public/scenes/p3a-konfliktmonitoring.json (Maximum bei x=8, Wert 5).
const NOGO: Point[] = [
  [1, 0], [2, -1], [3, -2], [4, -1.5], [5, 0], [6, 2],
  [7, 4], [8, 5], [9, 4.5], [10, 3], [11, 1], [12, -0.5],
]

describe('sampleCurve', () => {
  it('trifft die Stuetzpunkte an den Raendern', () => {
    expect(sampleCurve(NOGO, 0)).toBe(0) // x=1 -> 0
    expect(sampleCurve(NOGO, 1)).toBe(-0.5) // x=12 -> -0.5
  })
  it('interpoliert linear dazwischen', () => {
    // Mitte zwischen x=6(2) und x=7(4): t fuer x=6.5 -> ~3
    const t = (6.5 - 1) / (12 - 1)
    expect(sampleCurve(NOGO, t)).toBeCloseTo(3, 5)
  })
  it('wirft laut bei leerer Kurve', () => {
    expect(() => sampleCurve([], 0.5)).toThrow(/keine Punkte/)
  })
})

describe('envelope', () => {
  it('ist am P3a-Maximum (~x=8) nahe 1', () => {
    const tPeak = (8 - 1) / (12 - 1)
    expect(envelope(NOGO, tPeak)).toBeCloseTo(1, 5)
  })
  it('klemmt negative Auslenkungen auf 0 (keine Quellen-Aktivierung)', () => {
    const tNeg = (3 - 1) / (12 - 1) // x=3 -> -2
    expect(envelope(NOGO, tNeg)).toBe(0)
  })
  it('bleibt im Bereich 0..1', () => {
    for (let i = 0; i <= 10; i++) {
      const e = envelope(NOGO, i / 10)
      expect(e).toBeGreaterThanOrEqual(0)
      expect(e).toBeLessThanOrEqual(1)
    }
  })
})
