import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTHORING_COMMAND_HISTORY_STORAGE_KEY,
  AUTHORING_SNAPSHOT_STORAGE_KEY,
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  parseAuthoringSnapshotState,
  toAuthoringSnapshotStateJson,
  useAuthoringSnapshotStore,
  type AuthoringSnapshotState,
} from './authoringSnapshotStore'
import { createSetTransformCommand, executeAuthoringCommand } from './authoringCommands'
import type { AuthoringTransform } from './authoringScene'

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
    expect(JSON.parse(localStorage.getItem(AUTHORING_SNAPSHOT_STORAGE_KEY)!)).toEqual(authoringState)

    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()

    expect(useAuthoringSnapshotStore.getState().authoring).toBeNull()
    expect(localStorage.getItem(AUTHORING_SNAPSHOT_STORAGE_KEY)).toBeNull()
  })

  it('fuehrt Authoring-Commands ueber Store-History rueckwaerts und vorwaerts aus', () => {
    const store = useAuthoringSnapshotStore.getState()
    store.setAuthoringSnapshotState(authoringState)
    const scene = authoringState.authoringScenes[0]
    const after: AuthoringTransform = {
      position: [2, 3, 4],
      rotation: [0.1, 0.2, 0.3],
      scale: [1.1, 1.2, 1.3],
    }
    const command = createSetTransformCommand(scene, {
      commandId: 'cmd:transform:eeg-cap-01:test',
      targetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
      },
      after,
    })

    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState({
      ...authoringState,
      authoringScenes: [executeAuthoringCommand(scene, command)],
    })
    useAuthoringSnapshotStore.getState().recordAuthoringCommand(command)

    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(1)
    expect(JSON.parse(localStorage.getItem(AUTHORING_COMMAND_HISTORY_STORAGE_KEY)!).cursor).toBe(1)
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform).toEqual(after)

    expect(useAuthoringSnapshotStore.getState().undoAuthoringCommand()).toBe(true)
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(0)
    expect(JSON.parse(localStorage.getItem(AUTHORING_COMMAND_HISTORY_STORAGE_KEY)!).cursor).toBe(0)
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform).toEqual({
      position: [0, 1.2, 0],
      rotation: [0, 0.25, 0],
      scale: [0.8, 0.8, 0.8],
    })
    expect(JSON.parse(localStorage.getItem(AUTHORING_SNAPSHOT_STORAGE_KEY)!).authoringScenes[0].assetInstances[0].transform).toEqual({
      position: [0, 1.2, 0],
      rotation: [0, 0.25, 0],
      scale: [0.8, 0.8, 0.8],
    })

    expect(useAuthoringSnapshotStore.getState().redoAuthoringCommand()).toBe(true)
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(1)
    expect(JSON.parse(localStorage.getItem(AUTHORING_COMMAND_HISTORY_STORAGE_KEY)!).cursor).toBe(1)
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform).toEqual(after)
  })

  it('ignoriert Undo/Redo an den History-Grenzen und leert History beim Reset', () => {
    expect(useAuthoringSnapshotStore.getState().undoAuthoringCommand()).toBe(false)
    expect(useAuthoringSnapshotStore.getState().redoAuthoringCommand()).toBe(false)

    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState(authoringState)
    const command = createSetTransformCommand(authoringState.authoringScenes[0], {
      commandId: 'cmd:transform:eeg-cap-01:test',
      targetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
      },
      after: {
        position: [2, 3, 4],
        rotation: [0.1, 0.2, 0.3],
        scale: [1.1, 1.2, 1.3],
      },
    })
    useAuthoringSnapshotStore.getState().recordAuthoringCommand(command)

    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()

    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory).toMatchObject({ commands: [], cursor: 0 })
    expect(localStorage.getItem(AUTHORING_COMMAND_HISTORY_STORAGE_KEY)).toBeNull()
  })

  it('springt ueber den sichtbaren History-Cursor zu aelteren Transform-Staenden', () => {
    const store = useAuthoringSnapshotStore.getState()
    store.setAuthoringSnapshotState(authoringState)
    const first = createSetTransformCommand(authoringState.authoringScenes[0], {
      commandId: 'cmd:transform:eeg-cap-01:first',
      targetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
      },
      after: {
        position: [2, 3, 4],
        rotation: [0.1, 0.2, 0.3],
        scale: [1.1, 1.2, 1.3],
      },
    })
    const afterFirstScene = executeAuthoringCommand(authoringState.authoringScenes[0], first)
    store.setAuthoringSnapshotState({
      ...authoringState,
      authoringScenes: [afterFirstScene],
    })
    store.recordAuthoringCommand(first)

    const second = createSetTransformCommand(afterFirstScene, {
      commandId: 'cmd:transform:eeg-cap-01:second',
      targetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
      },
      after: {
        position: [8, 9, 10],
        rotation: [0.4, 0.5, 0.6],
        scale: [1.4, 1.5, 1.6],
      },
    })
    store.setAuthoringSnapshotState({
      ...authoringState,
      authoringScenes: [executeAuthoringCommand(afterFirstScene, second)],
    })
    store.recordAuthoringCommand(second)

    expect(useAuthoringSnapshotStore.getState().jumpAuthoringCommandHistory(1)).toBe(true)
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(1)
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform.position).toEqual([2, 3, 4])

    expect(useAuthoringSnapshotStore.getState().jumpAuthoringCommandHistory(2)).toBe(true)
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(2)
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform.position).toEqual([8, 9, 10])
  })
})
