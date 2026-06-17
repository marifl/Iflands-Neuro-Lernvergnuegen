import { describe, it, expect, beforeEach } from 'vitest'
import { ATLAS_CONFIG_OVERRIDES_CHANGE_EVENT } from './atlasConfig'
import { useAtlasConfigStore, LS_KEY } from './atlasConfigStore'

beforeEach(() => {
  localStorage.clear()
  useAtlasConfigStore.getState().reset()
})

describe('atlasConfigStore', () => {
  it('toggleScope zyklisch: absent -> true -> false -> absent', () => {
    const s = () => useAtlasConfigStore.getState()
    s().toggleScope('area:julich:area-44:l')
    expect(s().scopes['area:julich:area-44:l']).toBe(true)
    s().toggleScope('area:julich:area-44:l')
    expect(s().scopes['area:julich:area-44:l']).toBe(false)
    s().toggleScope('area:julich:area-44:l')
    expect('area:julich:area-44:l' in s().scopes).toBe(false)
  })

  it('setScope/clearScope explizit', () => {
    const s = () => useAtlasConfigStore.getState()
    s().setScope('axis:cyto', false)
    expect(s().scopes['axis:cyto']).toBe(false)
    s().clearScope('axis:cyto')
    expect('axis:cyto' in s().scopes).toBe(false)
  })

  it('setPreset/setConfiguration', () => {
    const s = () => useAtlasConfigStore.getState()
    s().setPreset('voll')
    s().setConfiguration('broca-areal')
    expect(s().preset).toBe('voll')
    expect(s().configuration).toBe('broca-areal')
  })

  it('persistiert nach localStorage (Roundtrip)', () => {
    let events = 0
    window.addEventListener(ATLAS_CONFIG_OVERRIDES_CHANGE_EVENT, () => { events += 1 }, { once: true })

    useAtlasConfigStore.getState().setScope('area:dkt:parstriangularis:l', true)

    const raw = localStorage.getItem(LS_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.scopes['area:dkt:parstriangularis:l']).toBe(true)
    expect(events).toBe(1)
  })

  it('reset leert scopes/preset/configuration', () => {
    const s = () => useAtlasConfigStore.getState()
    s().setScope('axis:cyto', true)
    s().setPreset('voll')
    s().reset()
    expect(s().scopes).toEqual({})
    expect(s().preset).toBe(null)
    expect(s().configuration).toBe(null)
  })
})
