import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '../../../public/assets/atlas-canonical/manifest.json'

// Verifiziert die reproduzierbar assemblierte subcortical-Sektion (Slice kszuLGgyaTzx):
// Shape + Byte-Laengen-Vertrag, den loadSubcortical() zur Laufzeit fail-loud erzwingt.
const ASSET_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../public/assets/atlas-canonical')

const EXPECTED_NUCLEI = ['thalamus', 'caudate', 'putamen', 'accumbens', 'gpe', 'gpi']

describe('atlas-canonical subcortical manifest', () => {
  it('enthaelt 12 Eintraege (6 Kerne x L/R)', () => {
    expect(manifest.subcortical).toBeDefined()
    expect(manifest.subcortical).toHaveLength(12)
    expect([...new Set(manifest.subcortical.map((e) => e.id))].sort()).toEqual([...EXPECTED_NUCLEI].sort())
  })

  it('dokumentiert fehlende Strukturen als explizite Gaps statt stiller Nicht-Anzeige', () => {
    expect(manifest.subcortical_gaps.map((g) => g.id)).toEqual(['hippocampus', 'amygdala'])
  })

  it('jeder Eintrag hat vollstaendige Shape', () => {
    for (const e of manifest.subcortical) {
      expect(typeof e.id).toBe('string')
      expect(typeof e.name_de).toBe('string')
      expect(['L', 'R']).toContain(e.side)
      expect(e.color).toHaveLength(3)
      expect(e.verts).toBeGreaterThan(0)
      expect(e.faces).toBeGreaterThan(0)
    }
  })

  it('Byte-Laengen der Assets passen zum verts/faces-Vertrag (loadSubcortical-Garantie)', () => {
    for (const e of manifest.subcortical) {
      const posBytes = statSync(join(ASSET_DIR, e.pos)).size
      const normBytes = statSync(join(ASSET_DIR, e.norm)).size
      const facesBytes = statSync(join(ASSET_DIR, e.faces_file)).size
      expect(posBytes).toBe(e.verts * 12)
      expect(normBytes).toBe(e.verts * 12)
      expect(facesBytes).toBe(e.faces * 12)
    }
  })
})
