import { describe, it, expect } from 'vitest'
import { parseLocation, toQuery } from './router'

describe('router', () => {
  it('parst scene + step', () => {
    expect(parseLocation('?scene=p3a&step=2')).toEqual({ sceneId: 'p3a', step: 2 })
  })
  it('default step=0 wenn fehlend', () => {
    expect(parseLocation('?scene=vcpt')).toEqual({ sceneId: 'vcpt', step: 0 })
  })
  it('serialisiert zurueck', () => {
    expect(toQuery('p3a', 2)).toBe('?scene=p3a&step=2')
  })
})
