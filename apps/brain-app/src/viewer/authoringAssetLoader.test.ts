import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST_SCHEMA_VERSION,
  type AssetManifestDocument,
} from './assetManifest'
import {
  AUTHORING_SCENE_SCHEMA_VERSION,
  type AuthoringScene,
} from './authoringScene'
import {
  appendAuthoringAssetInstanceToScene,
  createAuthoringSceneFromManifestSlot,
  loadAuthoringAssetInstanceFromManifestSlot,
  loadAuthoringAssetIntoScene,
} from './authoringAssetLoader'
import {
  objectGraphNodesForAuthoringScene,
  resolveSequenceTargetRef,
} from './sequenceTargetRef'
import {
  BRAIN_APP_CONTRACT_SCHEMA_VERSION,
  validateBrainAppContracts,
} from './contractValidation'
import {
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  parseAuthoringSnapshotState,
} from './authoringSnapshotStore'

const manifest: AssetManifestDocument = {
  schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
  manifestId: 'loader-assets',
  assets: [
    {
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      slotId: 'eeg-device-model',
      label: 'EEG cap device',
      uri: '/assets/devices/eeg/eeg-cap-v1.glb',
      format: 'glb',
      optional: true,
      version: '1.0.0',
      source: {
        kind: 'curated',
        provenance: 'synthetic EEG cap fixture for loader contract tests',
        license: 'internal-test-fixture',
        hash: `sha256:${'a'.repeat(64)}`,
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 0.001,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'asset-origin' },
        rootTransform: {
          position: [0, 1.2, 0],
          rotation: [0, 0.25, 0],
          scale: [2, 2, 2],
        },
      },
      materialPolicy: {
        materials: 'source-materials',
        transparency: 'alpha-blend',
        shareMaterials: true,
      },
      nodeNaming: {
        requireStableNodeNames: true,
        nodeNamePattern: '^[A-Za-z0-9_.:-]+$',
        partIdPattern: '^[a-z0-9][a-z0-9-]*$',
      },
      parts: [
        {
          partId: 'electrode-fz',
          label: 'Fz electrode',
          nodeName: 'EEG_Fz',
          pickable: true,
          role: 'selectable',
        },
        {
          partId: 'cap-helper-ring',
          label: 'Cap helper ring',
          nodeName: 'EEG_Helper_Ring',
          pickable: false,
          role: 'helper',
        },
      ],
    },
  ],
}

const loadRequest = {
  collectionId: 'device-eeg-10-20',
  slotId: 'eeg-device-model',
  assetId: 'asset:eeg-cap-v1',
  optional: true,
  instanceId: 'eeg-cap-01',
} as const

const emptyScene: AuthoringScene = {
  schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
  sceneId: 'vcpt-device-authoring',
  assetInstances: [],
}

const appRoot = process.cwd()

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

describe('authoring asset loader', () => {
  it('registriert einen GLB-Manifest-Slot als AuthoringScene-AssetInstance', () => {
    const result = createAuthoringSceneFromManifestSlot(manifest, 'vcpt-device-authoring', loadRequest)

    expect(result.status).toBe('loaded')
    if (result.status !== 'loaded') throw new Error(result.reason)
    expect(result.scene.assetInstances).toHaveLength(1)
    expect(result.instance).toMatchObject({
      instanceId: 'eeg-cap-01',
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      visible: true,
      transform: {
        position: [0, 1.2, 0],
        rotation: [0, 0.25, 0],
        scale: [0.002, 0.002, 0.002],
      },
      origin: { policy: 'asset-origin' },
      parts: [
        { partId: 'electrode-fz', nodeName: 'EEG_Fz', pickable: true, role: 'selectable' },
        { partId: 'cap-helper-ring', nodeName: 'EEG_Helper_Ring', pickable: false, role: 'helper' },
      ],
    })
  })

  it('erzeugt ObjectGraph- und SequenceTargetRef-kompatible Part-IDs', () => {
    const result = loadAuthoringAssetIntoScene(emptyScene, manifest, loadRequest)
    if (result.status !== 'loaded') throw new Error(result.reason)

    const nodes = objectGraphNodesForAuthoringScene(result.scene)
    expect(nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeKind: 'import-root',
        pickable: true,
        targetRef: {
          targetKind: 'asset-instance',
          collectionId: 'device-eeg-10-20',
          instanceId: 'eeg-cap-01',
        },
      }),
      expect.objectContaining({
        nodeKind: 'part',
        pickable: true,
        outlinerVisible: true,
        targetRef: {
          targetKind: 'asset-part',
          collectionId: 'device-eeg-10-20',
          instanceId: 'eeg-cap-01',
          partId: 'electrode-fz',
        },
      }),
      expect.objectContaining({
        nodeKind: 'part',
        pickable: false,
        outlinerVisible: false,
        helper: true,
      }),
    ]))
    expect(resolveSequenceTargetRef({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    }, { authoringScene: result.scene })).toMatchObject({ status: 'resolved' })
  })

  it('meldet fehlende optionale und required Assets ohne Scene-Mutation', () => {
    expect(loadAuthoringAssetIntoScene(emptyScene, manifest, {
      collectionId: 'device-eeg-10-20',
      slotId: 'optional-device-model',
      assetId: 'asset:optional-missing',
      optional: true,
      instanceId: 'optional-missing-01',
    })).toMatchObject({
      status: 'missing-optional',
      scene: emptyScene,
    })
    expect(loadAuthoringAssetIntoScene(emptyScene, manifest, {
      collectionId: 'device-eeg-10-20',
      slotId: 'required-device-model',
      assetId: 'asset:required-missing',
      optional: false,
      instanceId: 'required-missing-01',
    })).toMatchObject({
      status: 'missing-required',
      scene: emptyScene,
    })
  })

  it('verhindert Reloads, die authored Transform-State ueberschreiben wuerden', () => {
    const result = loadAuthoringAssetInstanceFromManifestSlot(manifest, loadRequest)
    if (result.status !== 'loaded') throw new Error(result.reason)
    const scene = appendAuthoringAssetInstanceToScene(emptyScene, {
      ...result.instance,
      transform: {
        position: [5, 6, 7],
        rotation: [0.1, 0.2, 0.3],
        scale: [0.8, 0.8, 0.8],
      },
    })

    expect(() => loadAuthoringAssetIntoScene(scene, manifest, loadRequest)).toThrow(/bereits definiert/)
    expect(scene.assetInstances[0].transform).toEqual({
      position: [5, 6, 7],
      rotation: [0.1, 0.2, 0.3],
      scale: [0.8, 0.8, 0.8],
    })
  })

  it('haelt instanceId im AuthoringScene-Scope eindeutig, auch wenn Collections differieren', () => {
    const result = loadAuthoringAssetInstanceFromManifestSlot(manifest, loadRequest)
    if (result.status !== 'loaded') throw new Error(result.reason)
    const scene = appendAuthoringAssetInstanceToScene(emptyScene, result.instance)

    expect(() => appendAuthoringAssetInstanceToScene(scene, {
      ...result.instance,
      assetId: 'asset:other-device-v1',
      collectionId: 'device-other',
    })).toThrow(/bereits definiert/)
  })

  it('liefert AuthoringScene-State, der durch die ContractValidation passt', () => {
    const result = loadAuthoringAssetIntoScene(emptyScene, manifest, loadRequest)
    if (result.status !== 'loaded') throw new Error(result.reason)

    const report = validateBrainAppContracts({
      schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION,
      ontologyNodeIds: [],
      atlasRoles: [],
      sceneIds: [],
      bonusContexts: [],
      assetManifest: manifest,
      authoringScenes: [result.scene],
    })

    expect(report).toEqual({
      schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION,
      ok: true,
      errors: [],
    })
  })

  it('legt die Phineas-GLBs ueber Registry-Slots als AuthoringScene an und laedt sie im Snapshot wieder', () => {
    const phineasManifest = readJsonFile(resolve(appRoot, 'public/assets/phineas/asset-manifest.json'))
    const sceneId = 'phineas-gage-authoring'
    const requests = [
      {
        collectionId: 'case-phineas-gage',
        slotId: 'historical-skull',
        assetId: 'phineas-gage-skull-lod',
        optional: true,
        instanceId: 'phineas-gage-skull-01',
      },
      {
        collectionId: 'case-phineas-gage',
        slotId: 'calvarium-cut',
        assetId: 'phineas-gage-skull-calvarium-cut-lod',
        optional: true,
        instanceId: 'phineas-gage-calvarium-cut-01',
      },
      {
        collectionId: 'case-phineas-gage',
        slotId: 'iron-rod',
        assetId: 'phineas-gage-iron-rod',
        optional: true,
        instanceId: 'phineas-gage-iron-rod-01',
      },
    ] as const

    let scene: AuthoringScene = {
      schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
      sceneId,
      assetInstances: [],
    }
    for (const request of requests) {
      const result = loadAuthoringAssetIntoScene(scene, phineasManifest, request)
      expect(result.status).toBe('loaded')
      if (result.status !== 'loaded') throw new Error(result.reason)
      scene = result.scene
    }

    expect(scene.assetInstances.map((instance) => instance.assetId)).toEqual([
      'phineas-gage-skull-lod',
      'phineas-gage-skull-calvarium-cut-lod',
      'phineas-gage-iron-rod',
    ])
    expect(scene.assetInstances.map((instance) => instance.collectionId)).toEqual([
      'case-phineas-gage',
      'case-phineas-gage',
      'case-phineas-gage',
    ])
    expect(scene.assetInstances.map((instance) => instance.transform)).toEqual([
      { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    ])
    expect(scene.assetInstances.flatMap((instance) => instance.parts?.map((part) => part.nodeName) ?? [])).toEqual([
      'phineas-gage-skull',
      'phineas-gage-skull-calvarium-cut',
      'phineas-gage-iron-rod',
    ])

    const authoringState = parseAuthoringSnapshotState({
      schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
      registryContext: {
        collectionIds: ['case-phineas-gage'],
        bonusContextIds: [],
      },
      authoringScenes: [scene],
      timelines: [],
      activeSceneId: sceneId,
      activeTargetRef: {
        targetKind: 'asset-part',
        collectionId: 'case-phineas-gage',
        instanceId: 'phineas-gage-iron-rod-01',
        partId: 'iron-rod',
      },
    })

    expect(authoringState?.authoringScenes[0]).toEqual(scene)
    expect(authoringState?.activeTargetRef).toEqual({
      targetKind: 'asset-part',
      collectionId: 'case-phineas-gage',
      instanceId: 'phineas-gage-iron-rod-01',
      partId: 'iron-rod',
    })

    const report = validateBrainAppContracts({
      schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION,
      ontologyNodeIds: [],
      atlasRoles: [],
      sceneIds: [],
      bonusContexts: [],
      assetManifest: phineasManifest,
      authoringScenes: [scene],
      snapshots: [
        {
          version: 1,
          state: { authoring: authoringState },
        },
      ],
    })

    expect(report).toEqual({
      schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION,
      ok: true,
      errors: [],
    })
  })
})
