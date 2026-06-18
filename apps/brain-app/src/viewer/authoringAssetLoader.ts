import {
  parseAssetManifestDocument,
  resolveAssetManifestSlot,
  type AssetManifestDocument,
  type AssetManifestEntry,
  type AssetManifestSlotRequest,
} from './assetManifest'
import {
  AUTHORING_SCENE_SCHEMA_VERSION,
  parseAuthoringScene,
  type AuthoringAssetInstance,
  type AuthoringScene,
  type AuthoringTransform,
  type Vec3,
} from './authoringScene'

export interface AuthoringAssetInstanceLoadRequest extends AssetManifestSlotRequest {
  instanceId: string
  visible?: boolean
}

export type AuthoringAssetInstanceLoadResult =
  | { status: 'loaded'; assetId: string; asset: AssetManifestEntry; instance: AuthoringAssetInstance }
  | { status: 'missing-optional'; assetId: string; reason: string }
  | { status: 'missing-required'; assetId: string; reason: string }

export type AuthoringAssetSceneLoadResult =
  | { status: 'loaded'; assetId: string; asset: AssetManifestEntry; instance: AuthoringAssetInstance; scene: AuthoringScene }
  | { status: 'missing-optional'; assetId: string; reason: string; scene: AuthoringScene }
  | { status: 'missing-required'; assetId: string; reason: string; scene: AuthoringScene }

function scaledVec3(values: Vec3, factor: number): Vec3 {
  return [values[0] * factor, values[1] * factor, values[2] * factor]
}

function manifestTransform(asset: AssetManifestEntry): AuthoringTransform {
  const { rootTransform, scale } = asset.normalization
  return {
    position: [...rootTransform.position],
    rotation: [...rootTransform.rotation],
    scale: scaledVec3(rootTransform.scale, scale),
  }
}

function parseSingleInstance(instance: AuthoringAssetInstance): AuthoringAssetInstance {
  const scene = parseAuthoringScene({
    schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
    sceneId: 'authoring-asset-loader-probe',
    assetInstances: [instance],
  })
  return scene.assetInstances[0]
}

function createInstance(asset: AssetManifestEntry, request: AuthoringAssetInstanceLoadRequest): AuthoringAssetInstance {
  return parseSingleInstance({
    instanceId: request.instanceId,
    assetId: asset.assetId,
    collectionId: asset.collectionId,
    visible: request.visible ?? true,
    transform: manifestTransform(asset),
    origin: asset.normalization.defaultPivot,
    parts: asset.parts.map((part) => ({
      partId: part.partId,
      label: part.label,
      nodeName: part.nodeName,
      pickable: part.pickable,
      role: part.role,
    })),
  })
}

export function loadAuthoringAssetInstanceFromManifestSlot(
  rawManifest: unknown,
  request: AuthoringAssetInstanceLoadRequest,
): AuthoringAssetInstanceLoadResult {
  const slot = resolveAssetManifestSlot(rawManifest, request)
  if (slot.status !== 'available') return slot
  const instance = createInstance(slot.asset, request)
  return {
    status: 'loaded',
    assetId: slot.asset.assetId,
    asset: slot.asset,
    instance,
  }
}

export function appendAuthoringAssetInstanceToScene(
  rawScene: AuthoringScene,
  instance: AuthoringAssetInstance,
): AuthoringScene {
  const scene = parseAuthoringScene(rawScene)
  if (scene.assetInstances.some((candidate) => candidate.instanceId === instance.instanceId)) {
    throw new Error(
      `AuthoringAssetLoader: instanceId "${instance.instanceId}" ist in scene "${scene.sceneId}" bereits definiert`,
    )
  }
  return parseAuthoringScene({
    ...scene,
    assetInstances: [...scene.assetInstances, instance],
  })
}

export function loadAuthoringAssetIntoScene(
  rawScene: AuthoringScene,
  rawManifest: unknown,
  request: AuthoringAssetInstanceLoadRequest,
): AuthoringAssetSceneLoadResult {
  const scene = parseAuthoringScene(rawScene)
  const resolution = loadAuthoringAssetInstanceFromManifestSlot(rawManifest, request)
  if (resolution.status !== 'loaded') return { ...resolution, scene }
  const nextScene = appendAuthoringAssetInstanceToScene(scene, resolution.instance)
  return { ...resolution, scene: nextScene }
}

export function createAuthoringSceneFromManifestSlot(
  rawManifest: unknown,
  sceneId: string,
  request: AuthoringAssetInstanceLoadRequest,
): AuthoringAssetSceneLoadResult {
  const emptyScene: AuthoringScene = {
    schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
    sceneId,
    assetInstances: [],
  }
  return loadAuthoringAssetIntoScene(emptyScene, rawManifest, request)
}

export function createAuthoringSceneFromManifestAssets(
  rawManifest: unknown,
  sceneId: string,
): AuthoringScene {
  const manifest: AssetManifestDocument = parseAssetManifestDocument(rawManifest)
  return parseAuthoringScene({
    schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
    sceneId,
    assetInstances: manifest.assets
      .filter((asset) => asset.runtimeInstanceId)
      .map((asset) => createInstance(asset, {
        collectionId: asset.collectionId,
        slotId: asset.slotId,
        assetId: asset.assetId,
        instanceId: asset.runtimeInstanceId ?? asset.assetId,
        optional: asset.optional,
      })),
  })
}
