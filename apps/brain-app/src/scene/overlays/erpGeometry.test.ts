import { describe, it, expect } from 'vitest'
import { toPolyline } from './erpGeometry'

describe('toPolyline', () => {
  it('mappt Punkte in den SVG-Viewport (y invertiert)', () => {
    const pts = toPolyline([[1, 0], [2, 5], [3, -5]], { w: 100, h: 40 })
    // x linear 0..100; y: max(5)->0, min(-5)->40, 0->20
    expect(pts[0]).toEqual([0, 20])
    expect(pts[1]).toEqual([50, 0])
    expect(pts[2]).toEqual([100, 40])
  })
})
