// scripts/atlas/build-config.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indexCatalog, validateScopeKey, validateConfig, buildConfig } from './build-config.mjs'

const CATALOG = {
  axes: [{ id: 'macro' }, { id: 'cyto' }],
  atlases: [
    { id: 'julich', axis: 'cyto', groups: [
      { id: 'frontal', areas: [{ id: 'julich:area-44:l' }, { id: 'julich:area-45:l' }] },
    ] },
    { id: 'dkt', axis: 'macro', groups: [
      { id: 'frontal', areas: [{ id: 'dkt:parstriangularis:l' }] },
    ] },
  ],
}

test('indexCatalog sammelt valide IDs je Scope-Art', () => {
  const idx = indexCatalog(CATALOG)
  assert.ok(idx.axes.has('macro') && idx.axes.has('cyto'))
  assert.ok(idx.atlases.has('julich') && idx.atlases.has('dkt'))
  assert.ok(idx.groups.has('group:julich:frontal'))
  assert.ok(idx.areas.has('julich:area-44:l'))
})

test('validateScopeKey akzeptiert valide Keys', () => {
  const idx = indexCatalog(CATALOG)
  for (const k of ['axis:cyto', 'atlas:julich', 'group:julich:frontal', 'area:julich:area-44:l']) {
    assert.doesNotThrow(() => validateScopeKey(k, idx))
  }
})

test('validateScopeKey wirft bei toter Referenz', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(() => validateScopeKey('area:julich:area-99:l', idx), /area:julich:area-99:l/)
  assert.throws(() => validateScopeKey('atlas:nope', idx), /atlas:nope/)
  assert.throws(() => validateScopeKey('group:julich:nope', idx), /group:julich:nope/)
  assert.throws(() => validateScopeKey('axis:nope', idx), /axis:nope/)
  assert.throws(() => validateScopeKey('bogus:x', idx), /Scope-Art/)
})

test('validateConfig wirft bei totem Preset', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = { preset: 'ghost', presets: {}, configurations: {}, presentation: {}, learning: {} }
  assert.throws(() => validateConfig(cfg, idx), /Preset "ghost"/)
})

test('validateConfig wirft bei totem Step-Verweis', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = {
    preset: 'p', presets: { p: { scopes: {} } },
    configurations: { 'a': { scopes: {} } },
    presentation: { seq: { steps: ['a', 'missing'] } }, learning: {},
  }
  assert.throws(() => validateConfig(cfg, idx), /Step "missing"/)
})

test('validateConfig wirft bei toter Areal-Ref in configuration.scopes', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = {
    preset: 'p', presets: { p: { scopes: {} } },
    configurations: { 'a': { scopes: { 'area:julich:area-99:l': true } } },
    presentation: {}, learning: {},
  }
  assert.throws(() => validateConfig(cfg, idx), /area:julich:area-99:l/)
})

test('validateConfig wirft bei totem camera.target', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = {
    preset: 'p', presets: { p: { scopes: {} } },
    configurations: { 'a': { scopes: {}, camera: { target: 'julich:area-99:l' } } },
    presentation: {}, learning: {},
  }
  assert.throws(() => validateConfig(cfg, idx), /camera.target/)
})

test('buildConfig: reale config.default.toml validiert gegen echten Katalog', async () => {
  const { config } = await buildConfig()
  assert.equal(config.preset, 'kapitel11')
  assert.ok(config.presets.kapitel11)
  assert.ok(config.configurations['broca-areal'])
  assert.deepEqual(config.presentation['kapitel11-vorlesung'].steps, ['broca-areal', 'ofc-phineas'])
})
