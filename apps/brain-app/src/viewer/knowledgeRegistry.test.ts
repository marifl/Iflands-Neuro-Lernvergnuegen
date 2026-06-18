import { describe, expect, it } from 'vitest'
import {
  KNOWLEDGE_COLLECTIONS,
  bonusContextsForCollection,
  collectionsWithCapability,
  knowledgeCollectionById,
  topLevelKnowledgeCollections,
  validateKnowledgeRegistry,
} from './knowledgeRegistry'

describe('knowledgeRegistry', () => {
  it('modelliert die sichtbaren Explorer-Wurzeln als stabile Collections', () => {
    expect(topLevelKnowledgeCollections().map((collection) => [collection.id, collection.label, collection.count])).toEqual([
      ['taro', 'TARO', 600],
      ['julich', 'Jülich', 292],
      ['dkt', 'DKT', 68],
      ['brodmann', 'Brodmann', 80],
      ['destrieux', 'Destrieux', 148],
      ['context-full', 'Kontext (Vollausbau)', 333],
      ['case-phineas-gage', 'Phineas Gage', 3],
    ])
  })

  it('haelt Faelle und Devices als Erweiterungs-Collections neben der Ontologie', () => {
    expect(knowledgeCollectionById('case-phineas-gage')).toMatchObject({
      kind: 'case-study',
      label: 'Phineas Gage',
      assetSlots: [
        {
          id: 'skull-base',
          label: 'Gage-Schädelbasis',
          formats: ['glb'],
          optional: true,
          assetId: 'phineas-gage-skull-base',
          runtimeInstanceId: 'phineas-gage-skull-base-01',
          partId: 'skull-base',
        },
        {
          id: 'skull-calvaria',
          label: 'Gage-Calvaria',
          formats: ['glb'],
          optional: true,
          assetId: 'phineas-gage-skull-calvaria',
          runtimeInstanceId: 'phineas-gage-skull-calvaria-01',
          partId: 'skull-calvaria',
        },
        {
          id: 'iron-rod',
          label: 'Gage-Eisenstange',
          formats: ['glb'],
          optional: true,
          assetId: 'phineas-gage-iron-rod',
          runtimeInstanceId: 'phineas-gage-iron-rod-01',
          partId: 'iron-rod',
        },
      ],
    })
    expect(knowledgeCollectionById('device-eeg-10-20')).toMatchObject({
      kind: 'device',
      label: 'EEG 10-20',
    })
  })

  it('haengt Bonus-Kontext-Records ueber Collection-IDs an die Registry', () => {
    expect(bonusContextsForCollection('case-phineas-gage').map((context) => context.id)).toEqual(['phineas-gage'])
    expect(bonusContextsForCollection('device-eeg-10-20').map((context) => context.id)).toEqual([
      'eeg-erp-vcpt',
      'eeg-erp-p3a-novelty',
      'eeg-erp-p3a-konfliktmonitoring',
    ])
  })

  it('deklariert asset-backed Device-Faehigkeiten fuer GLB/GLTF, Pickbarkeit und Sequenzen', () => {
    const eeg = knowledgeCollectionById('device-eeg-10-20')

    expect(eeg?.assetSlots).toEqual([
      {
        id: 'eeg-device-model',
        label: 'EEG-Device-Modell',
        formats: ['glb', 'gltf'],
        optional: true,
      },
    ])
    expect(eeg?.capabilities).toEqual(expect.arrayContaining([
      'load-3d-asset',
      'transform-gizmo',
      'positionable',
      'pickable-parts',
      'animatable',
      'sequence-state',
    ]))
    expect(collectionsWithCapability('load-3d-asset').map((collection) => collection.id)).toEqual(expect.arrayContaining([
      'case-phineas-gage',
      'device-eeg-10-20',
    ]))
  })

  it('validiert zentrale IDs ohne versteckte Verdrahtung', () => {
    expect(KNOWLEDGE_COLLECTIONS.map((collection) => collection.id)).toHaveLength(new Set(KNOWLEDGE_COLLECTIONS.map((collection) => collection.id)).size)
    expect(validateKnowledgeRegistry()).toEqual([])
  })
})
