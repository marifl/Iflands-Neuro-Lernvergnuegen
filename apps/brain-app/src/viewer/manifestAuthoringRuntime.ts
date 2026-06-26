import { manifestRuntimeTransform, parseAssetManifestDocument, type AssetManifestEntry } from './assetManifest'
import { createAuthoringSceneFromManifestAssets } from './authoringAssetLoader'
import {
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  parseAuthoringSnapshotState,
  type AuthoringSnapshotState,
} from './authoringSnapshotStore'
import { type AuthoringScene, type AuthoringTransform } from './authoringScene'
import type { SequenceTargetRef } from './sequenceTargetRef'

export const MANIFEST_AUTHORING_SCENE_ID = 'manifest-assets-authoring'

function sceneContainsTarget(scene: AuthoringScene, targetRef: SequenceTargetRef): boolean {
  if (targetRef.targetKind !== 'asset-instance' && targetRef.targetKind !== 'asset-part') return false
  return scene.assetInstances.some((instance) =>
    instance.collectionId === targetRef.collectionId && instance.instanceId === targetRef.instanceId
  )
}

function mergeSceneInstances(current: AuthoringScene | undefined, manifestBaseline: AuthoringScene): AuthoringScene {
  if (!current) return manifestBaseline
  const existing = new Set(current.assetInstances.map((instance) => `${instance.collectionId}:${instance.instanceId}`))
  const missing = manifestBaseline.assetInstances.filter((instance) => !existing.has(`${instance.collectionId}:${instance.instanceId}`))
  if (missing.length === 0) return current
  return {
    ...current,
    assetInstances: [...current.assetInstances, ...missing],
  }
}

export function ensureManifestAuthoringState(
  current: AuthoringSnapshotState | null,
  rawManifest: unknown,
): AuthoringSnapshotState {
  const manifest = parseAssetManifestDocument(rawManifest)
  const manifestScene = createAuthoringSceneFromManifestAssets(manifest, MANIFEST_AUTHORING_SCENE_ID)
  const manifestCollectionIds = [...new Set(manifestScene.assetInstances.map((instance) => instance.collectionId))]
  const currentScenes = current?.authoringScenes ?? []
  const existingScene = currentScenes.find((scene) => scene.sceneId === MANIFEST_AUTHORING_SCENE_ID)
  const mergedScene = mergeSceneInstances(existingScene, manifestScene)
  const scenes = existingScene
    ? currentScenes.map((scene) => (scene.sceneId === MANIFEST_AUTHORING_SCENE_ID ? mergedScene : scene))
    : [...currentScenes, mergedScene]
  const activeTargetRef = current?.activeTargetRef
  const activeTargetSceneId = activeTargetRef
    ? scenes.find((scene) => sceneContainsTarget(scene, activeTargetRef))?.sceneId
    : undefined
  const activeSceneId = activeTargetSceneId ?? current?.activeSceneId ?? MANIFEST_AUTHORING_SCENE_ID

  return parseAuthoringSnapshotState({
    schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
    registryContext: {
      collectionIds: [...new Set([...(current?.registryContext.collectionIds ?? []), ...manifestCollectionIds])],
      bonusContextIds: current?.registryContext.bonusContextIds ?? [],
    },
    authoringScenes: scenes,
    timelines: current?.timelines ?? [],
    ...(activeSceneId === undefined ? {} : { activeSceneId }),
    ...(current?.activeTargetRef === undefined ? {} : { activeTargetRef: current.activeTargetRef }),
    ...(current?.activeTimeline === undefined ? {} : { activeTimeline: current.activeTimeline }),
    ...(current?.animationState === undefined ? {} : { animationState: current.animationState }),
  })!
}

export function manifestAuthoringTransform(
  authoring: AuthoringSnapshotState | null,
  asset: AssetManifestEntry,
): AuthoringTransform {
  const instanceId = asset.runtimeInstanceId
  if (!instanceId) return manifestRuntimeTransform(asset)
  const instance = authoring?.authoringScenes
    .flatMap((scene) => scene.assetInstances)
    .find((candidate) => candidate.collectionId === asset.collectionId && candidate.instanceId === instanceId)
  return instance?.transform ?? manifestRuntimeTransform(asset)
}

