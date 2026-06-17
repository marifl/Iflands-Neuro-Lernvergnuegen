import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AtlasConfigFile } from '../viewer/atlas/atlasConfig'
import { SceneSchema } from './types'

const PUBLIC_ROOT = resolve('public')

const FIGURE_PACKAGES = [
  { figure: '11-05', configName: 'pfc-petrides', sceneId: 'pfc-petrides' },
  { figure: '11-06', configName: 'fuster-gradient', sceneId: 'fuster-gradient' },
  { figure: '11-07', configName: 'badre-rostrokaudal', sceneId: 'badre-rostrokaudal' },
  { figure: '11-08A', configName: 'badre-domainen', sceneId: 'badre-domainen' },
  {
    figure: '11-08B',
    configName: 'badre-relationale-komplexitaet',
    sceneId: 'badre-relationale-komplexitaet',
  },
  { figure: '11-08C', configName: 'badre-kaskade', sceneId: 'badre-kaskade' },
  { figure: '11-08D', configName: 'badre-konflikttypen', sceneId: 'badre-konflikttypen' },
  { figure: '11-09', configName: 'wcst-frontoparietal', sceneId: 'wcst-frontoparietal' },
  { figure: '11-10', configName: 'fluency-foci', sceneId: 'fluency-foci' },
  { figure: '11-11A/B', configName: 'tower-of-london-dlpfc', sceneId: 'tower-of-london-dlpfc' },
  {
    figure: '11-11C',
    configName: 'tower-of-london-schweregrad',
    sceneId: 'tower-of-london-schweregrad',
  },
  { figure: '11-12', configName: 'flanker-aufgabe', sceneId: 'flanker-aufgabe' },
  { figure: '11-13', configName: 'acc-bush', sceneId: 'acc-bush' },
]

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

describe('Kapitel-11 Figure-Scene-Packages', () => {
  it('liefert fuer alle 21 Lernpfad-Schritte echte Inhalte oder explizite Quellen', () => {
    const config = readJson<AtlasConfigFile>(join(PUBLIC_ROOT, 'assets/atlas-canonical/atlas-config.json'))
    const steps = config.learning['kapitel11-pfad'].steps

    expect(steps).toHaveLength(21)

    for (const configName of steps) {
      const cfg = config.configurations[configName]
      expect(cfg, configName).toBeDefined()
      expect(cfg.overlay?.scene, configName).toBeTruthy()

      const scene = SceneSchema.parse(readJson(join(PUBLIC_ROOT, 'scenes', `${cfg.overlay!.scene}.json`)))
      expect(scene.companion.summary.trim().length, scene.id).toBeGreaterThan(80)
      expect(scene.companion.sources.length, scene.id).toBeGreaterThan(0)

      if (scene.overlay.kind !== 'prose') {
        expect(scene.overlay.data, scene.id).toBeDefined()
      }
    }
  })

  it('registriert 11-05 bis 11-13 als Configs im Lernpfad', () => {
    const config = readJson<AtlasConfigFile>(join(PUBLIC_ROOT, 'assets/atlas-canonical/atlas-config.json'))
    const steps = config.learning['kapitel11-pfad'].steps

    for (const pkg of FIGURE_PACKAGES) {
      expect(config.configurations).toHaveProperty(pkg.configName)
      const cfg = config.configurations[pkg.configName]
      expect(cfg.replaces_figure).toBe(pkg.figure)
      expect(cfg.overlay?.scene).toBe(pkg.sceneId)
      expect(cfg.sequencing?.learning).toBe('kapitel11-pfad')
      expect(cfg.sequencing?.step).toBe(pkg.configName)
      expect(steps).toContain(pkg.configName)
    }
  })

  it('liefert passende Scene-JSONs ohne Buchbild-Fallbacks', () => {
    const config = readJson<AtlasConfigFile>(join(PUBLIC_ROOT, 'assets/atlas-canonical/atlas-config.json'))

    for (const pkg of FIGURE_PACKAGES) {
      const cfg = config.configurations[pkg.configName]
      const scene = SceneSchema.parse(readJson(join(PUBLIC_ROOT, 'scenes', `${pkg.sceneId}.json`)))
      expect(scene.id).toBe(pkg.sceneId)
      expect(scene.figure).toBe(pkg.figure)

      expect(scene.overlay.kind).not.toBe('image')
      expect(cfg.overlay?.kind).not.toBe('image')
      expect('fallbackImage' in scene.overlay).toBe(false)
      expect('fallback_image' in (cfg.overlay ?? {})).toBe(false)
    }
  })
})
