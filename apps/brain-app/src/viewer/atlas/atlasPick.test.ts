import { describe, it, expect } from 'vitest'
import { faceToLabel } from './atlasPick'

describe('faceToLabel', () => {
  it('nimmt das Label des ersten Face-Vertex', () => {
    const faces = new Uint32Array([0, 1, 2, 2, 3, 4])
    const labels = new Int16Array([10, 10, 22, 22, 22])
    expect(faceToLabel(faces, labels, 0)).toBe(10) // Face 0 = [0,1,2], Vertex 0 -> Label 10
    expect(faceToLabel(faces, labels, 1)).toBe(22) // Face 1 = [2,3,4], Vertex 2 -> Label 22
  })
})
