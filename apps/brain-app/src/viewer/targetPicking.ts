import type { Mesh, Object3D } from 'three'
import {
  objectGraphIdForTarget,
  parseSequenceTargetRef,
  type SequenceTargetRef,
} from './sequenceTargetRef'

export const SEQUENCE_TARGET_REF_USER_DATA = 'sequenceTargetRef'
export const OBJECT_GRAPH_ID_USER_DATA = 'objectGraphId'
export const TARGET_PICKABLE_USER_DATA = 'targetPickable'
const TARGET_LABEL_USER_DATA = 'targetLabel'

export interface ViewerPickTarget {
  targetRef: SequenceTargetRef
  objectGraphId: string
  selectionId: string
  label?: string
}

function selectionIdForTargetRef(targetRef: SequenceTargetRef): string {
  if (targetRef.targetKind === 'ontology-node') return targetRef.ontologyNodeId
  return objectGraphIdForTarget(targetRef)
}

export function pickTargetFromTargetRef(targetRef: SequenceTargetRef, label?: string): ViewerPickTarget {
  const parsed = parseSequenceTargetRef(targetRef)
  return {
    targetRef: parsed,
    objectGraphId: objectGraphIdForTarget(parsed),
    selectionId: selectionIdForTargetRef(parsed),
    ...(label === undefined ? {} : { label }),
  }
}

export function pickTargetFromOntologyMeshName(meshName: string, label?: string): ViewerPickTarget | null {
  const ontologyNodeId = meshName.trim()
  if (ontologyNodeId === '') return null
  return pickTargetFromTargetRef({
    targetKind: 'ontology-node',
    collectionId: 'taro',
    ontologyNodeId,
  }, label)
}

export function ontologyMeshTargetUserData(meshName: string, label?: string, pickable = true): Record<string, unknown> | null {
  const target = pickTargetFromOntologyMeshName(meshName, label)
  return target ? sequenceTargetUserData(target, pickable) : null
}

export function isAuthoringTargetRef(targetRef: SequenceTargetRef): boolean {
  return targetRef.targetKind === 'asset-instance' || targetRef.targetKind === 'asset-part'
}

function isSequenceTargetPickableObject(obj: Object3D): boolean {
  return obj.userData[TARGET_PICKABLE_USER_DATA] === true && obj.userData[SEQUENCE_TARGET_REF_USER_DATA] !== undefined
}

export function isSequenceTargetPickableMesh(mesh: Mesh): boolean {
  return isSequenceTargetPickableObject(mesh)
}

function targetFromUserData(obj: Object3D): ViewerPickTarget | null {
  if (obj.userData[TARGET_PICKABLE_USER_DATA] === false) return null
  const rawTargetRef = obj.userData[SEQUENCE_TARGET_REF_USER_DATA]
  if (rawTargetRef === undefined) return null
  const label = typeof obj.userData[TARGET_LABEL_USER_DATA] === 'string'
    ? obj.userData[TARGET_LABEL_USER_DATA]
    : undefined
  return pickTargetFromTargetRef(rawTargetRef, label)
}

export function resolvePickTargetFromObject(obj: Object3D): ViewerPickTarget | null {
  let current: Object3D | null = obj
  while (current) {
    const target = targetFromUserData(current)
    if (target) return target
    if (current.userData[TARGET_PICKABLE_USER_DATA] === false) return null
    current = current.parent
  }
  return null
}

export function sequenceTargetUserData(target: ViewerPickTarget | SequenceTargetRef, pickable = true): Record<string, unknown> {
  const resolved = 'targetRef' in target ? target : pickTargetFromTargetRef(target)
  return {
    [SEQUENCE_TARGET_REF_USER_DATA]: resolved.targetRef,
    [OBJECT_GRAPH_ID_USER_DATA]: resolved.objectGraphId,
    [TARGET_PICKABLE_USER_DATA]: pickable,
    ...(resolved.label === undefined ? {} : { [TARGET_LABEL_USER_DATA]: resolved.label }),
  }
}

