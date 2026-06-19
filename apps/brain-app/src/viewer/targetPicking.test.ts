import { describe, expect, it } from 'vitest'
import { Group, Mesh } from 'three'
import {
  OBJECT_GRAPH_ID_USER_DATA,
  SEQUENCE_TARGET_REF_USER_DATA,
  TARGET_PICKABLE_USER_DATA,
  isAuthoringTargetRef,
  isSequenceTargetPickableMesh,
  ontologyMeshTargetUserData,
  pickTargetFromOntologyMeshName,
  pickTargetFromTargetRef,
  resolvePickTargetFromObject,
  sequenceTargetUserData,
} from './targetPicking'

describe('targetPicking', () => {
  it('bildet Ontologie-Meshnamen auf den aktuellen TargetRef-Vertrag ab', () => {
    expect(pickTargetFromOntologyMeshName('left-insula')).toEqual({
      targetRef: {
        targetKind: 'ontology-node',
        collectionId: 'taro',
        ontologyNodeId: 'left-insula',
      },
      objectGraphId: 'target:ontology-node:taro:left-insula',
      selectionId: 'left-insula',
    })
    expect(pickTargetFromOntologyMeshName('')).toBeNull()
  })

  it('stellt Target-UserData fuer pickbare Ontologie-Meshes bereit', () => {
    expect(ontologyMeshTargetUserData('left-insula')).toEqual({
      [SEQUENCE_TARGET_REF_USER_DATA]: {
        targetKind: 'ontology-node',
        collectionId: 'taro',
        ontologyNodeId: 'left-insula',
      },
      [OBJECT_GRAPH_ID_USER_DATA]: 'target:ontology-node:taro:left-insula',
      [TARGET_PICKABLE_USER_DATA]: true,
    })
    expect(ontologyMeshTargetUserData('')).toBeNull()
  })

  it('liest pickbare Asset-Parts aus Object3D-UserData', () => {
    const target = pickTargetFromTargetRef({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    }, 'Fz electrode')
    const mesh = new Mesh()
    mesh.userData = sequenceTargetUserData(target)

    expect(resolvePickTargetFromObject(mesh)).toEqual(target)
    expect(mesh.userData[SEQUENCE_TARGET_REF_USER_DATA]).toEqual(target.targetRef)
    expect(mesh.userData[OBJECT_GRAPH_ID_USER_DATA]).toBe(target.objectGraphId)
    expect(isSequenceTargetPickableMesh(mesh)).toBe(true)
    expect(isAuthoringTargetRef(target.targetRef)).toBe(true)
  })

  it('blockiert explizit nicht-pickbare Helper vor Parent-Fallback', () => {
    const target = pickTargetFromTargetRef({
      targetKind: 'asset-instance',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
    })
    const group = new Group()
    group.userData = sequenceTargetUserData(target)
    const helper = new Mesh()
    helper.userData[TARGET_PICKABLE_USER_DATA] = false
    group.add(helper)

    expect(resolvePickTargetFromObject(helper)).toBeNull()
  })
})
