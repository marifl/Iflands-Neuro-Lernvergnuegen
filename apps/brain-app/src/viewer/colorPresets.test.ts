import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bucketToMeshes, BUCKET_MESHES } from './bucketMeshes'
import { hueToHex, parseColorPresets, resolvePresetColors, type ColorPreset } from './colorPresets'

const here = dirname(fileURLToPath(import.meta.url))
const PRESETS_PATH = resolve(here, '../../public/companion/config/color-presets.json')

describe('bucketToMeshes', () => {
  it('loest einen bekannten Bucket auf reale Mesh-Namen auf', () => {
    // P4: dlpfc faerbt sub-gyral ueber die Julich-Subareale (MFG + SFG), nicht mehr die ganzen Gyri.
    const dlpfc = bucketToMeshes('dlpfc')
    expect(dlpfc).toContain('left-julich-mfg2')
    expect(dlpfc).toContain('right-julich-sfg3')
    expect(dlpfc).toHaveLength(28)
    // Praemotor/SMA (6*) bleibt aussen vor; die ganzen Gyri sind nicht mehr direkt im Bucket.
    expect(dlpfc).not.toContain('left-middle-frontal-gyrus')
    // W1-B: vlpfc faerbt sub-gyral ueber die DKT-Sub-Patches (pars op/tri/orbitalis).
    expect(bucketToMeshes('vlpfc')).toEqual([
      'left-parsopercularis',
      'right-parsopercularis',
      'left-parstriangularis',
      'right-parstriangularis',
      'left-parsorbitalis',
      'right-parsorbitalis',
    ])
  })

  it('wirft laut bei unbekanntem Bucket', () => {
    expect(() => bucketToMeshes('does-not-exist')).toThrow(/unbekannter Bucket/)
  })

  it('wirft laut (mit Kontext) bei verbliebener Geometrie-Luecke', () => {
    // W1-B schloss nucleus-accumbens, W2 frontopolar (Pol-Carve); ifj bleibt die letzte Luecke.
    expect(() => bucketToMeshes('ifj')).toThrow(/keine Geometrie/)
  })

  it('loest nucleus-accumbens (W1-B) + frontopolar (P4: Julich fp1/fp2) + globus-pallidus (P4: GPi/GPe) auf', () => {
    expect(bucketToMeshes('nucleus-accumbens')).toEqual(['left-nucleus-accumbens', 'right-nucleus-accumbens'])
    // P4: frontopolar zeigt jetzt auf das echte Julich-Areal fp1+fp2 (loest den geometrischen Pol-Carve ab).
    expect(bucketToMeshes('frontopolar')).toEqual([
      'left-julich-fp1',
      'right-julich-fp1',
      'left-julich-fp2',
      'right-julich-fp2',
    ])
    // P4: globus-pallidus zeigt auf den GPi/GPe-Split (CIT168 within-host) statt das ganze Mesh.
    expect(bucketToMeshes('globus-pallidus')).toEqual(['left-gpi', 'right-gpi', 'left-gpe', 'right-gpe'])
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
    const raw = JSON.parse(readFileSync(PRESETS_PATH, 'utf8'))
    const presets = parseColorPresets(raw)
    expect(presets.length).toBeGreaterThanOrEqual(5)
    expect(presets.map((p) => p.id)).toContain('pfc-petrides')
  })

  it('wirft laut bei Schema-Verstoss', () => {
    expect(() => parseColorPresets({ version: 1, presets: [] })).toThrow()
    expect(() => parseColorPresets({ presets: [{ id: 'x' }] })).toThrow()
  })
})

describe('resolvePresetColors', () => {
  const real = (): ColorPreset[] => parseColorPresets(JSON.parse(readFileSync(PRESETS_PATH, 'utf8')))

  it('faerbt jede Gruppe von pfc-petrides (voll aufloesbar auf vorhandener Geometrie)', () => {
    const petrides = real().find((p) => p.id === 'pfc-petrides')!
    const colors = resolvePresetColors(petrides)
    // DLPFC-Sub-Patches (P4: Julich-Subareale) in DLPFC-Farbe, VLPFC-Sub-Patches (pars*) in eigener.
    expect(colors.get('left-julich-mfg2')).toBe(hueToHex(210))
    expect(colors.get('left-parsopercularis')).toBe(hueToHex(30))
    expect(colors.get('left-julich-mfg2')).not.toBe(colors.get('left-parsopercularis'))
  })

  it('loest basalganglienschleifen nach W1-B voll auf (nucleus-accumbens geschlossen)', () => {
    // 11-04 nutzte nucleus-accumbens (vormals Luecke) -> nach W1-B baubar, keine Ausnahme.
    const bg = real().find((p) => p.id === 'basalganglienschleifen')!
    const colors = resolvePresetColors(bg)
    expect(colors.get('left-nucleus-accumbens')).toBe(hueToHex(150)) // Motivations-Gruppe
  })

  it('wirft laut bei einer Figur, die einen Luecken-Bucket nutzt (kein stilles Schlucken)', () => {
    // Alle echten Presets sind nach W1-B/W2 baubar; ein synthetisches Preset mit dem letzten
    // Luecken-Bucket (ifj) muss weiterhin laut brechen statt eine Gruppe still zu schlucken.
    const gap: ColorPreset = {
      id: 'synthetic-gap',
      label: 'Synthetisch (ifj-Luecke)',
      dimOthers: true,
      groups: [{ label: 'IFJ', hue: 0, buckets: ['ifj'] }],
    }
    expect(() => resolvePresetColors(gap)).toThrow(/keine Geometrie/)
  })
})

describe('BUCKET_MESHES Vollstaendigkeit', () => {
  it('deckt alle Buckets der echten Presets ab (kein unbekannter Bucket)', () => {
    const presets = parseColorPresets(JSON.parse(readFileSync(PRESETS_PATH, 'utf8')))
    const used = new Set(presets.flatMap((p) => p.groups.flatMap((g) => g.buckets)))
    const missing = [...used].filter((b) => !(b in BUCKET_MESHES))
    expect(missing).toEqual([])
  })
})
