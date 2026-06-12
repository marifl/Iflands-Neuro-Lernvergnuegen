import { describe, it, expect } from 'vitest'
import { regionsToMeshes } from './brainBridge'

describe('regionsToMeshes', () => {
  it('vereinigt die Mesh-Sets mehrerer Regionen ohne Duplikate', () => {
    const meshes = regionsToMeshes(['acc-cingulum', 'sma-presma'])
    expect(meshes).toContain('left-cingulate-gyrus')
    expect(new Set(meshes).size).toBe(meshes.length) // dedupe
  })
  it('wirft laut bei unbekannter Region (kein stiller Fallback)', () => {
    expect(() => regionsToMeshes(['gibtsnicht'])).toThrow(/unbekannte Region: gibtsnicht/)
  })
})
