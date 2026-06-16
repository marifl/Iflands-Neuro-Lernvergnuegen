import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST_SCHEMA_VERSION,
  type AssetManifestDocument,
} from './assetManifest'
import {
  AUTHORING_SCENE_SCHEMA_VERSION,
  type AuthoringScene,
} from './authoringScene'
import { BONUS_CONTEXTS_SCHEMA_VERSION } from './bonusContexts'
import {
  BRAIN_APP_CONTRACT_SCHEMA_VERSION,
  assertBrainAppContracts,
  validateBrainAppContracts,
  type BrainAppContractFixture,
} from './contractValidation'
import { KNOWLEDGE_REGISTRY_SCHEMA_VERSION } from './knowledgeRegistry'
import { REGISTRY_LAUNCH_SCHEMA_VERSION } from './registryLaunch'
import {
  TIMELINE_DOCUMENT_SCHEMA_VERSION,
  type TimelineDocument,
} from './timelineDocument'
import {
  VIEWER_STATE_SNAPSHOT_VERSION,
  parseViewerStateSnapshot,
} from './viewerStateSnapshot'

const assetManifest: AssetManifestDocument = {
  schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
  manifestId: 'contract-validation-assets',
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
        provenance: 'contract validation fixture',
        license: 'internal-test-fixture',
        hash: `sha256:${'a'.repeat(64)}`,
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 1,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'asset-origin' },
        rootTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
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
      ],
    },
  ],
}

const authoringScene: AuthoringScene = {
  schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
  sceneId: 'contract-validation-scene',
  assetInstances: [
    {
      instanceId: 'eeg-cap-01',
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      visible: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
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

const timeline: TimelineDocument = {
  schemaVersion: TIMELINE_DOCUMENT_SCHEMA_VERSION,
  timelineId: 'contract-validation-timeline',
  restore: {
    stepId: 'vcpt-device',
    keyframeId: 'start',
    route: { configName: 'vcpt', sceneId: 'vcpt', step: 0 },
  },
  steps: [
    {
      stepId: 'vcpt-device',
      order: 0,
      durationMs: 3000,
      keyframes: [
        {
          keyframeId: 'start',
          atMs: 0,
          channels: {
            overlay: { sceneId: 'vcpt', configName: 'vcpt', title: 'VCPT' },
            labels: [
              {
                labelId: 'fz-label',
                targetRef: { targetKind: 'eeg-site', collectionId: 'device-eeg-10-20', eegSite: 'Fz' },
                text: 'Fz',
                visible: true,
              },
            ],
            annotations: [
              {
                annotationId: 'acc-note',
                targetRef: {
                  targetKind: 'ontology-node',
                  collectionId: 'taro',
                  ontologyNodeId: 'left-anterior-cingulate-gyrus',
                },
                label: 'ACC',
                visible: true,
              },
            ],
            contexts: [
              { contextId: 'eeg-erp-vcpt', collectionId: 'device-eeg-10-20', active: true },
            ],
            collections: [
              { collectionId: 'device-eeg-10-20', visible: true },
            ],
            objects: [
              {
                targetRef: {
                  targetKind: 'asset-instance',
                  collectionId: 'device-eeg-10-20',
                  instanceId: 'eeg-cap-01',
                },
                visible: true,
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
                action: 'play',
              },
            ],
          },
        },
      ],
    },
  ],
}

const validFixture: BrainAppContractFixture = {
  schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION,
  ontologyNodeIds: [
    'left-straight-gyrus',
    'left-medial-orbital-gyrus',
    'left-medial-orbital-gyrus-v2',
    'left-anterior-orbital-gyrus',
    'left-posterior-orbital-gyrus',
    'left-lateral-orbital-gyrus',
    'left-subcallosal-area',
    'left-anterior-cingulate-gyrus',
  ],
  atlasRoles: ['ACC', 'OFC', 'VMPFC'],
  sceneIds: ['vcpt', 'p3a-konfliktmonitoring'],
  configNames: ['vcpt', 'p3a-konfliktmonitoring'],
  assetManifest,
  authoringScenes: [authoringScene],
  timelines: [timeline],
  snapshots: [
    {
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {
        route: { configName: 'vcpt', sceneId: 'vcpt', step: 0 },
      },
    },
  ],
}

describe('contract validation', () => {
  it('deklariert die aktuellen Dokumentversionen explizit', () => {
    expect(KNOWLEDGE_REGISTRY_SCHEMA_VERSION).toBe(1)
    expect(BONUS_CONTEXTS_SCHEMA_VERSION).toBe(1)
    expect(ASSET_MANIFEST_SCHEMA_VERSION).toBe(1)
    expect(AUTHORING_SCENE_SCHEMA_VERSION).toBe(1)
    expect(REGISTRY_LAUNCH_SCHEMA_VERSION).toBe(1)
    expect(TIMELINE_DOCUMENT_SCHEMA_VERSION).toBe(1)
    expect(VIEWER_STATE_SNAPSHOT_VERSION).toBe(1)
    expect(BRAIN_APP_CONTRACT_SCHEMA_VERSION).toBe(1)
  })

  it('validiert die Registry gegen Scene-, Ontologie-, Asset- und Timeline-Refs', () => {
    const report = validateBrainAppContracts(validFixture)

    expect(report).toEqual({
      schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION,
      ok: true,
      errors: [],
    })
    expect(() => assertBrainAppContracts(validFixture)).not.toThrow()
  })

  it('meldet Cross-Contract-Fehler mit stabilen Pfaden', () => {
    const report = validateBrainAppContracts({
      ...validFixture,
      sceneIds: ['p3a-konfliktmonitoring'],
      assetManifest: {
        ...assetManifest,
        assets: [
          {
            ...assetManifest.assets[0],
            optional: false,
          },
        ],
      },
    })

    expect(report.ok).toBe(false)
    expect(report.errors).toEqual(expect.arrayContaining([
      'bonusContexts.eeg-erp-vcpt.targets[0]: scene "vcpt" ist nicht bekannt',
      'timelines[0].steps[0].keyframes[0].channels.overlay.sceneId: scene "vcpt" ist nicht bekannt',
      'assetManifest.assets[0]: optional false passt nicht zu Slot device-eeg-10-20/eeg-device-model optional true',
    ]))
  })

  it('meldet Timeline-Animationen ohne registriertes ClipBinding', () => {
    const report = validateBrainAppContracts({
      ...validFixture,
      timelines: [
        {
          ...timeline,
          steps: [{
            ...timeline.steps[0],
            keyframes: [{
              ...timeline.steps[0].keyframes[0],
              channels: {
                animation: [{
                  bindingId: 'ghost-pulse',
                  clipId: 'clip:ghost-pulse',
                  action: 'play',
                }],
              },
            }],
          }],
        },
      ],
    })

    expect(report.ok).toBe(false)
    expect(report.errors).toContain(
      'timelines[0].steps.vcpt-device.keyframes.start.channels.animation.ghost-pulse: bindingId "ghost-pulse" mit clipId "clip:ghost-pulse" ist nicht definiert',
    )
  })

  it('validiert Authoring-State in Snapshots gegen Asset-Manifest und Timeline-Refs', () => {
    const report = validateBrainAppContracts({
      ...validFixture,
      snapshots: [
        {
          version: VIEWER_STATE_SNAPSHOT_VERSION,
          state: {
            authoring: {
              schemaVersion: 1,
              registryContext: {
                collectionIds: ['device-eeg-10-20'],
                bonusContextIds: ['eeg-erp-vcpt'],
              },
              authoringScenes: [
                {
                  ...authoringScene,
                  assetInstances: [
                    {
                      ...authoringScene.assetInstances[0],
                      assetId: 'asset:missing',
                    },
                  ],
                },
              ],
              timelines: [timeline],
              activeSceneId: authoringScene.sceneId,
              activeTimeline: {
                timelineId: timeline.timelineId,
                stepId: timeline.restore.stepId,
                keyframeId: timeline.restore.keyframeId,
              },
            },
          },
        },
      ],
    })

    expect(report.ok).toBe(false)
    expect(report.errors).toContain(
      'snapshots[0].state.authoring.authoringScenes[0].assetInstances[0].assetId: asset "asset:missing" ist nicht im Asset-Manifest',
    )
  })

  it('meldet Drift zwischen manifest-backed Authoring-Instanz und Asset-Manifest', () => {
    const report = validateBrainAppContracts({
      ...validFixture,
      authoringScenes: [
        {
          ...authoringScene,
          assetInstances: [
            {
              ...authoringScene.assetInstances[0],
              origin: { policy: 'bounds-center' },
              parts: [
                {
                  ...authoringScene.assetInstances[0].parts![0],
                  nodeName: 'EEG_Fz_renamed',
                },
                {
                  partId: 'extra-electrode',
                  label: 'Extra electrode',
                  nodeName: 'EEG_Extra',
                  pickable: true,
                  role: 'selectable',
                },
              ],
            },
          ],
        },
      ],
    })

    expect(report.ok).toBe(false)
    expect(report.errors).toEqual(expect.arrayContaining([
      'authoringScenes[0].assetInstances[0].origin: origin passt nicht zum Asset-Manifest fuer "asset:eeg-cap-v1"',
      'authoringScenes[0].assetInstances[0].parts: Part-Anzahl passt nicht zum Asset-Manifest fuer "asset:eeg-cap-v1"',
      'authoringScenes[0].assetInstances[0].parts.electrode-fz: Part-Metadaten passen nicht zum Asset-Manifest',
      'authoringScenes[0].assetInstances[0].parts.extra-electrode: Part ist nicht im Asset-Manifest definiert',
    ]))
  })

  it('parst Snapshots ohne Store-Mutation und weist unbekannte Versionen laut ab', () => {
    const snapshot = parseViewerStateSnapshot({
      version: VIEWER_STATE_SNAPSHOT_VERSION,
      state: {
        route: { configName: 'vcpt', sceneId: 'vcpt', step: 0 },
        colorMode: 'preset',
      },
    })

    expect(snapshot.version).toBe(VIEWER_STATE_SNAPSHOT_VERSION)
    expect(snapshot.state.route).toEqual({ configName: 'vcpt', sceneId: 'vcpt', step: 0 })
    expect(snapshot.state.colorMode).toBe('region')
    expect(() => parseViewerStateSnapshot({ version: 999, state: {} })).toThrow(/Snapshot-Version/)
  })
})
