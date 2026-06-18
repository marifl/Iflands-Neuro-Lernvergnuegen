import { describe, expect, it } from 'vitest'
import type { AuthoringScene } from './authoringScene'
import type { OntologyNode } from './ontology'
import {
  objectGraphIdForTarget,
  objectGraphNodesForAuthoringScene,
  parseSequenceTargetRef,
  resolveSequenceTargetRef,
  sequenceTargetRefFromAssetInstance,
  sequenceTargetRefFromAssetPart,
  sequenceTargetRefFromAtlasRole,
  sequenceTargetRefFromEegSite,
  sequenceTargetRefFromObjectGraphId,
  sequenceTargetRefFromOntologyNode,
  toSequenceTargetRefJson,
} from './sequenceTargetRef'

const ontologyNode: OntologyNode = {
  id: 'left-anterior-cingulate-gyrus',
  fma: 'FMA:61933',
  slug: 'left-anterior-cingulate-gyrus',
  labels: {
    de: 'Gyrus cinguli anterior links',
    la: 'Gyrus cinguli anterior sinister',
    en: 'Left anterior cingulate gyrus',
  },
}

const deviceScene: AuthoringScene = {
  schemaVersion: 1,
  sceneId: 'device-targets',
  assetInstances: [
    {
      instanceId: 'eeg-cap-01',
      assetId: 'asset:eeg-cap',
      collectionId: 'device-eeg-10-20',
      visible: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      origin: { policy: 'asset-origin' },
      parts: [
        {
          partId: 'electrode-fz',
          label: 'Fz electrode',
          pickable: true,
          role: 'selectable',
        },
        {
          partId: 'alignment-helper-ring',
          label: 'Alignment helper ring',
          pickable: false,
          role: 'helper',
        },
      ],
    },
    {
      instanceId: 'eeg-labels-01',
      assetId: 'asset:eeg-labels',
      collectionId: 'device-eeg-10-20',
      parentId: 'eeg-cap-01',
      visible: true,
      transform: {
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      origin: { policy: 'asset-origin' },
    },
  ],
}

describe('SequenceTargetRef contract', () => {
  it('bildet Ontologie, Atlas-Rolle und EEG-Site auf stabile Object-Graph-IDs ab', () => {
    const ontology = sequenceTargetRefFromOntologyNode(ontologyNode)
    const atlas = sequenceTargetRefFromAtlasRole('julich', 'ACC')
    const eeg = sequenceTargetRefFromEegSite('Fz')

    expect(ontology).toEqual({
      targetKind: 'ontology-node',
      collectionId: 'taro',
      ontologyNodeId: 'left-anterior-cingulate-gyrus',
    })
    expect(objectGraphIdForTarget(ontology)).toBe('target:ontology-node:taro:left-anterior-cingulate-gyrus')
    expect(objectGraphIdForTarget(atlas)).toBe('target:atlas-role:julich:ACC')
    expect(objectGraphIdForTarget(eeg)).toBe('target:eeg-site:device-eeg-10-20:Fz')
    expect(parseSequenceTargetRef(JSON.parse(toSequenceTargetRefJson(eeg)))).toEqual(eeg)
  })

  it('bildet AuthoringScene-Instanzen und Parts deterministisch ab', () => {
    const instance = deviceScene.assetInstances[0]
    const selectable = instance.parts![0]
    const helper = instance.parts![1]

    expect(sequenceTargetRefFromAssetInstance(instance)).toEqual({
      targetKind: 'asset-instance',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
    })
    expect(sequenceTargetRefFromAssetPart(instance, selectable)).toEqual({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    })

    const graph = objectGraphNodesForAuthoringScene(deviceScene)

    expect(graph).toEqual([
      {
        nodeId: 'target:asset-instance:device-eeg-10-20:eeg-cap-01',
        nodeKind: 'import-root',
        label: 'eeg-cap-01',
        targetRef: { targetKind: 'asset-instance', collectionId: 'device-eeg-10-20', instanceId: 'eeg-cap-01' },
        parentNodeId: null,
        pickable: true,
        outlinerVisible: true,
        helper: false,
      },
      {
        nodeId: 'target:asset-part:device-eeg-10-20:eeg-cap-01:electrode-fz',
        nodeKind: 'part',
        label: 'Fz electrode',
        targetRef: {
          targetKind: 'asset-part',
          collectionId: 'device-eeg-10-20',
          instanceId: 'eeg-cap-01',
          partId: 'electrode-fz',
        },
        parentNodeId: 'target:asset-instance:device-eeg-10-20:eeg-cap-01',
        pickable: true,
        outlinerVisible: true,
        helper: false,
      },
      {
        nodeId: 'target:asset-part:device-eeg-10-20:eeg-cap-01:alignment-helper-ring',
        nodeKind: 'part',
        label: 'Alignment helper ring',
        targetRef: {
          targetKind: 'asset-part',
          collectionId: 'device-eeg-10-20',
          instanceId: 'eeg-cap-01',
          partId: 'alignment-helper-ring',
        },
        parentNodeId: 'target:asset-instance:device-eeg-10-20:eeg-cap-01',
        pickable: false,
        outlinerVisible: false,
        helper: true,
      },
      {
        nodeId: 'target:asset-instance:device-eeg-10-20:eeg-labels-01',
        nodeKind: 'import-root',
        label: 'eeg-labels-01',
        targetRef: { targetKind: 'asset-instance', collectionId: 'device-eeg-10-20', instanceId: 'eeg-labels-01' },
        parentNodeId: 'target:asset-instance:device-eeg-10-20:eeg-cap-01',
        pickable: true,
        outlinerVisible: true,
        helper: false,
      },
    ])
    expect(objectGraphIdForTarget(sequenceTargetRefFromAssetPart(instance, helper))).toBe(
      'target:asset-part:device-eeg-10-20:eeg-cap-01:alignment-helper-ring',
    )
  })

  it('rekonstruiert TargetRefs aus Object-Graph-IDs fuer Explorer-Asset-Leaves', () => {
    expect(sequenceTargetRefFromObjectGraphId(
      'target:asset-part:case-phineas-gage:phineas-gage-iron-rod-01:iron-rod',
    )).toEqual({
      targetKind: 'asset-part',
      collectionId: 'case-phineas-gage',
      instanceId: 'phineas-gage-iron-rod-01',
      partId: 'iron-rod',
    })
    expect(sequenceTargetRefFromObjectGraphId('case-phineas-gage:iron-rod')).toBeNull()
  })

  it('macht unbekannte Targets sichtbar, ohne den Resolver werfen zu lassen', () => {
    const resolved = resolveSequenceTargetRef(sequenceTargetRefFromEegSite('Cz'), {
      collections: ['device-eeg-10-20'],
      eegSites: ['Fz'],
    })

    expect(resolved).toEqual({
      status: 'unknown',
      objectGraphId: 'target:eeg-site:device-eeg-10-20:Cz',
      reason: 'eegSite "Cz" ist nicht definiert',
      targetRef: { targetKind: 'eeg-site', collectionId: 'device-eeg-10-20', eegSite: 'Cz' },
    })

    expect(resolveSequenceTargetRef({
      targetKind: 'asset-instance',
      collectionId: 'wrong-collection',
      instanceId: 'eeg-cap-01',
    }, {
      authoringScene: deviceScene,
    })).toEqual({
      status: 'unknown',
      objectGraphId: 'target:asset-instance:wrong-collection:eeg-cap-01',
      reason: 'instanceId "wrong-collection/eeg-cap-01" ist nicht definiert',
      targetRef: { targetKind: 'asset-instance', collectionId: 'wrong-collection', instanceId: 'eeg-cap-01' },
    })

    expect(resolveSequenceTargetRef({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'ghost-instance',
      partId: 'electrode-fz',
    }, {
      assetPartIds: ['electrode-fz'],
    })).toEqual({
      status: 'unknown',
      objectGraphId: 'target:asset-part:device-eeg-10-20:ghost-instance:electrode-fz',
      reason: 'partId "device-eeg-10-20/ghost-instance/electrode-fz" ist nicht definiert',
      targetRef: {
        targetKind: 'asset-part',
        collectionId: 'device-eeg-10-20',
        instanceId: 'ghost-instance',
        partId: 'electrode-fz',
      },
    })
  })

  it('lehnt ungueltige TargetRefs laut ab', () => {
    expect(() => parseSequenceTargetRef({
      targetKind: 'eeg-site',
      collectionId: 'device-eeg-10-20',
      eegSite: 'Unknown',
    })).toThrow(/eegSite/)

    expect(() => parseSequenceTargetRef({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
    })).toThrow(/partId/)

    expect(() => parseSequenceTargetRef({
      targetKind: 'ontology-node',
      collectionId: 'taro',
      ontologyNodeId: 'acc',
      extra: true,
    })).toThrow(/unbekanntes Feld/)
  })
})
