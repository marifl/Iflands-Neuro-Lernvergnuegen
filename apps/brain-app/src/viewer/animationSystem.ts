import {
  parseAuthoringScene,
  type AuthoringScene,
} from './authoringScene'
import { ANIMATION_TIMELINES } from './animations'
import {
  parseTimelineDocument,
  type TimelineAnimationAction,
  type TimelineAnimationChannel,
  type TimelineDocument,
  type TimelineStep,
} from './timelineDocument'
import {
  objectGraphIdForTarget,
  resolveSequenceTargetRef,
  type SequenceTargetRef,
  type SequenceTargetResolveContext,
} from './sequenceTargetRef'

type AnimationBindingKind = 'timeline-highlight' | 'authoring-clip'

interface KnownAnimationBinding {
  kind: AnimationBindingKind
  bindingId: string
  clipId: string
  sourceId: string
  targetRef?: SequenceTargetRef
}

interface TimelineAnimationLocation {
  timelineId: string
  stepId: string
  keyframeId: string
}

export type TimelineAnimationBindingResolution =
  | (TimelineAnimationLocation & {
    status: 'resolved'
    bindingKind: AnimationBindingKind
    sourceId: string
    bindingId: string
    clipId: string
    action: TimelineAnimationAction
    targetRef?: SequenceTargetRef
    objectGraphId?: string
    timeMs?: number
  })
  | (TimelineAnimationLocation & {
    status: 'unknown'
    bindingId: string
    clipId: string
    action: TimelineAnimationAction
    reason: string
    targetRef?: SequenceTargetRef
    objectGraphId?: string
    timeMs?: number
  })

export interface TimelineAnimationResolveContext extends SequenceTargetResolveContext {
  authoringScenes?: readonly AuthoringScene[]
}

export function ontologyNodeTargetsForTimelineStep(step: TimelineStep): string[] {
  const seen = new Set<string>()
  for (const keyframe of step.keyframes) {
    for (const channel of keyframe.channels.animation ?? []) {
      const targetRef = channel.targetRef
      if (targetRef?.targetKind !== 'ontology-node') continue
      seen.add(targetRef.ontologyNodeId)
    }
  }
  return [...seen]
}

function authoringSceneBindings(rawScenes: readonly AuthoringScene[] = []): KnownAnimationBinding[] {
  return rawScenes.flatMap((rawScene) => {
    const scene = parseAuthoringScene(rawScene)
    return scene.assetInstances.flatMap((instance) =>
      (instance.clipBindings ?? []).map((binding) => {
        const targetRef: SequenceTargetRef = binding.targetPartId
          ? {
            targetKind: 'asset-part',
            collectionId: instance.collectionId,
            instanceId: instance.instanceId,
            partId: binding.targetPartId,
          }
          : {
            targetKind: 'asset-instance',
            collectionId: instance.collectionId,
            instanceId: instance.instanceId,
          }
        return {
          kind: 'authoring-clip',
          bindingId: binding.bindingId,
          clipId: binding.clipId,
          sourceId: `${scene.sceneId}/${instance.collectionId}/${instance.instanceId}`,
          targetRef,
        }
      }),
    )
  })
}

function timelineDocumentBindings(rawDocuments: readonly TimelineDocument[] = ANIMATION_TIMELINES): KnownAnimationBinding[] {
  return rawDocuments.flatMap((rawDocument) => {
    const document = parseTimelineDocument(rawDocument)
    return document.steps.flatMap((step) =>
      step.keyframes.flatMap((keyframe) =>
        (keyframe.channels.animation ?? []).flatMap((channel) => {
          if (!channel.targetRef) return []
          return [{
            kind: 'timeline-highlight' as const,
            bindingId: channel.bindingId,
            clipId: channel.clipId,
            sourceId: document.timelineId,
            targetRef: channel.targetRef,
          }]
        }),
      ),
    )
  })
}

function assetInstanceIds(scenes: readonly AuthoringScene[]): string[] {
  return scenes.flatMap((scene) =>
    scene.assetInstances.map((instance) => `${instance.collectionId}/${instance.instanceId}`),
  )
}

function assetPartIds(scenes: readonly AuthoringScene[]): string[] {
  return scenes.flatMap((scene) =>
    scene.assetInstances.flatMap((instance) =>
      (instance.parts ?? []).map((part) => `${instance.collectionId}/${instance.instanceId}/${part.partId}`),
    ),
  )
}

function bindingMatches(channel: TimelineAnimationChannel, binding: KnownAnimationBinding): boolean {
  return binding.bindingId === channel.bindingId && binding.clipId === channel.clipId
}

function knownBindings(context: TimelineAnimationResolveContext): KnownAnimationBinding[] {
  return [
    ...timelineDocumentBindings(),
    ...authoringSceneBindings(context.authoringScenes),
  ]
}

function targetContext(context: TimelineAnimationResolveContext): SequenceTargetResolveContext {
  const scenes = (context.authoringScenes ?? []).map((scene) => parseAuthoringScene(scene))
  return {
    ...(context.collections === undefined ? {} : { collections: context.collections }),
    ...(context.ontologyNodeIds === undefined ? {} : { ontologyNodeIds: context.ontologyNodeIds }),
    ...(context.atlasRoles === undefined ? {} : { atlasRoles: context.atlasRoles }),
    ...(context.eegSites === undefined ? {} : { eegSites: context.eegSites }),
    assetInstanceIds: [...(context.assetInstanceIds ?? []), ...assetInstanceIds(scenes)],
    assetPartIds: [...(context.assetPartIds ?? []), ...assetPartIds(scenes)],
  }
}

function unknownResolution(
  location: TimelineAnimationLocation,
  channel: TimelineAnimationChannel,
  reason: string,
  targetRef = channel.targetRef,
): TimelineAnimationBindingResolution {
  return {
    status: 'unknown',
    ...location,
    bindingId: channel.bindingId,
    clipId: channel.clipId,
    action: channel.action,
    reason,
    ...(targetRef === undefined ? {} : { targetRef, objectGraphId: objectGraphIdForTarget(targetRef) }),
    ...(channel.timeMs === undefined ? {} : { timeMs: channel.timeMs }),
  }
}

function resolvedResolution(
  location: TimelineAnimationLocation,
  channel: TimelineAnimationChannel,
  binding: KnownAnimationBinding,
  targetRef: SequenceTargetRef | undefined,
): TimelineAnimationBindingResolution {
  return {
    status: 'resolved',
    ...location,
    bindingKind: binding.kind,
    sourceId: binding.sourceId,
    bindingId: channel.bindingId,
    clipId: channel.clipId,
    action: channel.action,
    ...(targetRef === undefined ? {} : { targetRef, objectGraphId: objectGraphIdForTarget(targetRef) }),
    ...(channel.timeMs === undefined ? {} : { timeMs: channel.timeMs }),
  }
}

function resolveChannel(
  location: TimelineAnimationLocation,
  channel: TimelineAnimationChannel,
  bindings: readonly KnownAnimationBinding[],
  context: SequenceTargetResolveContext,
): TimelineAnimationBindingResolution {
  const matches = bindings.filter((binding) => bindingMatches(channel, binding))
  if (matches.length === 0) {
    return unknownResolution(location, channel, `bindingId "${channel.bindingId}" mit clipId "${channel.clipId}" ist nicht definiert`)
  }
  if (matches.length > 1) {
    return unknownResolution(location, channel, `bindingId "${channel.bindingId}" mit clipId "${channel.clipId}" ist mehrdeutig`)
  }

  const binding = matches[0]
  const targetRef = channel.targetRef ?? binding.targetRef
  if (channel.targetRef && binding.targetRef && objectGraphIdForTarget(channel.targetRef) !== objectGraphIdForTarget(binding.targetRef)) {
    return unknownResolution(location, channel, `targetRef passt nicht zu bindingId "${channel.bindingId}"`, targetRef)
  }
  if (!targetRef) return resolvedResolution(location, channel, binding, undefined)

  const targetResolution = resolveSequenceTargetRef(targetRef, context)
  if (targetResolution.status === 'unknown') {
    return unknownResolution(location, channel, targetResolution.reason, targetRef)
  }
  return resolvedResolution(location, channel, binding, targetRef)
}

export function resolveTimelineAnimationBindings(
  rawDocument: TimelineDocument,
  context: TimelineAnimationResolveContext = {},
): TimelineAnimationBindingResolution[] {
  const document = parseTimelineDocument(rawDocument)
  const bindings = knownBindings(context)
  const resolvedContext = targetContext(context)
  return document.steps.flatMap((step) =>
    step.keyframes.flatMap((keyframe) => {
      const location = { timelineId: document.timelineId, stepId: step.stepId, keyframeId: keyframe.keyframeId }
      return (keyframe.channels.animation ?? []).map((channel) =>
        resolveChannel(location, channel, bindings, resolvedContext),
      )
    }),
  )
}

export function assertTimelineAnimationBindings(
  document: TimelineDocument,
  context: TimelineAnimationResolveContext = {},
): void {
  const unknown = resolveTimelineAnimationBindings(document, context).filter((entry) => entry.status === 'unknown')
  if (unknown.length === 0) return
  throw new Error(unknown.map((entry) =>
    `TimelineAnimationSystem: ${entry.timelineId}/${entry.stepId}/${entry.keyframeId}/${entry.bindingId}: ${entry.reason}`,
  ).join('\n'))
}
