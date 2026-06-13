import { describe, it, expect } from 'vitest'
import { faceToLabel, nearestCornerVertex } from './atlasPick'

describe('faceToLabel', () => {
  it('nimmt das Label des ersten Face-Vertex', () => {
    const faces = new Uint32Array([0, 1, 2, 2, 3, 4])
    const labels = new Int16Array([10, 10, 22, 22, 22])
    expect(faceToLabel(faces, labels, 0)).toBe(10) // Face 0 = [0,1,2], Vertex 0 -> Label 10
    expect(faceToLabel(faces, labels, 1)).toBe(22) // Face 1 = [2,3,4], Vertex 2 -> Label 22
  })
})

describe('nearestCornerVertex', () => {
  it('waehlt die dem Klickpunkt naechste der drei Face-Ecken', () => {
    // 3 Vertices bei x=0,10,20 (y=z=0); Klick bei x=9.6 -> naechste Ecke ist Index 1 (x=10)
    const positions = new Float32Array([0,0,0, 10,0,0, 20,0,0])
    expect(nearestCornerVertex(positions, 0, 1, 2, [9.6, 0, 0])).toBe(1)
    expect(nearestCornerVertex(positions, 0, 1, 2, [1.0, 0, 0])).toBe(0)
    expect(nearestCornerVertex(positions, 0, 1, 2, [19.0, 0, 0])).toBe(2)
  })
})
