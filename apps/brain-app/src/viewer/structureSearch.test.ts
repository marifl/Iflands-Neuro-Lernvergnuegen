import { describe, expect, it } from 'vitest'
import type { OntologyNode } from './ontology'
import { filterStructureSearch, matchesStructureSearch, normalizedSearchForms } from './structureSearch'

const accNode: OntologyNode = {
  id: 'julich3-area-33-acc-l',
  labels: {
    de: 'Area 33 (ACC) · L',
    la: 'Area 33 (ACC) · L',
    en: 'Area 33 (ACC) · L',
  },
  fma: 'julich3-area-33-acc-l',
  searchAliases: ['ACC', 'dorsaler ACC', 'anterior cingulate cortex', 'cingulär', 'cingullum'],
}

const brocaNode: OntologyNode = {
  id: 'julich3-area-44-ifg-l',
  labels: {
    de: 'Area 44 (IFG) · L',
    la: 'Area 44 (IFG) · L',
    en: 'Area 44 (IFG) · L',
  },
  fma: 'julich3-area-44-ifg-l',
  searchAliases: ['BA44', 'Broca-Areal', 'inferior frontal gyrus', 'IFG'],
}

const dlpfcNode: OntologyNode = {
  id: 'left-middle-frontal-gyrus',
  slug: 'left-middle-frontal-gyrus',
  fma: 'FMA:61806',
  side: 'left',
  labels: {
    de: 'Gyrus frontalis medius links',
    la: 'Gyrus frontalis medius sinister',
    en: 'Left middle frontal gyrus',
  },
  k11Role: 'DLPFC',
}

describe('structureSearch', () => {
  it('normalisiert Umlaute, Bindestriche und Akzente deterministisch', () => {
    expect(normalizedSearchForms('Broca-Areal')).toEqual(['broca areal'])
    expect(normalizedSearchForms('cingulär')).toEqual(['cingular', 'cingulaer'])
  })

  it('findet ACC ueber Alias und expliziten Tippfehler', () => {
    expect(matchesStructureSearch(accNode, 'cingullum')).toBe(true)
    expect(matchesStructureSearch(accNode, 'anterior cingulate')).toBe(true)
    expect(matchesStructureSearch(accNode, 'cingulaer')).toBe(true)
  })

  it('erhaelt exakte Label-Treffer und liefert klare Nicht-Treffer', () => {
    expect(matchesStructureSearch(brocaNode, 'Area 44')).toBe(true)
    expect(matchesStructureSearch(brocaNode, 'Broca Areal')).toBe(true)
    expect(matchesStructureSearch(brocaNode, 'hippocampus')).toBe(false)
  })

  it('findet sichtbare Rollen und stabile Struktur-Identifier', () => {
    expect(matchesStructureSearch(dlpfcNode, 'DLPFC')).toBe(true)
    expect(matchesStructureSearch(dlpfcNode, 'left-middle-frontal-gyrus')).toBe(true)
    expect(matchesStructureSearch(dlpfcNode, 'FMA 61806')).toBe(true)
  })

  it('filtert den Trefferpool ohne Umsortierung', () => {
    expect(filterStructureSearch([brocaNode, accNode], 'ACC').map((node) => node.id)).toEqual([
      'julich3-area-33-acc-l',
    ])
  })
})
