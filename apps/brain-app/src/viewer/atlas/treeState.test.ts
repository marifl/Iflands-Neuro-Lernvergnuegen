import { describe, it, expect } from 'vitest'
import { groupEnabledState, scopeKeyForArea, scopeKeyForGroup, scopeKeyForAtlas, scopeKeyForAxis } from './treeState'

describe('groupEnabledState: all/some/none', () => {
  const enabled = new Set(['a', 'b'])
  const isOn = (id: string) => enabled.has(id)
  it('all wenn alle an', () => {
    expect(groupEnabledState(['a', 'b'], isOn)).toBe('all')
  })
  it('none wenn keiner an', () => {
    expect(groupEnabledState(['x', 'y'], isOn)).toBe('none')
  })
  it('some wenn gemischt', () => {
    expect(groupEnabledState(['a', 'x'], isOn)).toBe('some')
  })
  it('none bei leerer Liste', () => {
    expect(groupEnabledState([], isOn)).toBe('none')
  })
})

describe('scopeKey-Bau', () => {
  it('area/group/atlas/axis', () => {
    expect(scopeKeyForArea('julich:area-44:l')).toBe('area:julich:area-44:l')
    expect(scopeKeyForGroup('julich', 'frontal')).toBe('group:julich:frontal')
    expect(scopeKeyForAtlas('julich')).toBe('atlas:julich')
    expect(scopeKeyForAxis('cyto')).toBe('axis:cyto')
  })
})
