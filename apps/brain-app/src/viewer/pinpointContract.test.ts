import { describe, expect, it } from 'vitest'
import { assertPinpointDrawable, parsePinpointInput, type PinpointResult } from './pinpointContract'
import type { VertexPickTarget } from './pickTargetContract'

const input = {
  inputSpace: 'mni152',
  targetModelId: 'mni-desktop-r18',
  coords: [-42, 30, 28] as [number, number, number],
  uncertainty: { kind: 'radius', radiusMm: 5 },
}

function resultWith(target: VertexPickTarget): PinpointResult {
  return { input: parsePinpointInput(input), target, transformChain: [], warnings: [] }
}

const validVertex: VertexPickTarget = {
  kind: 'vertex',
  brainModelId: 'mni-desktop-r18',
  spaceId: 'mni152',
  validationStatus: 'valid',
  coords: [-42, 30, 28],
  vertexIndex: 1234,
  distanceMm: 1.2,
  normal: [0, 0, 1],
}

describe('pinpointContract', () => {
  it('parst eine gueltige Labor-Eingabe', () => {
    expect(parsePinpointInput(input).inputSpace).toBe('mni152')
  })

  it('lehnt unbekannten Eingaberaum blockierend ab', () => {
    expect(() => parsePinpointInput({ ...input, inputSpace: 'colin27' })).toThrow()
  })

  it('wirft ohne Lokalisationsangabe (coords/roiId/electrodeId)', () => {
    const { coords, ...noLoc } = input
    void coords
    expect(() => parsePinpointInput(noLoc)).toThrow(/coords, roiId oder electrodeId/)
  })

  it('wirft bei negativem Unsicherheits-Radius', () => {
    expect(() => parsePinpointInput({ ...input, uncertainty: { kind: 'radius', radiusMm: -3 } })).toThrow()
  })

  it('akzeptiert eine valide Projektion innerhalb des Distanzlimits', () => {
    expect(() => assertPinpointDrawable(resultWith(validVertex))).not.toThrow()
  })

  it('wirft bei Projektionsdistanz ueber dem Limit (kein Nearest-Neighbor-Fallback)', () => {
    expect(() => assertPinpointDrawable(resultWith({ ...validVertex, distanceMm: 25 }))).toThrow(/Limit/)
  })

  it('wirft bei nicht-validem Ziel-Status', () => {
    expect(() => assertPinpointDrawable(resultWith({ ...validVertex, validationStatus: 'ambiguous' }))).toThrow()
  })
})
