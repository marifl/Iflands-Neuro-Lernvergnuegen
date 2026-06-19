import { describe, expect, it } from 'vitest'
import {
  AUTHORING_SCENE_SCHEMA_VERSION,
  type AuthoringScene,
} from './authoringScene'
import {
  BASAL_GANGLIA_CLIP_ID,
  BASAL_GANGLIA_TIMELINE,
  BASAL_GANGLIA_TIMELINE_ID,
  timelineHighlightBindingId,
} from './animations'
import {
  assertTimelineAnimationBindings,
  ontologyNodeTargetsForTimelineStep,
  resolveTimelineAnimationBindings,
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
  it('liest registrierte Highlight-Steps als Timeline-Keyframes mit TargetRefs', () => {
    const timeline = BASAL_GANGLIA_TIMELINE

    expect(timeline.timelineId).toBe(BASAL_GANGLIA_TIMELINE_ID)
    expect(timeline.steps).toHaveLength(6)
    expect(timeline.steps[0].keyframes[0].channels.overlay).toMatchObject({
      title: 'Basalganglien-Schleife (DLPFC)',
      body: '1 — Praefrontaler Cortex (DLPFC): Der dorsolaterale Praefrontalcortex startet die Schleife und projiziert exzitatorisch (glutamaterg) ins Striatum.',
    })
    expect(ontologyNodeTargetsForTimelineStep(timeline.steps[0])).toEqual([
      'left-middle-frontal-gyrus',
      'right-middle-frontal-gyrus',
      'left-superior-frontal-gyrus',
      'right-superior-frontal-gyrus',
    ])
  })

  it('resolvt registrierte Timeline-Bindings gegen stabile Ontologie-TargetRefs', () => {
    const timeline = BASAL_GANGLIA_TIMELINE
    const resolutions = resolveTimelineAnimationBindings(timeline, {
      collections: ['taro'],
      ontologyNodeIds: ontologyIds,
    })

    expect(resolutions.every((entry) => entry.status === 'resolved')).toBe(true)
    expect(resolutions[0]).toMatchObject({
      status: 'resolved',
      bindingKind: 'timeline-highlight',
      sourceId: BASAL_GANGLIA_TIMELINE_ID,
      bindingId: timelineHighlightBindingId(BASAL_GANGLIA_TIMELINE_ID, 0, 'left-middle-frontal-gyrus'),
      clipId: BASAL_GANGLIA_CLIP_ID,
      objectGraphId: 'target:ontology-node:taro:left-middle-frontal-gyrus',
      action: 'scrub',
    })
    expect(() => assertTimelineAnimationBindings(timeline, {
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

    expect(() => assertTimelineAnimationBindings(BASAL_GANGLIA_TIMELINE, {
      collections: ['taro'],
      ontologyNodeIds: [],
    })).toThrow(/left-middle-frontal-gyrus/)
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
