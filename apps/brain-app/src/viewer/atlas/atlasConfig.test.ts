import { describe, it, expect } from 'vitest'
import {
  resolveScopes, isAreaEnabled, buildAreaLookup, fileScopes, parseUrlScopes, computeEffectiveConfig,
  type AtlasConfigFile, type ScopeMap, type AreaLookup,
} from './atlasConfig'
import type { AtlasCatalog } from './atlasCatalog'

const FILE: AtlasConfigFile = {
  preset: 'kapitel11',
  presets: {
    kapitel11: { label_de: 'K11', scopes: { 'axis:cyto': false, 'area:julich:area-44:l': true } },
    voll: { label_de: 'Voll', scopes: { 'axis:cyto': true } },
  },
  mesh_mappings: { buckets: {}, scene_regions: {} },
  configurations: {
    'area-44-only': {
      label_de: 'Area 44',
      view: { surface: 'pial' },
      camera: { shot: 'lateral-left' },
      regions: { areas: ['julich:area-44:l'] },
      colors: { enabled: false },
      visibility: { dim_others: true },
      cuts: { enabled: false },
      overlay: { kind: 'image' },
      sequencing: { step: 'area-44-only' },
      scopes: { 'area:julich:area-45:l': false },
    },
    'broca-areal': {
      label_de: 'Broca',
      view: { surface: 'pial' },
      camera: { target: 'julich:area-45:l', shot: 'lateral-left', fit: 'target' },
      regions: { areas: ['julich:area-45:l'] },
      colors: { enabled: false },
      visibility: { dim_others: true },
      cuts: { enabled: false },
      overlay: { kind: 'image' },
      sequencing: { step: 'broca-areal' },
      scopes: { 'area:julich:area-45:l': true },
    },
  },
  presentation: {}, learning: {},
}

const LOOKUP: AreaLookup = {
  'julich:area-44:l': { atlas: 'julich', lobe: 'frontal', axis: 'cyto' },
  'julich:area-45:l': { atlas: 'julich', lobe: 'frontal', axis: 'cyto' },
  'julich:area-46:l': { atlas: 'julich', lobe: 'frontal', axis: 'cyto' },
}

const CATALOG = {
  version: '1', space_note: '', axes: [{ id: 'cyto', label_de: '', sub_de: '' }],
  atlases: [{ id: 'julich', axis: 'cyto', label_de: '', groups: [
    { id: 'frontal', label_de: '', areas: [
      { id: 'julich:area-44:l', label_de: '', side: 'L', hosts: ['inferior-frontal-gyrus'], taro_present: true, lobe: 'frontal',
        refs: { canonical_lut: { layer: 'julich', label_id: 1, hemi: 'L' }, carve: [] }, context: {},
        provenance: { source: 'julich', affine_det: null, backfill: false } },
      { id: 'julich:area-45:l', label_de: '', side: 'L', hosts: ['inferior-frontal-gyrus'], taro_present: true, lobe: 'frontal',
        refs: { canonical_lut: { layer: 'julich', label_id: 2, hemi: 'L' }, carve: [] }, context: {},
        provenance: { source: 'julich', affine_det: null, backfill: false } },
    ] },
  ] }],
} as unknown as AtlasCatalog

describe('resolveScopes: Layer-Merge pro Scope-Key', () => {
  it('localStorage ueberschreibt Datei pro Key, URL ueberschreibt localStorage', () => {
    const merged = resolveScopes(
      { 'axis:cyto': false, 'area:julich:area-44:l': true },
      { 'area:julich:area-44:l': false },
      { 'axis:cyto': true },
    )
    expect(merged['area:julich:area-44:l']).toBe(false)
    expect(merged['axis:cyto']).toBe(true)
  })
})

describe('isAreaEnabled: Vererbung Areal->Gruppe->Atlas->Achse', () => {
  it('expliziter Areal-Toggle gewinnt ueber geerbte Achse', () => {
    const scopes: ScopeMap = { 'axis:cyto': false, 'area:julich:area-44:l': true }
    expect(isAreaEnabled('julich:area-44:l', scopes, LOOKUP)).toBe(true)
  })
  it('ohne Areal-Toggle erbt das Areal von der Achse', () => {
    const scopes: ScopeMap = { 'axis:cyto': false }
    expect(isAreaEnabled('julich:area-46:l', scopes, LOOKUP)).toBe(false)
  })
  it('Gruppe schlaegt Atlas schlaegt Achse', () => {
    const scopes: ScopeMap = { 'axis:cyto': false, 'atlas:julich': false, 'group:julich:frontal': true }
    expect(isAreaEnabled('julich:area-46:l', scopes, LOOKUP)).toBe(true)
  })
  it('default false wenn nichts greift', () => {
    expect(isAreaEnabled('julich:area-46:l', {}, LOOKUP)).toBe(false)
  })
  it('wirft bei unbekanntem Areal (kein stiller Default)', () => {
    expect(() => isAreaEnabled('julich:ghost:l', {}, LOOKUP)).toThrow(/unbekannt/)
  })
})

describe('buildAreaLookup', () => {
  it('mappt Areal -> {atlas,lobe,axis}', () => {
    const lk = buildAreaLookup(CATALOG)
    expect(lk['julich:area-44:l']).toEqual({ atlas: 'julich', lobe: 'frontal', axis: 'cyto' })
  })
})

describe('fileScopes: Preset + aktive Configuration gemergt', () => {
  it('Configuration ueberschreibt Preset pro Key', () => {
    const s = fileScopes(FILE, 'voll', 'broca-areal')
    expect(s['axis:cyto']).toBe(true)
    expect(s['area:julich:area-45:l']).toBe(true)
  })
  it('wirft bei unbekanntem Preset', () => {
    expect(() => fileScopes(FILE, 'ghost', null)).toThrow(/Preset "ghost"/)
  })
  it('wirft bei unbekannter Configuration', () => {
    expect(() => fileScopes(FILE, 'voll', 'ghost')).toThrow(/Configuration "ghost"/)
  })
})

describe('parseUrlScopes', () => {
  it('liest ?on / ?off als Areal-Scopes', () => {
    const s = parseUrlScopes(new URLSearchParams('on=julich:area-44:l&off=julich:area-45:l'))
    expect(s['area:julich:area-44:l']).toBe(true)
    expect(s['area:julich:area-45:l']).toBe(false)
  })
})

describe('computeEffectiveConfig', () => {
  it('liefert preset, activeConfiguration und isAreaEnabled', () => {
    const eff = computeEffectiveConfig(
      FILE, CATALOG,
      { preset: null, configuration: 'broca-areal', scopes: {} },
      new URLSearchParams(),
    )
    expect(eff.preset).toBe('kapitel11')
    expect(eff.hasUrlConfig).toBe(false)
    expect(eff.activeConfiguration).toBe('broca-areal')
    expect(eff.configuration?.label_de).toBe('Broca')
    expect(eff.cameraTargetMeshes).toEqual(['left-inferior-frontal-gyrus'])
    expect(eff.isAreaEnabled('julich:area-44:l')).toBe(true)
  })
  it('URL-config rekonstruiert kanonisch und ignoriert persistierte lokale Overrides', () => {
    const eff = computeEffectiveConfig(
      FILE, CATALOG,
      {
        preset: 'voll',
        configuration: 'area-44-only',
        scopes: { 'area:julich:area-45:l': false },
      },
      new URLSearchParams('config=broca-areal'),
    )
    expect(eff.preset).toBe('kapitel11')
    expect(eff.hasUrlConfig).toBe(true)
    expect(eff.activeConfiguration).toBe('broca-areal')
    expect(eff.scopes['axis:cyto']).toBe(false)
    expect(eff.scopes['area:julich:area-44:l']).toBe(true)
    expect(eff.scopes['area:julich:area-45:l']).toBe(true)
  })
  it('explizite URL-Scopes gewinnen weiterhin ueber kanonische Config-Scopes', () => {
    const eff = computeEffectiveConfig(
      FILE, CATALOG,
      { preset: null, configuration: null, scopes: {} },
      new URLSearchParams('config=broca-areal&off=julich:area-45:l'),
    )
    expect(eff.scopes['area:julich:area-45:l']).toBe(false)
  })
  it('URL-preset ueberschreibt localStorage und Datei', () => {
    const eff = computeEffectiveConfig(
      FILE, CATALOG,
      { preset: 'kapitel11', configuration: null, scopes: {} },
      new URLSearchParams('preset=voll'),
    )
    expect(eff.preset).toBe('voll')
  })
  it('wirft bei unbekanntem URL-preset', () => {
    expect(() => computeEffectiveConfig(
      FILE, CATALOG, { preset: null, configuration: null, scopes: {} }, new URLSearchParams('preset=ghost'),
    )).toThrow(/Preset "ghost"/)
  })
})
