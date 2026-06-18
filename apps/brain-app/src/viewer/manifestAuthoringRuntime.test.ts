import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AssetManifestDocument } from './assetManifest'
import {
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  type AuthoringSnapshotState,
} from './authoringSnapshotStore'
import {
  MANIFEST_AUTHORING_SCENE_ID,
  ensureManifestAuthoringState,
  manifestAuthoringTransform,
} from './manifestAuthoringRuntime'
import type { AuthoringTransform } from './authoringScene'

const appRoot = process.cwd()

function readPhineasManifest(): AssetManifestDocument {
  return JSON.parse(readFileSync(resolve(appRoot, 'public/assets/phineas/asset-manifest.json'), 'utf8'))
}

describe('manifest authoring runtime', () => {
  it('materialisiert manifestbasierte Runtime-Assets als persistierbare AuthoringScene', () => {
    const manifest = readPhineasManifest()
    const authoring = ensureManifestAuthoringState(null, manifest)

    expect(authoring.activeSceneId).toBe(MANIFEST_AUTHORING_SCENE_ID)
    expect(authoring.registryContext.collectionIds).toEqual(['case-phineas-gage'])
    expect(authoring.authoringScenes).toHaveLength(1)
    expect(authoring.authoringScenes[0].assetInstances.map((instance) => instance.instanceId)).toEqual([
      'phineas-gage-skull-base-01',
      'phineas-gage-skull-calvaria-01',
      'phineas-gage-iron-rod-01',
    ])
  })

  it('ueberschreibt gespeicherte User-Transforms beim Manifest-Refresh nicht', () => {
    const manifest = readPhineasManifest()
    const initial = ensureManifestAuthoringState(null, manifest)
    const editedTransform: AuthoringTransform = {
      position: [3, -7, 11],
      rotation: [0.1, 0.2, 0.3],
      scale: [1.1, 1.2, 1.3],
    }
    const current: AuthoringSnapshotState = {
      ...initial,
      schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
      activeTargetRef: {
        targetKind: 'asset-part',
        collectionId: 'case-phineas-gage',
        instanceId: 'phineas-gage-iron-rod-01',
        partId: 'iron-rod',
      },
      authoringScenes: initial.authoringScenes.map((scene) => ({
        ...scene,
        assetInstances: scene.assetInstances.map((instance) => (
          instance.instanceId === 'phineas-gage-iron-rod-01'
            ? { ...instance, transform: editedTransform }
            : instance
        )),
      })),
    }

    const refreshed = ensureManifestAuthoringState(current, manifest)
    const rodAsset = manifest.assets.find((asset) => asset.runtimeInstanceId === 'phineas-gage-iron-rod-01')

    expect(rodAsset).toBeDefined()
    expect(refreshed.activeSceneId).toBe(MANIFEST_AUTHORING_SCENE_ID)
    expect(manifestAuthoringTransform(refreshed, rodAsset!)).toEqual(editedTransform)
  })
})
