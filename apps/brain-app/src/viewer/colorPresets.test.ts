import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bucketToMeshes, BUCKET_MAPPINGS } from './bucketMeshes'
import { hueToHex, parseColorPresets, resolvePresetColors, type ColorPreset } from './colorPresets'

const here = dirname(fileURLToPath(import.meta.url))
const PRESETS_PATH = resolve(here, '../../public/companion/config/color-presets.json')
const STRUCTURE_COORDS_PATH = resolve(here, '../../public/scenes/structure-coords.json')
const real = (): ColorPreset[] => parseColorPresets(JSON.parse(readFileSync(PRESETS_PATH, 'utf8')))

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
  it('validiert die echte color-presets.json', () => {
    const presets = real()
    expect(presets.length).toBeGreaterThanOrEqual(5)
    expect(presets.map((p) => p.id)).toContain('pfc-petrides')
  })

  it('wirft laut bei Schema-Verstoss', () => {
    expect(() => parseColorPresets({ version: 1, presets: [] })).toThrow()
    expect(() => parseColorPresets({ presets: [{ id: 'x' }] })).toThrow()
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
      dimOthers: true,
      groups: [{ label: 'Gap', hue: 0, buckets: [gapBucket!] }],
    }
    expect(() => resolvePresetColors(gap)).toThrow(/keine Geometrie/)
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
})
