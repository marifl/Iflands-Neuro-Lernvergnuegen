// scripts/atlas/build-config.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  indexCatalog,
  validateScopeKey,
  validateConfig,
  buildConfig,
  formatConfig,
  figureAliases,
  canonicalFigureId,
  loadKnownFigures,
  loadScenesContext,
} from './build-config.mjs'

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

const MESH_MAPPINGS = {
  buckets: {
    ok: { meshes: ['mesh-a'] },
    gap: { meshes: [], known_gap: true, gap_reason: 'synthetische Luecke' },
  },
  scene_regions: {
    'sma-presma': { meshes: ['mesh-a'] },
    'gap-region': { meshes: [], known_gap: true, gap_reason: 'synthetische Region-Luecke' },
  },
}

const VALIDATION_CONTEXT = {
  cameraShots: new Set(['lateral-left']),
  colorPresets: new Map([
    ['ok-preset', { groups: [{ buckets: ['ok'] }] }],
    ['gap-preset', { groups: [{ buckets: ['gap'] }] }],
  ]),
  knownFigures: new Set(['11-04', '11-14', '11-15(1)']),
  meshIds: new Set(['mesh-a']),
  sceneIds: new Set(['vcpt']),
}

const FIGURE_MATRIX_DOC = new URL('../../docs/SP5_1_FIGURE_MATRIX.md', import.meta.url)
const GENERATED_MESH_MAPPINGS = new URL('../../apps/brain-app/src/viewer/meshMappings.generated.json', import.meta.url)

function baseConfig(overrides = {}) {
  return {
    preset: 'p',
    presets: { p: { label_de: 'Preset', scopes: {} } },
    mesh_mappings: MESH_MAPPINGS,
    configurations: {},
    presentation: {},
    learning: {},
    ...overrides,
  }
}

const VALID_CONFIGURATION = {
  label_de: 'Test-Konfiguration',
  title: 'Testtitel',
  section: '11.3.3',
  view: { surface: 'pial', subcortex: false, carve_on_taro: 'dkt' },
  camera: { target: 'julich:area-44:l', shot: 'lateral-left', fit: 'target', margin: 1.4 },
  regions: { areas: ['julich:area-44:l'], buckets: ['ok'], meshes: ['mesh-a'], scene_regions: ['sma-presma'] },
  colors: { enabled: false, dim_others: true },
  visibility: { dim_others: true, hidden: [], isolated: [] },
  cuts: { enabled: false },
  overlay: { kind: 'prose' },
  sequencing: {},
  scopes: { 'area:julich:area-44:l': true },
}

function configWith(configuration) {
  return baseConfig({
    configurations: { a: { ...VALID_CONFIGURATION, ...configuration } },
  })
}

function markdownLinkLabels(cell) {
  return [...cell.matchAll(/\[([^\]]+)\]\([^)]+\)/g)].map((match) => match[1].trim())
}

function parseFigureMatrix(markdown) {
  const section = markdown.match(/#+ SP5\.1 Figure\/Scene-Config-Abdeckungsmatrix\n([\s\S]*?)(?:\n## |\n$)/)
  assert.ok(section, 'SP5.1-Abdeckungsmatrix fehlt')
  const rows = new Map()
  for (const line of section[1].split('\n')) {
    if (!line.startsWith('| 11-')) continue
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    assert.equal(cells.length, 5, `Matrix-Zeile hat falsche Spaltenzahl: ${line}`)
    const [figure, status, configs, evidence, nextStep] = cells
    assert.match(status, /^(done|open|blocked)$/)
    assert.ok(!rows.has(figure), `Figur ${figure} doppelt in Matrix`)
    rows.set(figure, {
      status,
      configs: markdownLinkLabels(configs),
      evidence,
      nextStep,
    })
  }
  return rows
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
  const cfg = baseConfig({ preset: 'ghost', presets: {} })
  assert.throws(() => validateConfig(cfg, idx), /Preset "ghost"/)
})

test('validateConfig wirft bei totem Step-Verweis', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = baseConfig({
    configurations: { a: { ...VALID_CONFIGURATION, overlay: { ...VALID_CONFIGURATION.overlay, scene: 'vcpt' } } },
    presentation: { seq: { label_de: 'Sequenz', steps: ['a', 'missing'] } },
  })
  assert.throws(() => validateConfig(cfg, idx), /Step "missing"/)
})

test('validateConfig prueft sequencing-Referenzen', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ sequencing: { presentation: 'missing' } }), idx, VALIDATION_CONTEXT),
    /configuration "a" sequencing\.presentation "missing" unbekannt/,
  )
  assert.throws(
    () => validateConfig(configWith({ sequencing: { learning: 'missing' } }), idx, VALIDATION_CONTEXT),
    /configuration "a" sequencing\.learning "missing" unbekannt/,
  )
  assert.throws(
    () => validateConfig(configWith({ sequencing: { step: 'missing' } }), idx, VALIDATION_CONTEXT),
    /configuration "a" sequencing\.step "missing" unbekannt/,
  )
})

test('validateConfig verlangt overlay.scene fuer first-class Sequenzsteps', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(baseConfig({
      configurations: { a: VALID_CONFIGURATION },
      learning: { learn: { label_de: 'Lernpfad', steps: ['a'] } },
    }), idx, VALIDATION_CONTEXT),
    /learning "learn" Step "a" hat kein overlay\.scene/,
  )
  assert.throws(
    () => validateConfig(baseConfig({
      configurations: { a: VALID_CONFIGURATION },
      presentation: { seq: { label_de: 'Vorlesung', steps: ['a'] } },
    }), idx, VALIDATION_CONTEXT),
    /presentation "seq" Step "a" hat kein overlay\.scene/,
  )
  assert.doesNotThrow(() => validateConfig(baseConfig({
    configurations: { a: { ...VALID_CONFIGURATION, overlay: { ...VALID_CONFIGURATION.overlay, scene: 'vcpt' } } },
    presentation: { seq: { label_de: 'Vorlesung', steps: ['a'] } },
  }), idx, VALIDATION_CONTEXT))
})

test('validateConfig erlaubt wiederverwendete overlay.scene fuer eindeutige Learning-Steps', () => {
  const idx = indexCatalog(CATALOG)
  assert.doesNotThrow(() => validateConfig(baseConfig({
    configurations: {
      a: { ...VALID_CONFIGURATION, overlay: { ...VALID_CONFIGURATION.overlay, scene: 'vcpt' } },
      b: { ...VALID_CONFIGURATION, overlay: { ...VALID_CONFIGURATION.overlay, scene: 'vcpt' } },
    },
    learning: { learn: { label_de: 'Lernpfad', steps: ['a', 'b'] } },
  }), idx, VALIDATION_CONTEXT))
})

test('validateConfig wirft bei doppelten Learning-Steps', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(baseConfig({
      configurations: { a: { ...VALID_CONFIGURATION, overlay: { ...VALID_CONFIGURATION.overlay, scene: 'vcpt' } } },
      learning: { learn: { label_de: 'Lernpfad', steps: ['a', 'a'] } },
    }), idx, VALIDATION_CONTEXT),
    /learning "learn" enthaelt doppelten Step "a"/,
  )
})

test('validateConfig wirft bei toter Areal-Ref in configuration.scopes', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = configWith({ scopes: { 'area:julich:area-99:l': true } })
  assert.throws(() => validateConfig(cfg, idx), /area:julich:area-99:l/)
})

test('validateConfig wirft bei unbekanntem Configuration-Key', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = configWith({ surprise: true })
  assert.throws(() => validateConfig(cfg, idx), /configuration "a" hat unbekannten Key "surprise"/)
})

test('validateConfig erlaubt konfigurierbare Dim-Opazitaet im Sichtbarkeitsblock', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = configWith({ visibility: { dim_others: true, dim_opacity: 0.18 } })
  assert.doesNotThrow(() => validateConfig(cfg, idx, VALIDATION_CONTEXT))
})

test('validateConfig wirft bei ungueltiger Dim-Opazitaet', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ visibility: { dim_others: true, dim_opacity: -0.01 } }), idx, VALIDATION_CONTEXT),
    /visibility\.dim_opacity muss zwischen 0 und 1 liegen/,
  )
  assert.throws(
    () => validateConfig(configWith({ visibility: { dim_others: true, dim_opacity: 1.01 } }), idx, VALIDATION_CONTEXT),
    /visibility\.dim_opacity muss zwischen 0 und 1 liegen/,
  )
})

test('validateConfig wirft bei unbekanntem Figure-Atom-Subkey', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = baseConfig({
    configurations: { 'a': { ...VALID_CONFIGURATION, overlay: { kind: 'erp', surprise: true } } },
  })
  assert.throws(() => validateConfig(cfg, idx), /configuration "a"\.overlay hat unbekannten Key "surprise"/)
})

test('validateConfig verbietet Buchbild-Fallbacks im Overlay', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ overlay: { kind: 'image' } }), idx, VALIDATION_CONTEXT),
    /overlay\.kind "image" ungueltig/,
  )
  assert.throws(
    () => validateConfig(configWith({ overlay: { kind: 'prose', fallback_image: '/figures/book.jpg' } }), idx, VALIDATION_CONTEXT),
    /overlay hat unbekannten Key "fallback_image"/,
  )
})

test('validateConfig wirft bei unbekanntem nested Config-Key', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({
      camera: {
        ...VALID_CONFIGURATION.camera,
        pose: { position: [0, 0, 0], look_at: [1, 1, 1], roll: 12 },
      },
    }), idx, VALIDATION_CONTEXT),
    /configuration "a"\.camera\.pose hat unbekannten Key "roll"/,
  )
  assert.throws(
    () => validateConfig(configWith({
      colors: {
        ...VALID_CONFIGURATION.colors,
        groups: [{ label: 'Gruppe', hue: 120, buckets: ['ok'], alpha: 0.5 }],
      },
    }), idx, VALIDATION_CONTEXT),
    /configuration "a"\.colors\.groups\[0\] hat unbekannten Key "alpha"/,
  )
  assert.throws(
    () => validateConfig(configWith({
      cuts: {
        ...VALID_CONFIGURATION.cuts,
        planes: [{ axis: 'x', position: 0, keep: 'positive', softness: 0.2 }],
      },
    }), idx, VALIDATION_CONTEXT),
    /configuration "a"\.cuts\.planes\[0\] hat unbekannten Key "softness"/,
  )
})

test('validateConfig wirft bei fehlenden Configuration-Pflichtfeldern', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(baseConfig({ configurations: { a: { label_de: 'Minimal', scopes: {} } } }), idx, VALIDATION_CONTEXT),
    /configuration "a"\.title/,
  )
  const missingView = { ...VALID_CONFIGURATION }
  delete missingView.view
  assert.throws(
    () => validateConfig(baseConfig({ configurations: { a: missingView } }), idx, VALIDATION_CONTEXT),
    /configuration "a"\.view/,
  )
})

test('validateConfig wirft bei falschen primitiven Configuration-Typen', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(() => validateConfig(configWith({ label_de: 123 }), idx, VALIDATION_CONTEXT), /label_de/)
  assert.throws(() => validateConfig(configWith({ section: 789 }), idx, VALIDATION_CONTEXT), /section/)
  assert.throws(
    () => validateConfig(configWith({ view: { ...VALID_CONFIGURATION.view, subcortex: 'false' } }), idx, VALIDATION_CONTEXT),
    /view\.subcortex/,
  )
  assert.throws(
    () => validateConfig(configWith({ colors: { ...VALID_CONFIGURATION.colors, enabled: 'false' } }), idx, VALIDATION_CONTEXT),
    /colors\.enabled/,
  )
  assert.throws(
    () => validateConfig(configWith({ visibility: { ...VALID_CONFIGURATION.visibility, dim_others: 'true' } }), idx, VALIDATION_CONTEXT),
    /visibility\.dim_others/,
  )
  assert.throws(
    () => validateConfig(configWith({ sequencing: { ...VALID_CONFIGURATION.sequencing, step: 1 } }), idx, VALIDATION_CONTEXT),
    /sequencing\.step/,
  )
})

test('validateConfig wirft bei ungueltigen Mesh-Mappings', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(baseConfig({ mesh_mappings: { buckets: {}, scene_regions: {} } }), idx, VALIDATION_CONTEXT),
    /mesh_mappings/,
  )
  assert.throws(
    () => validateConfig(baseConfig({
      mesh_mappings: {
        buckets: { ghost: { meshes: ['mesh-ghost'] } },
        scene_regions: MESH_MAPPINGS.scene_regions,
      },
    }), idx, VALIDATION_CONTEXT),
    /Mesh unbekannt/,
  )
  assert.throws(
    () => validateConfig(baseConfig({
      mesh_mappings: {
        buckets: { gap: { meshes: [] } },
        scene_regions: MESH_MAPPINGS.scene_regions,
      },
    }), idx, VALIDATION_CONTEXT),
    /known_gap=true/,
  )
})

test('validateConfig wirft bei totem camera.target', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = configWith({ camera: { ...VALID_CONFIGURATION.camera, target: 'julich:area-99:l' } })
  assert.throws(() => validateConfig(cfg, idx), /camera.target/)
})

test('validateConfig wirft bei unbekanntem replaces_figure', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ replaces_figure: '11-99' }), idx, VALIDATION_CONTEXT),
    /replaces_figure "11-99"/,
  )
})

test('validateConfig wirft bei unbekanntem colors.preset', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ colors: { preset: 'ghost' } }), idx, VALIDATION_CONTEXT),
    /colors\.preset "ghost"/,
  )
})

test('validateConfig wirft bei unbekanntem oder leerem Bucket', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ regions: { buckets: ['ghost'] } }), idx, VALIDATION_CONTEXT),
    /Bucket unbekannt/,
  )
  assert.throws(
    () => validateConfig(configWith({ regions: { buckets: ['gap'] } }), idx, VALIDATION_CONTEXT),
    /keine Geometrie/,
  )
  assert.throws(
    () => validateConfig(configWith({ colors: { preset: 'gap-preset' } }), idx, VALIDATION_CONTEXT),
    /keine Geometrie/,
  )
})

test('validateConfig wirft bei unbekanntem Mesh', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ regions: { meshes: ['mesh-ghost'] } }), idx, VALIDATION_CONTEXT),
    /Mesh unbekannt/,
  )
  assert.throws(
    () => validateConfig(configWith({ visibility: { hidden: ['mesh-ghost'] } }), idx, VALIDATION_CONTEXT),
    /Mesh unbekannt/,
  )
})

test('validateConfig wirft bei ungueltiger Kamera-Konfiguration', () => {
  const idx = indexCatalog(CATALOG)
  assert.doesNotThrow(() => validateConfig(configWith({
    camera: { ...VALID_CONFIGURATION.camera, bounds: { center: [1, 2, 3], radius: 90 } },
  }), idx, VALIDATION_CONTEXT))
  assert.throws(
    () => validateConfig(configWith({ camera: { shot: 'ghost' } }), idx, VALIDATION_CONTEXT),
    /camera\.shot "ghost"/,
  )
  assert.throws(
    () => validateConfig(configWith({ camera: { fit: 'ghost' } }), idx, VALIDATION_CONTEXT),
    /camera\.fit "ghost"/,
  )
  assert.throws(
    () => validateConfig(configWith({ camera: { margin: 0 } }), idx, VALIDATION_CONTEXT),
    /camera\.margin/,
  )
  assert.throws(
    () => validateConfig(configWith({ camera: { fov: 180 } }), idx, VALIDATION_CONTEXT),
    /camera\.fov/,
  )
  assert.throws(
    () => validateConfig(configWith({ camera: { bounds: { center: [1, 2], radius: 90 } } }), idx, VALIDATION_CONTEXT),
    /camera\.bounds\.center/,
  )
  assert.throws(
    () => validateConfig(configWith({ camera: { bounds: { center: [1, 2, 3], radius: 0 } } }), idx, VALIDATION_CONTEXT),
    /camera\.bounds\.radius/,
  )
  assert.throws(
    () => validateConfig(configWith({ camera: { pose: { position: [1, 2], look_at: [0, 0, 0] } } }), idx, VALIDATION_CONTEXT),
    /camera\.pose\.position/,
  )
})

test('validateConfig wirft bei unbekannter Overlay-Szene oder Scene-Region', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(
    () => validateConfig(configWith({ overlay: { scene: 'ghost' } }), idx, VALIDATION_CONTEXT),
    /overlay\.scene "ghost"/,
  )
  assert.throws(
    () => validateConfig(configWith({ regions: { scene_regions: ['ghost'] } }), idx, VALIDATION_CONTEXT),
    /scene_regions "ghost"/,
  )
})

test('loadScenesContext ignoriert unreferenzierte lokale Scene-JSONs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'brain-scenes-'))
  try {
    writeFileSync(join(dir, 'referenziert.json'), JSON.stringify({ id: 'referenziert' }))
    writeFileSync(join(dir, 'ambient.json'), JSON.stringify({ title: 'lokaler Stray ohne id' }))
    const ctx = loadScenesContext({ configurations: { a: { overlay: { scene: 'referenziert' } } } }, dir)
    assert.deepEqual([...ctx.sceneIds], ['referenziert'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('loadScenesContext wirft bei referenzierter Scene mit falscher id', () => {
  const dir = mkdtempSync(join(tmpdir(), 'brain-scenes-'))
  try {
    writeFileSync(join(dir, 'referenziert.json'), JSON.stringify({ id: 'andere-scene' }))
    assert.throws(
      () => loadScenesContext({ configurations: { a: { overlay: { scene: 'referenziert' } } } }, dir),
      /referenziert\.json enthaelt id "andere-scene"/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('formatConfig sortiert Objekt-Keys stabil und behaelt Array-Reihenfolge', () => {
  assert.equal(formatConfig({ z: 1, a: { b: 2, a: 1 }, steps: ['b', 'a'] }), `{
  "a": {
    "a": 1,
    "b": 2
  },
  "steps": [
    "b",
    "a"
  ],
  "z": 1
}
`)
})

test('canonicalFigureId normalisiert Mapping-Figuren strikt', () => {
  assert.equal(canonicalFigureId('11-8 A'), '11-08A')
  assert.equal(canonicalFigureId('11-8 (C)'), '11-08C')
  assert.equal(canonicalFigureId('11-11 A/B'), '11-11A/B')
  assert.equal(canonicalFigureId('11-15 (1a)'), '11-15(1)')
  assert.equal(canonicalFigureId('11-12'), '11-12')
  assert.equal(canonicalFigureId('11-8 B extra'), null)
})

test('buildConfig: reale config.default.toml validiert gegen echten Katalog', async () => {
  const { config } = await buildConfig()
  assert.equal(config.preset, 'kapitel11')
  assert.ok(config.presets.kapitel11)
  assert.ok(config.configurations['broca-areal'])
  assert.equal(config.configurations.basalganglienschleifen.replaces_figure, '11-04')
  assert.equal(config.configurations.vcpt.overlay.scene, 'vcpt')
  assert.equal(config.configurations['p3a-konfliktmonitoring'].overlay.kind, 'erp')
  assert.equal(config.mesh_mappings.buckets.ifj.known_gap, true)
  assert.ok(config.mesh_mappings.scene_regions['sma-presma'].meshes.length > 0)
  assert.equal(
    formatConfig(config.mesh_mappings),
    readFileSync(GENERATED_MESH_MAPPINGS, 'utf8'),
    'Runtime meshMappings.generated.json driftet von config.default.toml/buildConfig().mesh_mappings',
  )
  assert.deepEqual(
    config.presentation['kapitel11-vorlesung'].steps,
    ['basalganglienschleifen', 'broca-areal', 'vcpt', 'p3a-konfliktmonitoring'],
  )
})

test('SP5.1-Figurenmatrix deckt Known-Figures und Runtime-Config ab', async () => {
  const matrixMarkdown = readFileSync(FIGURE_MATRIX_DOC, 'utf8')
  const matrix = parseFigureMatrix(matrixMarkdown)
  const knownFigures = new Set([...loadKnownFigures()].map(canonicalFigureId).filter(Boolean))
  assert.ok(knownFigures.size > 0, 'Mapping-Quelle liefert keine Known-Figures')
  assert.deepEqual([...matrix.keys()].sort(), [...knownFigures].sort())

  const { config } = await buildConfig()
  const replacements = new Map()
  for (const [name, cfg] of Object.entries(config.configurations)) {
    if (!cfg.replaces_figure) continue
    const figure = canonicalFigureId(cfg.replaces_figure)
    assert.ok(figure, `configuration "${name}" hat unlesbare replaces_figure "${cfg.replaces_figure}"`)
    assert.ok(knownFigures.has(figure), `configuration "${name}" ersetzt Figur ohne Mapping-Quelle "${cfg.replaces_figure}"`)
    assert.ok(matrix.has(figure), `configuration "${name}" ersetzt nicht gelistete Figur "${cfg.replaces_figure}"`)
    if (!replacements.has(figure)) replacements.set(figure, [])
    replacements.get(figure).push(name)
  }

  for (const [figure, row] of matrix.entries()) {
    assert.notEqual(row.nextStep.trim(), '', `Figur ${figure} hat keinen naechsten Schritt`)
    if (row.status === 'done') {
      assert.ok(row.configs.length > 0, `Figur ${figure} ist done ohne Config`)
      assert.notEqual(row.evidence, '-', `Figur ${figure} ist done ohne Nachweis`)
      for (const configName of row.configs) {
        const cfg = config.configurations[configName]
        assert.ok(cfg, `Figur ${figure} referenziert unbekannte Config "${configName}"`)
        assert.ok(cfg.replaces_figure, `Config "${configName}" hat kein replaces_figure`)
        assert.ok(
          figureAliases(cfg.replaces_figure).has(figure),
          `Config "${configName}" ersetzt "${cfg.replaces_figure}", nicht Matrix-Figur "${figure}"`,
        )
      }
      assert.deepEqual((replacements.get(figure) ?? []).sort(), [...row.configs].sort())
    } else {
      assert.equal(row.configs.length, 0, `Figur ${figure} ist ${row.status}, listet aber done-Config(s)`)
      assert.notEqual(row.nextStep, '-', `Figur ${figure} ist ${row.status} ohne konkrete naechste Aktion`)
    }
  }
})
