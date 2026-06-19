import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bucketToMeshes, BUCKET_MAPPINGS } from './bucketMeshes'
import { COLOR_ROLE_VALUES } from './atlasColorSystem'
import { hueToHex, parseColorPresets, presentationColorItemsFromConfig, resolvePresetColors, restrictPresetToBuckets, type ColorPreset } from './colorPresets'

const here = dirname(fileURLToPath(import.meta.url))
const ATLAS_CONFIG_PATH = resolve(here, '../../public/assets/atlas-canonical/atlas-config.json')
const STRUCTURE_COORDS_PATH = resolve(here, '../../public/scenes/structure-coords.json')
const realConfig = () => JSON.parse(readFileSync(ATLAS_CONFIG_PATH, 'utf8'))
const real = (): ColorPreset[] => parseColorPresets(realConfig())

describe('bucketToMeshes', () => {
  it('loest einen buildbaren Bucket aus dem generierten Mapping auf', () => {
    const [bucket, mapping] = Object.entries(BUCKET_MAPPINGS).find(([, candidate]) => candidate.meshes.length > 0)!
    expect(bucketToMeshes(bucket)).toEqual(mapping.meshes)
    expect(mapping.meshes.length).toBeGreaterThan(0)
  })

  it('wirft laut bei unbekanntem Bucket', () => {
    expect(() => bucketToMeshes('does-not-exist')).toThrow(/unbekannter Bucket/)
  })

  it('wirft laut bei einer in der Config markierten Geometrie-Luecke', () => {
    const gap = Object.entries(BUCKET_MAPPINGS).find(([, mapping]) => mapping.known_gap)
    expect(gap).toBeDefined()
    expect(() => bucketToMeshes(gap![0])).toThrow(/keine Geometrie/)
  })
})

describe('hueToHex', () => {
  it('liefert gueltiges, deterministisches Hex', () => {
    expect(hueToHex(210)).toMatch(/^#[0-9a-f]{6}$/)
    expect(hueToHex(210)).toBe(hueToHex(210))
    expect(hueToHex(30)).not.toBe(hueToHex(210))
  })
})

describe('parseColorPresets', () => {
  it('validiert die echten color_presets aus atlas-config.json', () => {
    const presets = real()
    expect(presets.length).toBeGreaterThanOrEqual(10)
    expect(presets.map((p) => p.id)).toContain('pfc-petrides')
    expect(presets.map((p) => p.id)).toContain('fuster-gradient')
    expect(presets.map((p) => p.id)).toContain('wcst-frontoparietal')
    expect(presets.map((p) => p.id)).toContain('ofc-phineas')
    expect(presets.map((p) => p.id)).not.toContain('badre-core-pfc')
    expect(presets.map((p) => p.id)).not.toContain('tower-dlpfc')
    expect(presets.map((p) => p.id)).not.toContain('phineas-gage')
  })

  it('wirft laut bei Schema-Verstoss', () => {
    expect(() => parseColorPresets({ color_presets: {} })).toThrow()
    expect(() => parseColorPresets({ color_presets: { x: { label: 'x' } } })).toThrow()
  })

  it('erzwingt Rollen, Bedeutung und Coverage fuer jede produktive Preset-Gruppe', () => {
    const roles = new Set<string>(COLOR_ROLE_VALUES)
    const issues: string[] = []
    for (const preset of real()) {
      if (!preset.intent.trim()) issues.push(`${preset.id}: intent fehlt`)
      if (preset.coverage === 'partial' && !preset.coverageNote?.trim()) issues.push(`${preset.id}: coverageNote fehlt`)
      for (const group of preset.groups) {
        if (!roles.has(group.role)) issues.push(`${preset.id}/${group.label}: Rolle ungueltig`)
        if (!group.meaning.trim()) issues.push(`${preset.id}/${group.label}: Bedeutung fehlt`)
      }
    }
    expect(issues).toEqual([])
  })
})

describe('presentationColorItemsFromConfig', () => {
  it('liefert die komplette Vortragsliste aus der aktuellen Atlas-Config', () => {
    const items = presentationColorItemsFromConfig(realConfig())
    expect(items).toHaveLength(26)
    expect(items.map((item) => item.id)).toEqual([
      'pfc-petrides',
      'duncan-owen-overlap',
      'fuster-gradient',
      'badre-rostrokaudal',
      'badre-domainen',
      'badre-relationale-komplexitaet',
      'badre-kaskade',
      'badre-konflikttypen',
      'dlpfc-schaedigung',
      'wcst-frontoparietal',
      'fluency-foci',
      'tower-of-london-dlpfc',
      'tower-of-london-schweregrad',
      'right-dlpfc-selbstkontrolle',
      'ofc-phineas',
      'right-parietal-lesion',
      'acc-bush',
      'flanker-aufgabe',
      'go-nogo-intro',
      'vcpt',
      'ica-uebersicht',
      'p3a-konfliktmonitoring',
      'p3b-engagement',
      'p3z-inhibition',
      'basalganglienschleifen',
      'zusammenfassung',
    ])
    expect(items.find((item) => item.id === 'ofc-phineas')?.colorPresetId).toBe('ofc-phineas')
    expect(items.find((item) => item.id === 'tower-of-london-dlpfc')?.colorPresetId).toBe('tower-of-london-dlpfc')
    expect(items.find((item) => item.id === 'badre-domainen')?.colorPresetId).toBe('badre-domainen')
  })
})

describe('resolvePresetColors', () => {
  it('faerbt jede Gruppe von pfc-petrides (voll aufloesbar auf vorhandener Geometrie)', () => {
    const petrides = real().find((p) => p.id === 'pfc-petrides')!
    const colors = resolvePresetColors(petrides)
    const first = petrides.groups[0]
    const second = petrides.groups[1]
    const firstMesh = bucketToMeshes(first.buckets[0])[0]
    const secondMesh = bucketToMeshes(second.buckets[0])[0]
    expect(colors.get(firstMesh)).toBe(hueToHex(first.hue))
    expect(colors.get(secondMesh)).toBe(hueToHex(second.hue))
    expect(colors.get(firstMesh)).not.toBe(colors.get(secondMesh))
  })

  it('loest alle echten Presets voll auf', () => {
    for (const preset of real()) {
      expect(() => resolvePresetColors(preset)).not.toThrow()
    }
  })

  it('wirft laut bei einer Figur, die einen Luecken-Bucket nutzt (kein stilles Schlucken)', () => {
    const gapBucket = Object.entries(BUCKET_MAPPINGS).find(([, mapping]) => mapping.known_gap)?.[0]
    expect(gapBucket).toBeDefined()
    const gap: ColorPreset = {
      id: 'synthetic-gap',
      label: 'Synthetisch (Mapping-Luecke)',
      intent: 'Testet Luecken-Bucket',
      coverage: 'full',
      dimOthers: true,
      groups: [{ label: 'Gap', role: 'task-activation', meaning: 'Testgruppe', hue: 0, buckets: [gapBucket!] }],
    }
    expect(() => resolvePresetColors(gap)).toThrow(/keine Geometrie/)
  })
})

describe('restrictPresetToBuckets', () => {
  it('schneidet ein breites Preset auf die Buckets der aktiven Config', () => {
    const phineas = real().find((p) => p.id === 'ofc-phineas')!
    const restricted = restrictPresetToBuckets(phineas, ['ofc', 'vmpfc'], 'ofc-phineas')

    expect(restricted.groups).toHaveLength(1)
    expect(restricted.groups[0]).toEqual({
      ...phineas.groups[0],
      buckets: expect.arrayContaining(['ofc', 'vmpfc']),
    })
    expect(restricted.groups[0].buckets).toHaveLength(2)

    const colors = resolvePresetColors(restricted)
    expect(colors.has('left-lateral-orbitofrontal')).toBe(true)
    expect(colors.has('left-medial-orbital-gyrus')).toBe(true)
    expect(colors.has('left-amygdala')).toBe(false)
    expect(colors.has('left-middle-frontal-gyrus')).toBe(false)
  })

  it('wirft laut, wenn die Config einen nicht vom Preset gedeckten Bucket nutzt', () => {
    const phineas = real().find((p) => p.id === 'ofc-phineas')!

    expect(() => restrictPresetToBuckets(phineas, ['ofc', 'does-not-exist'], 'synthetic-config')).toThrow(
      /deckt Config "synthetic-config" nicht ab/,
    )
  })
})

describe('generierte Bucket-Mappings', () => {
  it('decken alle aktiven Preset-Buckets mit realen Meshes ab', () => {
    const structureIds = new Set(Object.keys(JSON.parse(readFileSync(STRUCTURE_COORDS_PATH, 'utf8'))))
    const presets = real()
    const used = new Set(presets.flatMap((p) => p.groups.flatMap((g) => g.buckets)))
    const issues: string[] = []
    for (const bucket of used) {
      const mapping = BUCKET_MAPPINGS[bucket]
      if (!mapping) {
        issues.push(`${bucket}: unbekannt`)
        continue
      }
      if (mapping.meshes.length === 0) issues.push(`${bucket}: keine Geometrie`)
      for (const mesh of mapping.meshes) {
        if (!structureIds.has(mesh)) issues.push(`${bucket}: Mesh ${mesh} unbekannt`)
      }
    }
    expect(issues).toEqual([])
  })

  it('verwenden fuer produktive Presets keine veralteten Julich-Einzelmeshes', () => {
    const presets = real()
    const used = new Set(presets.flatMap((p) => p.groups.flatMap((g) => g.buckets)))
    const issues: string[] = []
    for (const bucket of used) {
      for (const mesh of BUCKET_MAPPINGS[bucket]?.meshes ?? []) {
        if (/^(left|right)-julich-/.test(mesh)) issues.push(`${bucket}: ${mesh}`)
      }
    }
    expect(issues).toEqual([])
  })
})
