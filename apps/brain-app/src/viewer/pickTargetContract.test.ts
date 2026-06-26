import { describe, expect, it } from 'vitest'
import {
  assertDrawablePickTarget,
  isSubcortexPick,
  isVertexPick,
  type PickTarget,
} from './pickTargetContract'

const vertexPick: PickTarget = {
  kind: 'vertex',
  brainModelId: 'taro',
  spaceId: 'taro',
  validationStatus: 'valid',
  coords: [1, 2, 3],
  vertexIndex: 42,
  distanceMm: 0.5,
  normal: [0, 0, 1],
}

const subcortexPick: PickTarget = {
  kind: 'subcortex-mesh',
  brainModelId: 'mni-desktop-r18',
  spaceId: 'mni152',
  validationStatus: 'out-of-bounds',
  structureId: 'thalamus',
  side: 'L',
  label: 'Thalamus',
}

describe('pickTargetContract', () => {
  it('Guards unterscheiden die Pick-Arten', () => {
    expect(isVertexPick(vertexPick)).toBe(true)
    expect(isSubcortexPick(vertexPick)).toBe(false)
    expect(isSubcortexPick(subcortexPick)).toBe(true)
  })

  it('narrowt ein Vertex-Target typsicher', () => {
    if (isVertexPick(vertexPick)) {
      expect(vertexPick.vertexIndex).toBe(42)
      expect(vertexPick.distanceMm).toBe(0.5)
    }
  })

  it('assertDrawablePickTarget akzeptiert valide Targets', () => {
    expect(() => assertDrawablePickTarget(vertexPick)).not.toThrow()
  })

  it('assertDrawablePickTarget wirft bei nicht-validem Status (kein stiller Skip)', () => {
    expect(() => assertDrawablePickTarget(subcortexPick)).toThrow(/out-of-bounds/)
  })
})
