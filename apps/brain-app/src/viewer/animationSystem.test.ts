import { describe, expect, it } from 'vitest'
import {
  AUTHORING_SCENE_SCHEMA_VERSION,
  type AuthoringScene,
} from './authoringScene'
import {
  BASAL_GANGLIA_LOOP,
  type Animation,
} from './animations'
import {
  assertTimelineAnimationBindings,
  ontologyNodeTargetsForTimelineStep,
  resolveTimelineAnimationBindings,
  timelineDocumentFromAnimation,
} from './animationSystem'
import {
  TIMELINE_DOCUMENT_SCHEMA_VERSION,
  type TimelineDocument,
} from './timelineDocument'

const ontologyIds = [
  'left-middle-frontal-gyrus',
  'right-middle-frontal-gyrus',
  'left-superior-frontal-gyrus',
  'right-superior-frontal-gyrus',
  'left-caudate-nucleus',
  'right-caudate-nucleus',
  'left-putamen',
  'right-putamen',
  'left-globus-pallidus',
  'right-globus-pallidus',
  'left-substantia-nigra',
  'right-substantia-nigra',
  'left-ventral-anterior-nucleus',
  'right-ventral-anterior-nucleus',
  'caudal-part-of-left-ventral-lateral-nucleus',
  'caudal-part-of-right-ventral-lateral-nucleus',
]

const deviceScene: AuthoringScene = {
  schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
  sceneId: 'vcpt-device-authoring',
  assetInstances: [
    {
      instanceId: 'eeg-cap-01',
      assetId: 'asset:eeg-cap',
      collectionId: 'device-eeg-10-20',
      visible: true,
      transform: {
        position: [0, 1.2, 0],
        rotation: [0, 0.25, 0],
        scale: [0.8, 0.8, 0.8],
      },
      origin: { policy: 'asset-origin' },
      parts: [
        {
          partId: 'electrode-fz',
          label: 'Fz electrode',
          pickable: true,
          role: 'selectable',
        },
      ],
      clipBindings: [
        {
          bindingId: 'fz-pulse',
          clipId: 'clip:fz-pulse',
          targetPartId: 'electrode-fz',
        },
      ],
    },
  ],
}

const deviceTimeline: TimelineDocument = {
  schemaVersion: TIMELINE_DOCUMENT_SCHEMA_VERSION,
  timelineId: 'vcpt-device-timeline',
  restore: { stepId: 'vcpt-device-step', keyframeId: 'fz-highlight' },
  steps: [
    {
      stepId: 'vcpt-device-step',
      order: 0,
      durationMs: 3000,
      keyframes: [
        {
          keyframeId: 'fz-highlight',
          atMs: 0,
          channels: {
            animation: [
              {
                bindingId: 'fz-pulse',
                clipId: 'clip:fz-pulse',
                action: 'play',
              },
            ],
          },
        },
      ],
    },
  ],
}

describe('timeline animation system', () => {
  it('adaptiert legacy highlight steps in Timeline-Keyframes mit TargetRefs', () => {
    const timeline = timelineDocumentFromAnimation(BASAL_GANGLIA_LOOP)

    expect(timeline.timelineId).toBe('legacy-basal-ganglia-loop')
    expect(timeline.steps).toHaveLength(BASAL_GANGLIA_LOOP.steps.length)
    expect(timeline.steps[0].keyframes[0].channels.overlay).toMatchObject({
      title: BASAL_GANGLIA_LOOP.title,
      body: BASAL_GANGLIA_LOOP.steps[0].captionDe,
    })
    expect(ontologyNodeTargetsForTimelineStep(timeline.steps[0])).toEqual([
      'left-middle-frontal-gyrus',
      'right-middle-frontal-gyrus',
      'left-superior-frontal-gyrus',
      'right-superior-frontal-gyrus',
    ])
  })

  it('resolvt legacy animation bindings gegen stabile Ontologie-TargetRefs', () => {
    const timeline = timelineDocumentFromAnimation(BASAL_GANGLIA_LOOP)
    const resolutions = resolveTimelineAnimationBindings(timeline, {
      legacyAnimations: [BASAL_GANGLIA_LOOP],
      collections: ['taro'],
      ontologyNodeIds: ontologyIds,
    })

    expect(resolutions.every((entry) => entry.status === 'resolved')).toBe(true)
    expect(resolutions[0]).toMatchObject({
      status: 'resolved',
      bindingKind: 'legacy-highlight',
      sourceId: BASAL_GANGLIA_LOOP.id,
      bindingId: 'basal-ganglia-loop:highlight:1:left-middle-frontal-gyrus',
      clipId: 'legacy:basal-ganglia-loop',
      objectGraphId: 'target:ontology-node:taro:left-middle-frontal-gyrus',
      action: 'scrub',
    })
    expect(() => assertTimelineAnimationBindings(timeline, {
      legacyAnimations: [BASAL_GANGLIA_LOOP],
      collections: ['taro'],
      ontologyNodeIds: ontologyIds,
    })).not.toThrow()
  })

  it('nutzt AuthoringScene-ClipBindings als Erweiterungspunkt fuer GLTF-Mixer', () => {
    const resolutions = resolveTimelineAnimationBindings(deviceTimeline, {
      authoringScenes: [deviceScene],
      collections: ['device-eeg-10-20'],
    })

    expect(resolutions).toEqual([
      {
        status: 'resolved',
        timelineId: 'vcpt-device-timeline',
        stepId: 'vcpt-device-step',
        keyframeId: 'fz-highlight',
        bindingKind: 'authoring-clip',
        sourceId: 'vcpt-device-authoring/device-eeg-10-20/eeg-cap-01',
        bindingId: 'fz-pulse',
        clipId: 'clip:fz-pulse',
        action: 'play',
        targetRef: {
          targetKind: 'asset-part',
          collectionId: 'device-eeg-10-20',
          instanceId: 'eeg-cap-01',
          partId: 'electrode-fz',
        },
        objectGraphId: 'target:asset-part:device-eeg-10-20:eeg-cap-01:electrode-fz',
      },
    ])
  })

  it('meldet unbekannte Bindings und fehlende Targets ohne stille Fallbacks', () => {
    const unknownBinding: TimelineDocument = {
      ...deviceTimeline,
      steps: [{
        ...deviceTimeline.steps[0],
        keyframes: [{
          ...deviceTimeline.steps[0].keyframes[0],
          channels: {
            animation: [{
              bindingId: 'missing-pulse',
              clipId: 'clip:missing-pulse',
              action: 'play',
            }],
          },
        }],
      }],
    }

    expect(resolveTimelineAnimationBindings(unknownBinding, {
      authoringScenes: [deviceScene],
      collections: ['device-eeg-10-20'],
    })[0]).toMatchObject({
      status: 'unknown',
      reason: 'bindingId "missing-pulse" mit clipId "clip:missing-pulse" ist nicht definiert',
    })

    const missingTarget: Animation = {
      id: 'missing-node-demo',
      title: 'Missing node demo',
      source: 'test',
      steps: [{ structures: ['left-ghost-node'], captionDe: 'Missing target.' }],
    }
    const missingTargetTimeline = timelineDocumentFromAnimation(missingTarget)

    expect(() => assertTimelineAnimationBindings(missingTargetTimeline, {
      legacyAnimations: [missingTarget],
      collections: ['taro'],
      ontologyNodeIds: ontologyIds,
    })).toThrow(/left-ghost-node/)
  })

  it('weist Timeline-targetRef-Konflikte gegen registrierte ClipBindings zurueck', () => {
    const conflictingTarget: TimelineDocument = {
      ...deviceTimeline,
      steps: [{
        ...deviceTimeline.steps[0],
        keyframes: [{
          ...deviceTimeline.steps[0].keyframes[0],
          channels: {
            animation: [{
              bindingId: 'fz-pulse',
              clipId: 'clip:fz-pulse',
              action: 'play',
              targetRef: {
                targetKind: 'asset-instance',
                collectionId: 'device-eeg-10-20',
                instanceId: 'eeg-cap-01',
              },
            }],
          },
        }],
      }],
    }

    expect(resolveTimelineAnimationBindings(conflictingTarget, {
      authoringScenes: [deviceScene],
      collections: ['device-eeg-10-20'],
    })[0]).toMatchObject({
      status: 'unknown',
      reason: 'targetRef passt nicht zu bindingId "fz-pulse"',
    })
  })
})
