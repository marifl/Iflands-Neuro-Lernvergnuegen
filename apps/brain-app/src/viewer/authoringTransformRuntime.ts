import {
  createSetTransformCommand,
  executeAuthoringCommandInScenes,
  type SetTransformAuthoringCommand,
} from './authoringCommands'
import type { AuthoringSnapshotState } from './authoringSnapshotStore'
import type { AuthoringAssetInstance, AuthoringScene, AuthoringTransform, Vec3 } from './authoringScene'
import type { SequenceTargetRef } from './sequenceTargetRef'

export const IDENTITY_AUTHORING_TRANSFORM: AuthoringTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
}

export interface ActiveAuthoringTransformTarget {
  sceneId: string
  instance: AuthoringAssetInstance
  targetRef: Extract<SequenceTargetRef, { targetKind: 'asset-instance' }>
}

export interface AuthoringTransformDraftInput {
  collectionId: string
  instanceId: string
  transform: AuthoringTransform
  commandId: string
  label?: string
}

export interface AuthoringTransformTransactionInput {
  collectionId: string
  instanceId: string
  before: AuthoringTransform
  after: AuthoringTransform
  commandId: string
  label?: string
}

export interface AuthoringTransformCommandResult {
  authoring: AuthoringSnapshotState
  command: SetTransformAuthoringCommand
}

function vec3(values: readonly number[], field: string): Vec3 {
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`AuthoringTransform: ${field} muss drei finite Zahlen enthalten`)
  }
  return [values[0], values[1], values[2]]
}

function normalizeAuthoringTransform(transform: AuthoringTransform): AuthoringTransform {
  return {
    position: vec3(transform.position, 'position'),
    rotation: vec3(transform.rotation, 'rotation'),
    scale: vec3(transform.scale, 'scale'),
  }
}

function sameAuthoringTransform(a: AuthoringTransform, b: AuthoringTransform): boolean {
  return (
    a.position.every((value, index) => value === b.position[index]) &&
    a.rotation.every((value, index) => value === b.rotation[index]) &&
    a.scale.every((value, index) => value === b.scale[index])
  )
}

function targetInstanceRef(ref: SequenceTargetRef | undefined): Extract<SequenceTargetRef, { targetKind: 'asset-instance' }> | null {
  if (!ref) return null
  if (ref.targetKind === 'asset-instance') return ref
  if (ref.targetKind === 'asset-part') {
    return {
      targetKind: 'asset-instance',
      collectionId: ref.collectionId,
      instanceId: ref.instanceId,
    }
  }
  return null
}

export function authoringTransformTargetByInstance(
  authoring: AuthoringSnapshotState | null,
  collectionId: string,
  instanceId: string,
): ActiveAuthoringTransformTarget | null {
  if (!authoring) return null
  for (const scene of authoring.authoringScenes) {
    const instance = scene.assetInstances.find((candidate) =>
      candidate.collectionId === collectionId && candidate.instanceId === instanceId
    )
    if (instance) {
      return {
        sceneId: scene.sceneId,
        instance,
        targetRef: {
          targetKind: 'asset-instance',
          collectionId,
          instanceId,
        },
      }
    }
  }
  return null
}

export function activeAuthoringTransformTarget(authoring: AuthoringSnapshotState | null): ActiveAuthoringTransformTarget | null {
  if (!authoring) return null
  const targetRef = targetInstanceRef(authoring.activeTargetRef)
  if (!targetRef) return null
  const scene = authoring.authoringScenes.find((candidate) => candidate.sceneId === authoring.activeSceneId)
    ?? authoring.authoringScenes[0]
  if (!scene) return null
  const instance = scene.assetInstances.find((candidate) =>
    candidate.collectionId === targetRef.collectionId && candidate.instanceId === targetRef.instanceId
  )
  if (!instance) return null
  return { sceneId: scene.sceneId, instance, targetRef }
}

export function applyAuthoringTransformCommand(
  authoring: AuthoringSnapshotState,
  target: ActiveAuthoringTransformTarget,
  transform: AuthoringTransform,
  commandId: string,
  label?: string,
): AuthoringTransformCommandResult {
  const after = normalizeAuthoringTransform(transform)
  const command = createSetTransformCommand(
    authoring.authoringScenes.find((scene) => scene.sceneId === target.sceneId)
      ?? { schemaVersion: 1, sceneId: target.sceneId, assetInstances: [] },
    {
      commandId,
      targetRef: target.targetRef,
      after,
      ...(label === undefined ? {} : { label }),
    },
  )
  return {
    authoring: {
      ...authoring,
      authoringScenes: executeAuthoringCommandInScenes(authoring.authoringScenes, target.sceneId, command),
      activeTargetRef: authoring.activeTargetRef ?? target.targetRef,
    },
    command,
  }
}

function sceneWithInstanceTransform(
  scene: AuthoringScene,
  collectionId: string,
  instanceId: string,
  transform: AuthoringTransform,
): AuthoringScene {
  return {
    ...scene,
    assetInstances: scene.assetInstances.map((instance) => (
      instance.collectionId === collectionId && instance.instanceId === instanceId
        ? { ...instance, transform }
        : instance
    )),
  }
}

export function applyAuthoringTransformTransaction(
  authoring: AuthoringSnapshotState | null,
  input: AuthoringTransformTransactionInput,
): AuthoringTransformCommandResult | null {
  const target = authoringTransformTargetByInstance(authoring, input.collectionId, input.instanceId)
  if (!authoring || !target) return null
  const before = normalizeAuthoringTransform(input.before)
  const after = normalizeAuthoringTransform(input.after)
  if (sameAuthoringTransform(before, after)) return null

  const scene = authoring.authoringScenes.find((candidate) => candidate.sceneId === target.sceneId)
  if (!scene) return null
  const command = createSetTransformCommand(
    sceneWithInstanceTransform(scene, input.collectionId, input.instanceId, before),
    {
      commandId: input.commandId,
      targetRef: target.targetRef,
      after,
      ...(input.label === undefined ? {} : { label: input.label }),
    },
  )
  return {
    authoring: {
      ...authoring,
      authoringScenes: executeAuthoringCommandInScenes(authoring.authoringScenes, target.sceneId, command),
      activeTargetRef: authoring.activeTargetRef ?? target.targetRef,
    },
    command,
  }
}

export function applyAuthoringTransformDraft(
  authoring: AuthoringSnapshotState | null,
  input: AuthoringTransformDraftInput,
): AuthoringTransformCommandResult | null {
  const target = authoringTransformTargetByInstance(authoring, input.collectionId, input.instanceId)
  if (!authoring || !target) return null
  const after = normalizeAuthoringTransform(input.transform)
  if (sameAuthoringTransform(target.instance.transform, after)) return null
  return applyAuthoringTransformCommand(
    authoring,
    target,
    after,
    input.commandId,
    input.label,
  )
}

export function nudgeAuthoringTransform(
  transform: AuthoringTransform,
  axis: 0 | 1 | 2,
  delta: number,
): AuthoringTransform {
  const next = normalizeAuthoringTransform(transform)
  next.position = [...next.position] as Vec3
  next.position[axis] += delta
  return next
}
