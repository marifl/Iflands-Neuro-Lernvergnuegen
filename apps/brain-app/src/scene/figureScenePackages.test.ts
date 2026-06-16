import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AtlasConfigFile } from '../viewer/atlas/atlasConfig'
import { SceneSchema } from './types'

const PUBLIC_ROOT = resolve('public')

const FIGURE_PACKAGES = [
  { figure: '11-05', configName: 'pfc-petrides', sceneId: 'pfc-petrides', fallback: true },
  { figure: '11-06', configName: 'fuster-gradient', sceneId: 'fuster-gradient', fallback: true },
  { figure: '11-07', configName: 'badre-rostrokaudal', sceneId: 'badre-rostrokaudal', fallback: true },
  { figure: '11-08A', configName: 'badre-domainen', sceneId: 'badre-domainen', fallback: true },
  {
    figure: '11-08B',
    configName: 'badre-relationale-komplexitaet',
    sceneId: 'badre-relationale-komplexitaet',
    fallback: true,
  },
  { figure: '11-08C', configName: 'badre-kaskade', sceneId: 'badre-kaskade', fallback: true },
  { figure: '11-08D', configName: 'badre-konflikttypen', sceneId: 'badre-konflikttypen', fallback: true },
  { figure: '11-09', configName: 'wcst-frontoparietal', sceneId: 'wcst-frontoparietal', fallback: true },
  { figure: '11-10', configName: 'fluency-foci', sceneId: 'fluency-foci', fallback: true },
  { figure: '11-11A/B', configName: 'tower-of-london-dlpfc', sceneId: 'tower-of-london-dlpfc', fallback: true },
  {
    figure: '11-11C',
    configName: 'tower-of-london-schweregrad',
    sceneId: 'tower-of-london-schweregrad',
    fallback: true,
  },
  { figure: '11-12', configName: 'flanker-aufgabe', sceneId: 'flanker-aufgabe', fallback: false },
  { figure: '11-13', configName: 'acc-bush', sceneId: 'acc-bush', fallback: true },
]

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

describe('Kapitel-11 Figure-Scene-Packages', () => {
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

  it('liefert passende Scene-JSONs und lokale Figure-Fallbacks', () => {
    const config = readJson<AtlasConfigFile>(join(PUBLIC_ROOT, 'assets/atlas-canonical/atlas-config.json'))

    for (const pkg of FIGURE_PACKAGES) {
      const cfg = config.configurations[pkg.configName]
      const scene = SceneSchema.parse(readJson(join(PUBLIC_ROOT, 'scenes', `${pkg.sceneId}.json`)))
      expect(scene.id).toBe(pkg.sceneId)
      expect(scene.figure).toBe(pkg.figure)

      const sceneFallback = scene.overlay.fallbackImage
      const configFallback = cfg.overlay?.fallback_image
      if (!pkg.fallback) {
        expect(sceneFallback).toBeUndefined()
        expect(configFallback).toBeUndefined()
        continue
      }

      expect(sceneFallback).toBeTruthy()
      expect(configFallback).toBe(sceneFallback)
      expect(existsSync(join(PUBLIC_ROOT, sceneFallback!.slice(1)))).toBe(true)
    }
  })
})
