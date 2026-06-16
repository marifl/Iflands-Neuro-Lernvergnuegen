import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  parseAuthoringSnapshotState,
  toAuthoringSnapshotStateJson,
  useAuthoringSnapshotStore,
  type AuthoringSnapshotState,
} from './authoringSnapshotStore'

const authoringState: AuthoringSnapshotState = {
  schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  registryContext: {
    collectionIds: ['device-eeg-10-20'],
    bonusContextIds: ['eeg-erp-vcpt'],
  },
  authoringScenes: [
    {
      schemaVersion: 1,
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
            {
              partId: 'alignment-helper-ring',
              label: 'Alignment helper ring',
              pickable: false,
              role: 'helper',
            },
          ],
        },
      ],
    },
  ],
  timelines: [
    {
      schemaVersion: 1,
      timelineId: 'vcpt-device-timeline',
      restore: {
        stepId: 'vcpt-device-step',
        keyframeId: 'fz-highlight',
        route: {
          configName: 'vcpt',
          sceneId: 'vcpt',
          step: 0,
        },
      },
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
                objects: [
                  {
                    targetRef: {
                      targetKind: 'asset-instance',
                      collectionId: 'device-eeg-10-20',
                      instanceId: 'eeg-cap-01',
                    },
                    visible: true,
                    transform: {
                      position: [0, 1.2, 0],
                      rotation: [0, 0.25, 0],
                      scale: [0.8, 0.8, 0.8],
                    },
                  },
                ],
                animation: [
                  {
                    bindingId: 'fz-pulse',
                    clipId: 'clip:fz-pulse',
                    targetRef: {
                      targetKind: 'asset-part',
                      collectionId: 'device-eeg-10-20',
                      instanceId: 'eeg-cap-01',
                      partId: 'electrode-fz',
                    },
                    action: 'scrub',
                    timeMs: 1200,
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
  activeSceneId: 'vcpt-device-authoring',
  activeTargetRef: {
    targetKind: 'asset-part',
    collectionId: 'device-eeg-10-20',
    instanceId: 'eeg-cap-01',
    partId: 'electrode-fz',
  },
  activeTimeline: {
    timelineId: 'vcpt-device-timeline',
    stepId: 'vcpt-device-step',
    keyframeId: 'fz-highlight',
  },
  animationState: [
    {
      bindingId: 'fz-pulse',
      clipId: 'clip:fz-pulse',
      action: 'scrub',
      timeMs: 1200,
      targetRef: {
        targetKind: 'asset-part',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
        partId: 'electrode-fz',
      },
    },
  ],
}

describe('authoring snapshot store', () => {
  afterEach(() => {
    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()
  })

  it('roundtript AuthoringScene, Timeline-Cursor, TargetRef, Transform und Animation-State', () => {
    const parsed = parseAuthoringSnapshotState(authoringState)
    const json = toAuthoringSnapshotStateJson(authoringState)

    expect(parsed).toEqual(authoringState)
    expect(parseAuthoringSnapshotState(JSON.parse(json))).toEqual(authoringState)
    expect(parsed?.authoringScenes[0].assetInstances[0].transform).toEqual({
      position: [0, 1.2, 0],
      rotation: [0, 0.25, 0],
      scale: [0.8, 0.8, 0.8],
    })
    expect(parsed?.activeTargetRef).toEqual({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    })
  })

  it('weist fehlende aktive Objekt- oder Part-IDs sichtbar zurueck', () => {
    expect(() => parseAuthoringSnapshotState({
      ...authoringState,
      activeTargetRef: {
        targetKind: 'asset-part',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
        partId: 'electrode-missing',
      },
    })).toThrow(/electrode-missing/)
  })

  it('persistiert nur geparsten AuthoringSnapshotState im Store', () => {
    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState(authoringState)

    expect(useAuthoringSnapshotStore.getState().authoring).toEqual(authoringState)

    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()

    expect(useAuthoringSnapshotStore.getState().authoring).toBeNull()
  })
})
