import { describe, it, expect } from 'vitest'
import { parseLocation, replaceCanonicalLocation, toCanonicalQuery, toConfigQuery, toQuery } from './router'

describe('router', () => {
  it('parst scene + step', () => {
    expect(parseLocation('?scene=p3a&step=2')).toEqual({ sceneId: 'p3a', configName: null, step: 2 })
  })
  it('default step=0 wenn fehlend', () => {
    expect(parseLocation('?scene=vcpt')).toEqual({ sceneId: 'vcpt', configName: null, step: 0 })
  })
  it('normalisiert ungueltige step-Werte auf 0', () => {
    expect(parseLocation('?scene=vcpt&step=-1').step).toBe(0)
    expect(parseLocation('?scene=vcpt&step=1.5').step).toBe(0)
    expect(parseLocation('?scene=vcpt&step=Infinity').step).toBe(0)
    expect(parseLocation('?scene=vcpt&step=9007199254740993').step).toBe(0)
  })
  it('serialisiert zurueck', () => {
    expect(toQuery('p3a', 2)).toBe('?scene=p3a&step=2')
  })
  it('roundtript kanonische Config- und Scene-Links', () => {
    const query = toCanonicalQuery({ configName: 'p3a-konfliktmonitoring', sceneId: 'p3a-konfliktmonitoring', step: 1 })
    expect(query).toBe('?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=1')
    expect(parseLocation(query)).toEqual({ configName: 'p3a-konfliktmonitoring', sceneId: 'p3a-konfliktmonitoring', step: 1 })
  })
  it('serialisiert reine Figure-Config-Links', () => {
    expect(toConfigQuery('basalganglienschleifen')).toBe('?config=basalganglienschleifen')
  })
  it('wirft fuer leere kanonische Links', () => {
    expect(() => toCanonicalQuery({})).toThrow(/sceneId oder configName/)
  })
  it('replaceCanonicalLocation schreibt URL und signalisiert URL-Wechsel', () => {
    let fired = 0
    const onChange = () => { fired++ }
    window.addEventListener('brain-app:urlchange', onChange)
    try {
      expect(replaceCanonicalLocation({ configName: 'vcpt', sceneId: 'vcpt', step: 0 })).toBe('?config=vcpt&scene=vcpt&step=0')
      expect(window.location.search).toBe('?config=vcpt&scene=vcpt&step=0')
      expect(fired).toBe(1)
    } finally {
      window.removeEventListener('brain-app:urlchange', onChange)
    }
  })
})
