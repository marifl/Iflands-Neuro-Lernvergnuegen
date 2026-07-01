import { describe, it, expect } from 'vitest'
import {
  enterPresentationSequence,
  leavePresentationAndRestore,
  navigateToLearnFromScene,
  parseAtlasFocusFromSearch,
  parseLocation,
  replaceAppModeQuery,
  replaceCanonicalLocation,
  toCanonicalQuery,
  toConfigQuery,
  toQuery,
} from './router'

const PRESENTATION_RETURN_KEY = 'brain-app:presentation-return'

describe('router', () => {
  beforeEach(() => {
    sessionStorage.removeItem(PRESENTATION_RETURN_KEY)
  })

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
  it('roundtript Presentation-Sequenzlinks', () => {
    const query = toCanonicalQuery({
      sequenceKind: 'presentation',
      sequenceName: 'kapitel11-vorlesung',
      configName: 'vcpt',
      sceneId: 'vcpt',
      step: 2,
    })
    expect(query).toBe('?sequence=presentation.kapitel11-vorlesung&config=vcpt&scene=vcpt&step=2')
    expect(parseLocation(query)).toEqual({
      sequenceKind: 'presentation',
      sequenceName: 'kapitel11-vorlesung',
      configName: 'vcpt',
      sceneId: 'vcpt',
      step: 2,
    })
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

  it('replaceCanonicalLocation erhaelt Area-Scope-Overrides fuer dieselbe Config', () => {
    window.history.replaceState(null, '', '/?config=broca-areal&scene=broca-areal&off=julich%3Aarea-44%3Al')
    expect(replaceCanonicalLocation({ configName: 'broca-areal', sceneId: 'broca-areal', step: 0 })).toBe(
      '?config=broca-areal&scene=broca-areal&step=0&off=julich%3Aarea-44%3Al',
    )
  })

  it('replaceCanonicalLocation verwirft alte Area-Scope-Overrides beim Config-Wechsel', () => {
    window.history.replaceState(null, '', '/?config=broca-areal&scene=broca-areal&off=julich%3Aarea-44%3Al')
    expect(replaceCanonicalLocation({ configName: 'vcpt', sceneId: 'vcpt', step: 0 })).toBe('?config=vcpt&scene=vcpt&step=0')
  })

  it('replaceAppModeQuery setzt mode fuer Reload', () => {
    window.history.replaceState(null, '', '/')
    expect(replaceAppModeQuery('atlas')).toBe('?mode=atlas')
    expect(window.location.search).toBe('?mode=atlas')
  })

  it('replaceAppModeQuery erhaelt bestehende Params und setzt Atlas-Fokus', () => {
    window.history.replaceState(null, '', '/?mode=explore&preset=explorer&off=julich%3Aarea-44%3Al')
    expect(replaceAppModeQuery('atlas', { atlasFocus: { layer: 'dkt', name: 'superiorfrontal' } })).toBe(
      '?mode=atlas&preset=explorer&off=julich%3Aarea-44%3Al&atlasLayer=dkt&atlasArea=superiorfrontal',
    )
  })

  it('parseAtlasFocusFromSearch liest Atlas-Fokus aus der URL', () => {
    expect(parseAtlasFocusFromSearch('?mode=atlas&atlasLayer=dkt&atlasArea=superiorfrontal')).toEqual({
      layer: 'dkt',
      name: 'superiorfrontal',
    })
    expect(parseAtlasFocusFromSearch('?mode=explore')).toBeNull()
  })

  it('enterPresentationSequence merkt Lernposition und wechselt Sequenz', () => {
    window.history.replaceState(null, '', '/?config=vcpt&scene=vcpt&step=2')
    enterPresentationSequence('kapitel11-vorlesung')
    expect(window.location.search).toBe('?sequence=presentation.kapitel11-vorlesung')
    expect(sessionStorage.getItem(PRESENTATION_RETURN_KEY)).toContain('vcpt')
    leavePresentationAndRestore()
    expect(window.location.search).toBe('?config=vcpt&scene=vcpt&step=2')
    expect(sessionStorage.getItem(PRESENTATION_RETURN_KEY)).toBeNull()
  })

  it('navigateToLearnFromScene entfernt mode und setzt kanonische Lern-URL', () => {
    window.history.replaceState(null, '', '/?mode=explore')
    navigateToLearnFromScene({ configName: 'vcpt', sceneId: 'vcpt', step: 1 })
    expect(window.location.search).toBe('?config=vcpt&scene=vcpt&step=1')
  })

  it('leavePresentationAndRestore ohne Bookmark entfernt sequence', () => {
    window.history.replaceState(null, '', '/?sequence=presentation.kapitel11-vorlesung')
    leavePresentationAndRestore()
    expect(window.location.search).not.toContain('sequence=')
  })
})
