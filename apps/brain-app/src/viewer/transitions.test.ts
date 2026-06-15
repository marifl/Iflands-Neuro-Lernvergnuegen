import { describe, expect, it } from 'vitest'
import { approachTransitionValue, frameTransitionAlpha } from './transitions'

describe('transition helpers', () => {
  it('skaliert den Lerp-Faktor delta-basiert', () => {
    expect(frameTransitionAlpha(1 / 60)).toBeCloseTo(0.18)
    expect(frameTransitionAlpha(1 / 30)).toBeGreaterThan(frameTransitionAlpha(1 / 60))
  })

  it('naehrt Werte an und snappt nahe am Ziel', () => {
    expect(approachTransitionValue(0, 1, 1 / 60)).toBeCloseTo(0.18)
    expect(approachTransitionValue(0.995, 1, 1 / 60)).toBe(1)
  })
})
