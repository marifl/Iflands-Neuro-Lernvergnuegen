import { describe, expect, it } from 'vitest'
import { AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION, type AuthoringSnapshotState } from './authoringSnapshotStore'
import { AUTHORING_SCENE_SCHEMA_VERSION, type AuthoringAssetInstance } from './authoringScene'
import {
  IDENTITY_AUTHORING_TRANSFORM,
  activeAuthoringTransformTarget,
  applyAuthoringTransformCommand,
  applyAuthoringTransformDraft,
  applyAuthoringTransformTransaction,
  authoringTransformTargetByInstance,
  nudgeAuthoringTransform,
} from './authoringTransformRuntime'

const authoring: AuthoringSnapshotState = {
  schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  registryContext: { collectionIds: ['device-eeg-10-20'], bonusContextIds: ['eeg-erp-vcpt'] },
  authoringScenes: [
    {
      schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
      sceneId: 'vcpt-device-authoring',
      assetInstances: [
        {
          instanceId: 'eeg-cap-01',
          assetId: 'asset:eeg-cap-v1',
          collectionId: 'device-eeg-10-20',
          visible: true,
          transform: { position: [0, 1.2, 0], rotation: [0, 0.25, 0], scale: [0.8, 0.8, 0.8] },
          origin: { policy: 'asset-origin' },
          parts: [{ partId: 'electrode-fz', label: 'Fz electrode', pickable: true, role: 'selectable' }],
        },
      ],
    },
  ],
  timelines: [],
  activeSceneId: 'vcpt-device-authoring',
  activeTargetRef: {
    targetKind: 'asset-part',
    collectionId: 'device-eeg-10-20',
    instanceId: 'eeg-cap-01',
    partId: 'electrode-fz',
  },
}

describe('authoringTransformRuntime', () => {
  it('loest aktive Parts auf ihre transformierbare Asset-Instanz auf', () => {
    expect(activeAuthoringTransformTarget(authoring)).toEqual({
      sceneId: 'vcpt-device-authoring',
      instance: authoring.authoringScenes[0].assetInstances[0],
      targetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
      },
    })
  })

  it('wendet Transform-Aenderungen ueber einen serialisierten SetTransformCommand an', () => {
    const target = activeAuthoringTransformTarget(authoring)
    if (!target) throw new Error('target fehlt')
    const after = nudgeAuthoringTransform(target.instance.transform, 0, 0.25)
    const result = applyAuthoringTransformCommand(authoring, target, after, 'cmd:transform:eeg-cap-01:x-plus', 'Move X')

    expect(result.command).toMatchObject({
      schemaVersion: 1,
      commandId: 'cmd:transform:eeg-cap-01:x-plus',
      kind: 'set-transform',
      targetRef: target.targetRef,
      before: { position: [0, 1.2, 0], rotation: [0, 0.25, 0], scale: [0.8, 0.8, 0.8] },
      after: { position: [0.25, 1.2, 0], rotation: [0, 0.25, 0], scale: [0.8, 0.8, 0.8] },
    })
    expect(result.authoring.authoringScenes[0].assetInstances[0].transform.position).toEqual([0.25, 1.2, 0])
    expect(result.authoring.activeTargetRef).toEqual(authoring.activeTargetRef)
  })

  it('committed Transform-Drafts nach Instanz statt nach aktuell aktiver Auswahl', () => {
    const otherInstance: AuthoringAssetInstance = {
      ...authoring.authoringScenes[0].assetInstances[0],
      instanceId: 'eeg-cap-02',
      transform: { position: [9, 9, 9], rotation: [0, 0, 0], scale: [1, 1, 1] },
    }
    const withSecondActive: AuthoringSnapshotState = {
      ...authoring,
      authoringScenes: [{
        ...authoring.authoringScenes[0],
        assetInstances: [
          authoring.authoringScenes[0].assetInstances[0],
          otherInstance,
        ],
      }],
      activeTargetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-02',
      },
    }

    const result = applyAuthoringTransformDraft(withSecondActive, {
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      transform: { position: [3, 4, 5], rotation: [0.1, 0.2, 0.3], scale: [1.1, 1.2, 1.3] },
      commandId: 'cmd:transform:eeg-cap-01:draft-flush',
      label: 'Draft flush',
    })

    expect(authoringTransformTargetByInstance(withSecondActive, 'device-eeg-10-20', 'eeg-cap-01')?.targetRef).toEqual({
      targetKind: 'asset-instance',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
    })
    expect(result?.command).toMatchObject({
      commandId: 'cmd:transform:eeg-cap-01:draft-flush',
      targetRef: {
        targetKind: 'asset-instance',
        collectionId: 'device-eeg-10-20',
        instanceId: 'eeg-cap-01',
      },
      before: { position: [0, 1.2, 0], rotation: [0, 0.25, 0], scale: [0.8, 0.8, 0.8] },
      after: { position: [3, 4, 5], rotation: [0.1, 0.2, 0.3], scale: [1.1, 1.2, 1.3] },
    })
    expect(result?.authoring.authoringScenes[0].assetInstances[0].transform.position).toEqual([3, 4, 5])
    expect(result?.authoring.authoringScenes[0].assetInstances[1].transform.position).toEqual([9, 9, 9])
    expect(result?.authoring.activeTargetRef).toEqual(withSecondActive.activeTargetRef)
  })

  it('ignoriert Transform-Drafts ohne echte Aenderung', () => {
    expect(applyAuthoringTransformDraft(authoring, {
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      transform: authoring.authoringScenes[0].assetInstances[0].transform,
      commandId: 'cmd:transform:eeg-cap-01:no-op',
    })).toBeNull()
  })

  it('committed eine Editor-artige Transform-Transaktion mit explizitem Drag-Start', () => {
    const result = applyAuthoringTransformTransaction(authoring, {
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      before: { position: [1, 2, 3], rotation: [0.1, 0.2, 0.3], scale: [1, 1, 1] },
      after: { position: [4, 5, 6], rotation: [0.4, 0.5, 0.6], scale: [1.2, 1.3, 1.4] },
      commandId: 'cmd:transform:eeg-cap-01:mouse-up',
      label: 'Transform eeg-cap-01',
    })

    expect(result?.command.before).toEqual({
      position: [1, 2, 3],
      rotation: [0.1, 0.2, 0.3],
      scale: [1, 1, 1],
    })
    expect(result?.command.after).toEqual({
      position: [4, 5, 6],
      rotation: [0.4, 0.5, 0.6],
      scale: [1.2, 1.3, 1.4],
    })
    expect(result?.authoring.authoringScenes[0].assetInstances[0].transform.position).toEqual([4, 5, 6])
  })

  it('stellt einen expliziten Reset-Transform bereit', () => {
    expect(IDENTITY_AUTHORING_TRANSFORM).toEqual({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    })
  })
})
