import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  anatomicalMaterialRole,
  buildColorIndex,
  functionSystem,
  meshColor,
  type Ontology,
} from './ontology'
import {
  ANATOMICAL_MATERIAL_COLORS,
  FUNCTION_COLORS,
  LATERALITY_COLORS,
  REGION_COLORS,
} from './atlasColorSystem'

const here = dirname(fileURLToPath(import.meta.url))
const ONTOLOGY_PATH = resolve(here, '../../public/assets/bodyparts3d/ontology.json')

function realOntology(): Ontology {
  return JSON.parse(readFileSync(ONTOLOGY_PATH, 'utf8')) as Ontology
}

describe('globale Farbmodi', () => {
  it('klassifiziert die echte Ontologie ohne stille Function-Other-Luecken', () => {
    const index = buildColorIndex(realOntology().tree)
    const unresolved = [...index.entries()]
      .filter(([, entry]) => entry.functionSystem === 'other')
      .map(([id]) => id)

    expect(index.size).toBeGreaterThan(500)
    expect(unresolved).toEqual([])
  })

  it('liefert unterschiedliche Anatomie-, Funktions-, Lateralitaets- und Regionsfarben', () => {
    const index = buildColorIndex(realOntology().tree)
    const cortex = index.get('right-inferior-frontal-gyrus')
    const ventricle = index.get('right-lateral-ventricle')
    const corpusCallosum = index.get('corpus-callosum')

    expect(cortex).toMatchObject({
      anatomicalRole: 'brain-cortex',
      functionSystem: 'executive-control',
      side: 'right',
      group: 'telencephalon',
    })
    expect(ventricle).toMatchObject({ anatomicalRole: 'csf', functionSystem: 'csf-ventricular' })
    expect(corpusCallosum).toMatchObject({
      anatomicalRole: 'white-matter',
      functionSystem: 'white-matter-communication',
    })

    expect(meshColor(cortex, 'anatomical')).toBe(ANATOMICAL_MATERIAL_COLORS['brain-cortex'])
    expect(meshColor(ventricle, 'anatomical')).toBe(ANATOMICAL_MATERIAL_COLORS.csf)
    expect(meshColor(cortex, 'function')).toBe(FUNCTION_COLORS['executive-control'])
    expect(meshColor(ventricle, 'function')).toBe(FUNCTION_COLORS['csf-ventricular'])
    expect(meshColor(cortex, 'laterality')).toBe(LATERALITY_COLORS.right)
    expect(meshColor(cortex, 'region')).toBe(REGION_COLORS.telencephalon)
  })

  it('deckt alle Top-Level-Gruppen der echten Ontologie explizit mit Regionsfarben ab', () => {
    const expectedGroups = (realOntology().tree.children ?? []).map((group) => group.id).sort()
    const configuredGroups = Object.keys(REGION_COLORS).sort()

    expect(configuredGroups).toEqual(expectedGroups)
  })

  it('wirft bei fehlendem Regionsfarbvertrag statt eine Ersatzfarbe zu hashen', () => {
    expect(() =>
      meshColor({
        id: 'probe-unknown',
        group: 'unknown-region',
        anatomicalRole: 'brain-cortex',
        functionSystem: 'other',
      }, 'region'),
    ).toThrow(/Keine Regionsfarbe fuer Ontologie-Gruppe "unknown-region"/)
  })

  it('ordnet wichtige Grenzfaelle reproduzierbar zu', () => {
    expect(anatomicalMaterialRole('right-caudate-nucleus', 'telencephalon')).toBe('subcortical-gray')
    expect(anatomicalMaterialRole('corpus-callosum', 'commissures')).toBe('white-matter')
    expect(anatomicalMaterialRole('cerebral-hemisphere-segment-of-dura-mater', 'meninges-grp')).toBe('meninges')
    expect(functionSystem(undefined, 'left-optic-tract', 'visual-pathway')).toBe('visual')
    expect(functionSystem(undefined, 'right-caudate-nucleus', 'telencephalon')).toBe('basal-ganglia-loop')
  })
})
