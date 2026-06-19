import { afterEach, describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'smol-toml'
import { toCanonicalTomlConfiguration, toTomlConfiguration } from './configExport'
import type { AtlasConfigFile } from './atlasConfig'
import { LS_KEY } from './atlasConfigStore'

function expectBuilderValid(config: unknown, catalog: unknown): void {
  const builderUrl = pathToFileURL(resolve(process.cwd(), '../../scripts/atlas/build-config.mjs')).href
  const script = `
    const { indexCatalog, validateConfig } = await import(process.env.BUILDER_URL)
    const config = JSON.parse(process.env.BUILDER_CONFIG)
    const catalog = JSON.parse(process.env.BUILDER_CATALOG)
    validateConfig(config, indexCatalog(catalog))
  `
  try {
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      env: {
        ...process.env,
        BUILDER_URL: builderUrl,
        BUILDER_CONFIG: JSON.stringify(config),
        BUILDER_CATALOG: JSON.stringify(catalog),
      },
      stdio: 'pipe',
    })
  } catch (error) {
    const err = error as Error & { stderr?: Buffer }
    throw new Error(err.stderr?.toString() || err.message)
  }
}

afterEach(() => {
  localStorage.clear()
})

describe('toTomlConfiguration', () => {
  const block = toTomlConfiguration('mein-set', {
    scopes: { 'area:julich:area-44:l': true, 'axis:cyto': false },
    view: { surface: 'pial', subcortex: false, carve_on_taro: 'julich' },
    camera: { target: 'julich:area-44:l' },
  })

  it('Roundtrip: re-parse ergibt die erwartete Struktur', () => {
    const parsed = parse(block) as any
    const cfg = parsed.configurations['mein-set']
    expect(cfg.label_de).toBe('mein-set')
    expect(cfg.scopes['area:julich:area-44:l']).toBe(true)
    expect(cfg.scopes['axis:cyto']).toBe(false)
    expect(cfg.view.surface).toBe('pial')
    expect(cfg.view.carve_on_taro).toBe('julich')
    expect(cfg.camera.target).toBe('julich:area-44:l')
  })

  it('laesst view/camera weg wenn leer', () => {
    const b = toTomlConfiguration('x', { scopes: { 'area:dkt:parsopercularis:l': true }, view: {}, camera: {} })
    const parsed = parse(b) as any
    expect(parsed.configurations['x'].view).toBeUndefined()
    expect(parsed.configurations['x'].camera).toBeUndefined()
    expect(parsed.configurations['x'].scopes['area:dkt:parsopercularis:l']).toBe(true)
  })

  it('exportiert alle SP5.1-Config-Felder als sichtbaren TOML-Block', () => {
    const b = toTomlConfiguration('p3a-kopie', {
      label_de: 'P3a Kopie',
      title: 'P3a - Konfliktmonitoring',
      section: '11.4',
      replaces_figure: '11-15(1)',
      facets: { clinic: false, function: true, chapter: true, provenance: true },
      view: { surface: 'pial', subcortex: false, carve_on_taro: 'dkt' },
      camera: {
        target: 'dkt:rostralanteriorcingulate:l',
        shot: 'medial-midline',
        fit: 'target',
        bounds: { center: [10, 20, 30], radius: 90 },
        margin: 1.4,
        fov: 35,
        pose: { position: [1, 2, 3], look_at: [4, 5, 6] },
      },
      regions: { areas: ['dkt:rostralanteriorcingulate:l'], scene_regions: ['acc-anterior'] },
      colors: {
        enabled: false,
        scheme: 'scene',
        dim_others: true,
        coverage: 'not-applicable',
        review_status: 'final',
        reason: 'ERP-Overlay nutzt Scene-Farben statt Atlas-Preset.',
      },
      visibility: { dim_others: true, dim_opacity: 0.18, hidden: ['left-insula'], isolated: ['left-cingulate-gyrus'] },
      cuts: { enabled: true, planes: [{ axis: 'x', position: 12, keep: 'positive' }] },
      overlay: { kind: 'erp', scene: 'p3a-konfliktmonitoring', position: 'right', size: 'md' },
      sequencing: { presentation: 'kapitel11-vorlesung', learning: 'kapitel11-pfad', step: 'p3a-konfliktmonitoring' },
      scopes: { 'area:dkt:rostralanteriorcingulate:l': true },
    })
    const cfg = (parse(b) as any).configurations['p3a-kopie']
    expect(cfg.label_de).toBe('P3a Kopie')
    expect(cfg.replaces_figure).toBe('11-15(1)')
    expect(cfg.facets.provenance).toBe(true)
    expect(cfg.camera.bounds).toEqual({ center: [10, 20, 30], radius: 90 })
    expect(cfg.camera.pose.position).toEqual([1, 2, 3])
    expect(cfg.regions.scene_regions).toEqual(['acc-anterior'])
    expect(Object.hasOwn(cfg.colors, 'groups')).toBe(false)
    expect(cfg.colors.scheme).toBe('scene')
    expect(cfg.colors.coverage).toBe('not-applicable')
    expect(cfg.colors.review_status).toBe('final')
    expect(cfg.colors.reason).toBe('ERP-Overlay nutzt Scene-Farben statt Atlas-Preset.')
    expect(cfg.visibility.dim_opacity).toBe(0.18)
    expect(cfg.visibility.hidden).toEqual(['left-insula'])
    expect(cfg.cuts.planes[0]).toEqual({ axis: 'x', position: 12, keep: 'positive' })
    expect(cfg.overlay.scene).toBe('p3a-konfliktmonitoring')
    expect(cfg.sequencing.step).toBe('p3a-konfliktmonitoring')
  })

  it('roundtript exportiertes TOML durch die Builder-Validierung', () => {
    const block = toTomlConfiguration('builder-roundtrip', {
      label_de: 'Builder Roundtrip',
      title: 'Builder-valider Export',
      section: '11.3.3',
      view: { surface: 'pial', subcortex: false, carve_on_taro: 'julich' },
      camera: { target: 'julich:area-44:l', shot: 'lateral-left', fit: 'bounds', margin: 1.4, fov: 35 },
      regions: { areas: ['julich:area-44:l'] },
      colors: {
        enabled: false,
        dim_others: true,
        scheme: 'atlas',
        coverage: 'not-applicable',
        review_status: 'final',
        reason: 'Builder-Roundtrip nutzt Atlas-Carve ohne Preset.',
      },
      visibility: { dim_others: true, dim_opacity: 0.18 },
      cuts: { enabled: false },
      overlay: { kind: 'prose' },
      sequencing: { step: 'builder-roundtrip' },
      scopes: { 'area:julich:area-44:l': true },
    })
    const cfg = (parse(block) as any).configurations['builder-roundtrip']
    const catalog = {
      axes: [{ id: 'cyto' }],
      atlases: [{
        id: 'julich',
        axis: 'cyto',
        groups: [{
          id: 'frontal',
          areas: [{ id: 'julich:area-44:l' }],
        }],
      }],
    }
    const config = {
      preset: 'p',
      presets: { p: { label_de: 'Preset', scopes: {} } },
      mesh_mappings: {
        buckets: { ok: { meshes: ['mesh-a'] } },
        scene_regions: { ok: { meshes: ['mesh-a'] } },
      },
      color_presets: {
        'ok-preset': {
          label: 'OK Preset',
          intent: 'Root-Vertrag fuer Builder-Roundtrip.',
          coverage: 'full',
          dimOthers: true,
          groups: [{ label: 'OK', role: 'task-activation', meaning: 'Testgruppe', hue: 120, buckets: ['ok'] }],
        },
      },
      configurations: { 'builder-roundtrip': cfg },
      presentation: {},
      learning: {},
    }

    expectBuilderValid(config, catalog)
  })

  it('exportiert kanonisch aus Runtime-Config statt aus localStorage-Overrides', () => {
    const file: AtlasConfigFile = {
      preset: 'kapitel11',
      presets: { kapitel11: { label_de: 'K11', scopes: {} } },
      mesh_mappings: { buckets: {}, scene_regions: {} },
      color_presets: {},
      configurations: {
        'p3a-konfliktmonitoring': {
          label_de: 'P3a Konfliktmonitoring',
          camera: { shot: 'medial-midline' },
          scopes: { 'area:dkt:rostralanteriorcingulate:l': true },
        },
      },
      presentation: {},
      learning: {},
    }
    localStorage.setItem(LS_KEY, JSON.stringify({
      preset: null,
      configuration: 'broca-areal',
      scopes: { 'area:dkt:rostralanteriorcingulate:l': false },
    }))
    const cfg = (parse(toCanonicalTomlConfiguration(file, 'p3a-konfliktmonitoring')) as any)
      .configurations['p3a-konfliktmonitoring']
    expect(cfg.camera.shot).toBe('medial-midline')
    expect(cfg.scopes['area:dkt:rostralanteriorcingulate:l']).toBe(true)
    expect(cfg.scopes['area:julich:area-44:l']).toBeUndefined()
  })

  it('exportiert die dokumentierten 11-04- und 11-15(1)-Configs aus Runtime-Config', () => {
    const file = JSON.parse(readFileSync('public/assets/atlas-canonical/atlas-config.json', 'utf8')) as AtlasConfigFile
    const basal = (parse(toCanonicalTomlConfiguration(file, 'basalganglienschleifen')) as any)
      .configurations.basalganglienschleifen
    const p3a = (parse(toCanonicalTomlConfiguration(file, 'p3a-konfliktmonitoring')) as any)
      .configurations['p3a-konfliktmonitoring']
    expect(basal.replaces_figure).toBe('11-04')
    expect(basal.camera.shot).toBe('lateral-left')
    expect(p3a.replaces_figure).toBe('11-15(1)')
    expect(p3a.overlay.scene).toBe('p3a-konfliktmonitoring')
  })
})
