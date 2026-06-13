import { describe, it, expect } from 'vitest'
import { nearestCornerVertex } from './atlasPick'

describe('nearestCornerVertex', () => {
  it('waehlt die dem Klickpunkt naechste der drei Face-Ecken', () => {
    // 3 Vertices bei x=0,10,20 (y=z=0); Klick bei x=9.6 -> naechste Ecke ist Index 1 (x=10)
    const positions = new Float32Array([0,0,0, 10,0,0, 20,0,0])
    expect(nearestCornerVertex(positions, 0, 1, 2, [9.6, 0, 0])).toBe(1)
    expect(nearestCornerVertex(positions, 0, 1, 2, [1.0, 0, 0])).toBe(0)
    expect(nearestCornerVertex(positions, 0, 1, 2, [19.0, 0, 0])).toBe(2)
  })
})
