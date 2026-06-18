import {
  parseAuthoringScene,
  type AuthoringAssetInstance,
  type AuthoringScene,
  type AuthoringSelectablePart,
} from './authoringScene'
import { isEegSite, type EegSite } from './eegElectrodes'
import type { OntologyNode } from './ontology'

export type SequenceTargetKind = 'ontology-node' | 'atlas-role' | 'eeg-site' | 'asset-instance' | 'asset-part'
export type ObjectGraphNodeKind = 'import-root' | 'part'

export type SequenceTargetRef =
  | { targetKind: 'ontology-node'; collectionId: string; ontologyNodeId: string }
  | { targetKind: 'atlas-role'; collectionId: string; atlasRole: string }
  | { targetKind: 'eeg-site'; collectionId: string; eegSite: EegSite }
  | { targetKind: 'asset-instance'; collectionId: string; instanceId: string }
  | { targetKind: 'asset-part'; collectionId: string; instanceId: string; partId: string }

export interface ObjectGraphNode {
  nodeId: string
  nodeKind: ObjectGraphNodeKind
  label: string
  targetRef: SequenceTargetRef
  parentNodeId: string | null
  pickable: boolean
  outlinerVisible: boolean
  helper: boolean
}

export interface SequenceTargetResolveContext {
  collections?: readonly string[]
  ontologyNodeIds?: readonly string[]
  atlasRoles?: readonly string[]
  eegSites?: readonly EegSite[]
  assetInstanceIds?: readonly string[]
  assetPartIds?: readonly string[]
  authoringScene?: AuthoringScene
}

export type SequenceTargetResolution =
  | { status: 'resolved'; objectGraphId: string; targetRef: SequenceTargetRef }
  | { status: 'unknown'; objectGraphId: string; targetRef: SequenceTargetRef; reason: string }

const TARGET_KINDS = ['ontology-node', 'atlas-role', 'eeg-site', 'asset-instance', 'asset-part'] as const satisfies readonly SequenceTargetKind[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`SequenceTargetRef: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`SequenceTargetRef: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`SequenceTargetRef: ${field} muss ein nicht-leerer String sein`)
  }
  return value
}

function targetKindValue(value: unknown): SequenceTargetKind {
  if (typeof value === 'string' && TARGET_KINDS.includes(value as SequenceTargetKind)) return value as SequenceTargetKind
  throw new Error('SequenceTargetRef: targetKind hat einen ungueltigen Wert')
}

function targetObjectGraphId(kind: SequenceTargetKind, segments: readonly string[]): string {
  return ['target', kind, ...segments].join(':')
}

export function objectGraphIdForTarget(ref: SequenceTargetRef): string {
  switch (ref.targetKind) {
    case 'ontology-node':
      return targetObjectGraphId(ref.targetKind, [ref.collectionId, ref.ontologyNodeId])
    case 'atlas-role':
      return targetObjectGraphId(ref.targetKind, [ref.collectionId, ref.atlasRole])
    case 'eeg-site':
      return targetObjectGraphId(ref.targetKind, [ref.collectionId, ref.eegSite])
    case 'asset-instance':
      return targetObjectGraphId(ref.targetKind, [ref.collectionId, ref.instanceId])
    case 'asset-part':
      return targetObjectGraphId(ref.targetKind, [ref.collectionId, ref.instanceId, ref.partId])
  }
}

export function sequenceTargetRefFromObjectGraphId(objectGraphId: string): SequenceTargetRef | null {
  const [prefix, targetKind, ...segments] = objectGraphId.split(':')
  if (prefix !== 'target' || !TARGET_KINDS.includes(targetKind as SequenceTargetKind)) return null
  const parsedKind = targetKind as SequenceTargetKind
  switch (parsedKind) {
    case 'ontology-node':
      if (segments.length !== 2) return null
      return { targetKind: parsedKind, collectionId: segments[0], ontologyNodeId: segments[1] }
    case 'atlas-role':
      if (segments.length !== 2) return null
      return { targetKind: parsedKind, collectionId: segments[0], atlasRole: segments[1] }
    case 'eeg-site':
      if (segments.length !== 2 || !isEegSite(segments[1])) return null
      return { targetKind: parsedKind, collectionId: segments[0], eegSite: segments[1] }
    case 'asset-instance':
      if (segments.length !== 2) return null
      return { targetKind: parsedKind, collectionId: segments[0], instanceId: segments[1] }
    case 'asset-part':
      if (segments.length !== 3) return null
      return { targetKind: parsedKind, collectionId: segments[0], instanceId: segments[1], partId: segments[2] }
  }
}

export function sequenceTargetRefFromOntologyNode(node: OntologyNode, collectionId = 'taro'): SequenceTargetRef {
  return { targetKind: 'ontology-node', collectionId, ontologyNodeId: node.id }
}

export function sequenceTargetRefFromAtlasRole(collectionId: string, atlasRole: string): SequenceTargetRef {
  return {
    targetKind: 'atlas-role',
    collectionId: requiredString(collectionId, 'collectionId'),
    atlasRole: requiredString(atlasRole, 'atlasRole'),
  }
}

export function sequenceTargetRefFromEegSite(eegSite: EegSite, collectionId = 'device-eeg-10-20'): SequenceTargetRef {
  return { targetKind: 'eeg-site', collectionId, eegSite }
}

export function sequenceTargetRefFromAssetInstance(instance: AuthoringAssetInstance): SequenceTargetRef {
  return {
    targetKind: 'asset-instance',
    collectionId: instance.collectionId,
    instanceId: instance.instanceId,
  }
}

export function sequenceTargetRefFromAssetPart(
  instance: AuthoringAssetInstance,
  part: AuthoringSelectablePart,
): SequenceTargetRef {
  return {
    targetKind: 'asset-part',
    collectionId: instance.collectionId,
    instanceId: instance.instanceId,
    partId: part.partId,
  }
}

export function parseSequenceTargetRef(raw: unknown): SequenceTargetRef {
  const value = assertRecord(raw, 'Root')
  const targetKind = targetKindValue(value.targetKind)
  switch (targetKind) {
    case 'ontology-node':
      assertKnownKeys(value, ['targetKind', 'collectionId', 'ontologyNodeId'], 'Root')
      return {
        targetKind,
        collectionId: requiredString(value.collectionId, 'collectionId'),
        ontologyNodeId: requiredString(value.ontologyNodeId, 'ontologyNodeId'),
      }
    case 'atlas-role':
      assertKnownKeys(value, ['targetKind', 'collectionId', 'atlasRole'], 'Root')
      return {
        targetKind,
        collectionId: requiredString(value.collectionId, 'collectionId'),
        atlasRole: requiredString(value.atlasRole, 'atlasRole'),
      }
    case 'eeg-site': {
      assertKnownKeys(value, ['targetKind', 'collectionId', 'eegSite'], 'Root')
      const eegSite = requiredString(value.eegSite, 'eegSite')
      if (!isEegSite(eegSite)) throw new Error(`SequenceTargetRef: eegSite "${eegSite}" ist nicht definiert`)
      return {
        targetKind,
        collectionId: requiredString(value.collectionId, 'collectionId'),
        eegSite,
      }
    }
    case 'asset-instance':
      assertKnownKeys(value, ['targetKind', 'collectionId', 'instanceId'], 'Root')
      return {
        targetKind,
        collectionId: requiredString(value.collectionId, 'collectionId'),
        instanceId: requiredString(value.instanceId, 'instanceId'),
      }
    case 'asset-part':
      assertKnownKeys(value, ['targetKind', 'collectionId', 'instanceId', 'partId'], 'Root')
      return {
        targetKind,
        collectionId: requiredString(value.collectionId, 'collectionId'),
        instanceId: requiredString(value.instanceId, 'instanceId'),
        partId: requiredString(value.partId, 'partId'),
      }
  }
}

export function toSequenceTargetRefJson(ref: SequenceTargetRef): string {
  return JSON.stringify(parseSequenceTargetRef(ref), null, 2)
}

function unknown(ref: SequenceTargetRef, reason: string): SequenceTargetResolution {
  return { status: 'unknown', objectGraphId: objectGraphIdForTarget(ref), reason, targetRef: ref }
}

function resolved(ref: SequenceTargetRef): SequenceTargetResolution {
  return { status: 'resolved', objectGraphId: objectGraphIdForTarget(ref), targetRef: ref }
}

function instanceKey(collectionId: string, instanceId: string): string {
  return `${collectionId}/${instanceId}`
}

function partKey(collectionId: string, instanceId: string, partId: string): string {
  return `${collectionId}/${instanceId}/${partId}`
}

function sceneInstanceKeys(scene: AuthoringScene): Set<string> {
  return new Set(scene.assetInstances.map((instance) => instanceKey(instance.collectionId, instance.instanceId)))
}

function scenePartKeys(scene: AuthoringScene): Set<string> {
  return new Set(scene.assetInstances.flatMap((instance) =>
    (instance.parts ?? []).map((part) => partKey(instance.collectionId, instance.instanceId, part.partId)),
  ))
}

export function resolveSequenceTargetRef(
  targetRef: SequenceTargetRef,
  context: SequenceTargetResolveContext = {},
): SequenceTargetResolution {
  const ref = parseSequenceTargetRef(targetRef)
  if (context.collections && !context.collections.includes(ref.collectionId)) {
    return unknown(ref, `collectionId "${ref.collectionId}" ist nicht definiert`)
  }
  switch (ref.targetKind) {
    case 'ontology-node':
      if (context.ontologyNodeIds && !context.ontologyNodeIds.includes(ref.ontologyNodeId)) {
        return unknown(ref, `ontologyNodeId "${ref.ontologyNodeId}" ist nicht definiert`)
      }
      return resolved(ref)
    case 'atlas-role':
      if (context.atlasRoles && !context.atlasRoles.includes(ref.atlasRole)) {
        return unknown(ref, `atlasRole "${ref.atlasRole}" ist nicht definiert`)
      }
      return resolved(ref)
    case 'eeg-site':
      if (context.eegSites && !context.eegSites.includes(ref.eegSite)) {
        return unknown(ref, `eegSite "${ref.eegSite}" ist nicht definiert`)
      }
      return resolved(ref)
    case 'asset-instance': {
      const ids = context.authoringScene ? sceneInstanceKeys(context.authoringScene) : new Set(context.assetInstanceIds ?? [])
      const key = instanceKey(ref.collectionId, ref.instanceId)
      if (ids.size > 0 && !ids.has(key)) {
        return unknown(ref, `instanceId "${key}" ist nicht definiert`)
      }
      return resolved(ref)
    }
    case 'asset-part': {
      const ids = context.authoringScene ? scenePartKeys(context.authoringScene) : new Set(context.assetPartIds ?? [])
      const key = partKey(ref.collectionId, ref.instanceId, ref.partId)
      if (ids.size > 0 && !ids.has(key)) {
        return unknown(ref, `partId "${key}" ist nicht definiert`)
      }
      return resolved(ref)
    }
  }
}

export function objectGraphNodesForAuthoringScene(raw: AuthoringScene): ObjectGraphNode[] {
  const scene = parseAuthoringScene(raw)
  const nodes: ObjectGraphNode[] = []
  for (const instance of scene.assetInstances) {
    const targetRef = sequenceTargetRefFromAssetInstance(instance)
    const nodeId = objectGraphIdForTarget(targetRef)
    nodes.push({
      nodeId,
      nodeKind: 'import-root',
      label: instance.instanceId,
      targetRef,
      parentNodeId: instance.parentId ? objectGraphIdForTarget({
        targetKind: 'asset-instance',
        collectionId: instance.collectionId,
        instanceId: instance.parentId,
      }) : null,
      pickable: true,
      outlinerVisible: true,
      helper: false,
    })
    for (const part of instance.parts ?? []) {
      const partTargetRef = sequenceTargetRefFromAssetPart(instance, part)
      const helper = part.role === 'helper'
      nodes.push({
        nodeId: objectGraphIdForTarget(partTargetRef),
        nodeKind: 'part',
        label: part.label,
        targetRef: partTargetRef,
        parentNodeId: nodeId,
        pickable: part.pickable,
        outlinerVisible: !helper,
        helper,
      })
    }
  }
  for (const node of nodes) {
    if (node.parentNodeId && !nodes.some((candidate) => candidate.nodeId === node.parentNodeId)) {
      throw new Error(`SequenceTargetRef: parentNodeId "${node.parentNodeId}" ist nicht definiert`)
    }
  }
  return nodes
}
