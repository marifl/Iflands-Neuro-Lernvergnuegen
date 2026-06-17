import { describe, expect, it } from 'vitest'
import {
  AUTHORING_COMMAND_SCHEMA_VERSION,
  coalesceSetTransformTransaction,
  createAuthoringBatchCommand,
  createSetTransformCommand,
  executeAuthoringCommand,
  executeAuthoringCommandInScenes,
  parseAuthoringCommand,
  toAuthoringCommandJson,
  undoAuthoringCommand,
} from './authoringCommands'
import {
  AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION,
  emptyAuthoringCommandHistory,
  parseAuthoringCommandHistory,
  pushAuthoringCommand,
  redoAuthoringCommandHistory,
  toAuthoringCommandHistoryJson,
  undoAuthoringCommandHistory,
  type AuthoringCommandHistory,
} from './authoringCommandHistory'
import { AUTHORING_SCENE_SCHEMA_VERSION, type AuthoringScene, type AuthoringTransform } from './authoringScene'

const eegTransform: AuthoringTransform = {
  position: [0, 1.2, 0],
  rotation: [0, 0.25, 0],
  scale: [0.8, 0.8, 0.8],
}

const shiftedEegTransform: AuthoringTransform = {
  position: [0.2, 1.4, -0.1],
  rotation: [0, 0.5, 0],
  scale: [0.85, 0.85, 0.85],
}

const amplifierTransform: AuthoringTransform = {
  position: [0.6, 0.4, 0.3],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
}

const scene: AuthoringScene = {
  schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
  sceneId: 'vcpt-device-authoring',
  assetInstances: [
    {
      instanceId: 'eeg-cap-01',
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      visible: true,
      transform: eegTransform,
      origin: { policy: 'asset-origin' },
      parts: [
        {
          partId: 'electrode-fz',
          label: 'Fz electrode',
          nodeName: 'EEG_Fz',
          pickable: true,
          role: 'selectable',
        },
      ],
    },
    {
      instanceId: 'amplifier-01',
      assetId: 'asset:eeg-amplifier-v1',
      collectionId: 'device-eeg-10-20',
      visible: true,
      transform: amplifierTransform,
      origin: { policy: 'bounds-center' },
    },
  ],
}

const eegTarget = {
  targetKind: 'asset-instance' as const,
  collectionId: 'device-eeg-10-20',
  instanceId: 'eeg-cap-01',
}

const amplifierTarget = {
  targetKind: 'asset-instance' as const,
  collectionId: 'device-eeg-10-20',
  instanceId: 'amplifier-01',
}

describe('authoring command contract', () => {
  it('serialisiert SetTransform und fuehrt execute/undo gegen AuthoringScene aus', () => {
    const command = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:eeg-cap-01',
      targetRef: eegTarget,
      after: shiftedEegTransform,
      label: 'Move EEG cap',
    })
    const json = toAuthoringCommandJson(command)
    const executed = executeAuthoringCommand(scene, command)
    const undone = undoAuthoringCommand(executed, command)

    expect(command).toEqual({
      schemaVersion: AUTHORING_COMMAND_SCHEMA_VERSION,
      commandId: 'cmd:set-transform:eeg-cap-01',
      kind: 'set-transform',
      targetRef: eegTarget,
      before: eegTransform,
      after: shiftedEegTransform,
      label: 'Move EEG cap',
    })
    expect(parseAuthoringCommand(JSON.parse(json))).toEqual(command)
    expect(executed.assetInstances[0].transform).toEqual(shiftedEegTransform)
    expect(scene.assetInstances[0].transform).toEqual(eegTransform)
    expect(undone).toEqual(scene)
  })

  it('fasst Drag-Updates fuer ein Target zu einem abgeschlossenen Command zusammen', () => {
    const firstDragCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:drag:eeg-cap-01:1',
      targetRef: eegTarget,
      after: {
        position: [0.05, 1.25, 0],
        rotation: [0, 0.3, 0],
        scale: [0.8, 0.8, 0.8],
      },
    })
    const previewScene = executeAuthoringCommand(scene, firstDragCommand)
    const secondDragCommand = createSetTransformCommand(previewScene, {
      commandId: 'cmd:drag:eeg-cap-01:2',
      targetRef: eegTarget,
      after: shiftedEegTransform,
    })

    const coalesced = coalesceSetTransformTransaction({
      commandId: 'cmd:drag:eeg-cap-01',
      commands: [firstDragCommand, secondDragCommand],
      label: 'Drag EEG cap',
    })

    expect(coalesced.before).toEqual(eegTransform)
    expect(coalesced.after).toEqual(shiftedEegTransform)
    expect(executeAuthoringCommand(scene, coalesced).assetInstances[0].transform).toEqual(shiftedEegTransform)
  })

  it('lehnt gemischte Drag-Targets ab, statt eine falsche Transaction zu bauen', () => {
    const eegCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:drag:eeg-cap-01',
      targetRef: eegTarget,
      after: shiftedEegTransform,
    })
    const amplifierCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:drag:amplifier-01',
      targetRef: amplifierTarget,
      after: {
        position: [0.8, 0.4, 0.3],
        rotation: [0, 0.1, 0],
        scale: [1, 1, 1],
      },
    })

    expect(() => coalesceSetTransformTransaction({
      commandId: 'cmd:drag:mixed',
      commands: [eegCommand, amplifierCommand],
    })).toThrow(/gemischten targets/)
  })

  it('bereitet Multi-Object-Batching mit einem serialisierbaren Batch-Command vor', () => {
    const eegCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:eeg-cap-01',
      targetRef: eegTarget,
      after: shiftedEegTransform,
    })
    const amplifierCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:amplifier-01',
      targetRef: amplifierTarget,
      after: {
        position: [0.9, 0.4, 0.35],
        rotation: [0, 0.15, 0],
        scale: [1.1, 1.1, 1.1],
      },
    })
    const batch = createAuthoringBatchCommand({
      commandId: 'cmd:batch:device-layout',
      commands: [eegCommand, amplifierCommand],
      label: 'Move device setup',
    })

    const executed = executeAuthoringCommand(scene, batch)
    const undone = undoAuthoringCommand(executed, batch)

    expect(batch.commands).toHaveLength(2)
    expect(parseAuthoringCommand(JSON.parse(toAuthoringCommandJson(batch)))).toEqual(batch)
    expect(executed.assetInstances.map((instance) => instance.transform)).toEqual([
      shiftedEegTransform,
      {
        position: [0.9, 0.4, 0.35],
        rotation: [0, 0.15, 0],
        scale: [1.1, 1.1, 1.1],
      },
    ])
    expect(undone).toEqual(scene)
  })

  it('fuehrt Undo/Redo ueber den History-Cursor und verwirft Redo-Tail bei neuen Commands', () => {
    const firstCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:eeg-cap-01:first',
      targetRef: eegTarget,
      after: shiftedEegTransform,
    })
    const secondTransform: AuthoringTransform = {
      position: [0.4, 1.1, 0.1],
      rotation: [0, 0.75, 0],
      scale: [0.9, 0.9, 0.9],
    }
    const secondCommand = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:eeg-cap-01:second',
      targetRef: eegTarget,
      after: secondTransform,
    })
    const history = pushAuthoringCommand(emptyAuthoringCommandHistory(), firstCommand)
    const executed = executeAuthoringCommand(scene, firstCommand)
    const undone = undoAuthoringCommandHistory(executed, history)
    const redone = redoAuthoringCommandHistory(scene, undone.history)
    const replacedHistory = pushAuthoringCommand(undone.history, secondCommand)

    expect(history).toEqual({
      schemaVersion: AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION,
      commands: [firstCommand],
      cursor: 1,
    })
    expect(undone.scene).toEqual(scene)
    expect(undone.history.cursor).toBe(0)
    expect(redone.scene.assetInstances[0].transform).toEqual(shiftedEegTransform)
    expect(replacedHistory.commands).toEqual([secondCommand])
    expect(() => redoAuthoringCommandHistory(scene, replacedHistory)).toThrow(/Redo/)
  })

  it('serialisiert History und schreibt Commands in die kanonische AuthoringScene-Liste', () => {
    const command = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:eeg-cap-01',
      targetRef: eegTarget,
      after: shiftedEegTransform,
    })
    const history: AuthoringCommandHistory = pushAuthoringCommand(emptyAuthoringCommandHistory(), command)
    const otherScene: AuthoringScene = {
      schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
      sceneId: 'other-scene',
      assetInstances: [],
    }
    const scenes = executeAuthoringCommandInScenes([otherScene, scene], 'vcpt-device-authoring', command)

    expect(parseAuthoringCommandHistory(JSON.parse(toAuthoringCommandHistoryJson(history)))).toEqual(history)
    expect(scenes[0]).toEqual(otherScene)
    expect(scenes[1].assetInstances[0].transform).toEqual(shiftedEegTransform)
  })

  it('weist ungueltige Command-Dokumente laut zurueck', () => {
    const command = createSetTransformCommand(scene, {
      commandId: 'cmd:set-transform:eeg-cap-01',
      targetRef: eegTarget,
      after: shiftedEegTransform,
    })

    expect(() => parseAuthoringCommand({ ...command, schemaVersion: 999 })).toThrow(/schemaVersion/)
    expect(() => parseAuthoringCommand({
      ...command,
      targetRef: { ...eegTarget, targetKind: 'asset-part', partId: 'electrode-fz' },
    })).toThrow(/asset-instance/)
    expect(() => parseAuthoringCommandHistory({
      schemaVersion: AUTHORING_COMMAND_HISTORY_SCHEMA_VERSION,
      commands: [command],
      cursor: 2,
    })).toThrow(/cursor/)
  })
})
