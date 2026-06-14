import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { AtlasCatalog } from './atlasCatalog'

const here = dirname(fileURLToPath(import.meta.url))
const catalog = JSON.parse(
  readFileSync(join(here, '../../../public/assets/atlas-canonical/atlas-ontology.json'), 'utf8'),
) as AtlasCatalog

const allAreas = (id: string) =>
  catalog.atlases.find((a) => a.id === id)!.groups.flatMap((g) => g.areas)

describe('atlas-ontology.json Invarianten', () => {
  it('hat 4 Kortex-Atlanten', () => {
    expect(catalog.atlases.map((a) => a.id).sort()).toEqual(['brodmann', 'destrieux', 'dkt', 'julich'])
  })

  it('Areal-Zahl je Atlas (LUT-non-medial minus Non-Region) × 2', () => {
    expect(allAreas('dkt').length).toBe(68)        // 35 - corpuscallosum
    expect(allAreas('destrieux').length).toBe(148) // 75 - Medial_wall
    expect(allAreas('julich').length).toBe(292)    // 148 - 2x nicht kartiert
    expect(allAreas('brodmann').length).toBe(82)
  })

  it('jede Areal-ID ist eindeutig', () => {
    const ids = catalog.atlases.flatMap((a) => a.groups.flatMap((g) => g.areas.map((x) => x.id)))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('jedes Areal hat einen bekannten Lappen', () => {
    const lobes = new Set(['frontal', 'parietal', 'temporal', 'occipital', 'insula', 'limbic'])
    const all = catalog.atlases.flatMap((a) => a.groups.flatMap((g) => g.areas))
    expect(all.every((x) => lobes.has(x.lobe))).toBe(true)
  })

  it('Destrieux ist fsaverage-only (taro_present=false, carve leer)', () => {
    expect(allAreas('destrieux').every((a) => a.taro_present === false && a.refs.carve.length === 0)).toBe(true)
  })

  it('jedes carve-ref ist seitenkonsistent mit dem Areal', () => {
    const all = catalog.atlases.flatMap((a) => a.groups.flatMap((g) => g.areas))
    for (const a of all) {
      const suffix = a.side === 'L' ? '-l' : '-r'
      expect(a.refs.carve.every((k) => k.endsWith(suffix))).toBe(true)
    }
  })

  it('Julich enthaelt GapMap- und Hippocampus-Knoten', () => {
    const labels = allAreas('julich').map((a) => a.label_de)
    expect(labels.some((l) => l.includes('GapMap'))).toBe(true)
    expect(labels.some((l) => l.includes('Hippocampus'))).toBe(true)
  })
})
