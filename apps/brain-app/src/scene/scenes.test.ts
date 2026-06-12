import { describe, it, expect } from 'vitest'
import { SceneSchema } from './types'

const valid = {
  id: 'p3a', figure: '11-15(1)', section: '11.4', author: 'ifland', order: 40,
  title: 'P3a', brain: { regions: ['acc-cingulum'], camera: 'medial-midline' },
  overlay: { kind: 'erp', position: 'right', size: 'md',
             data: { x: 'ms', series: [{ label: 'No-go', points: [[1, 0], [2, -1]] }], markers: [] } },
  companion: { summary: 'x', sources: [] },
}

describe('SceneSchema', () => {
  it('akzeptiert eine valide Szene', () => {
    expect(SceneSchema.parse(valid).id).toBe('p3a')
  })
  it('lehnt unbekannten overlay.kind laut ab', () => {
    expect(() => SceneSchema.parse({ ...valid, overlay: { ...valid.overlay, kind: 'xxx' } })).toThrow()
  })
})
