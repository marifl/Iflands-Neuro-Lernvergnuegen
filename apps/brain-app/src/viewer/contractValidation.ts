import {
  parseAssetManifestDocument,
  type AssetManifestDocument,
  type AssetManifestEntry,
} from './assetManifest'
import { parseAuthoringScene, type AuthoringScene } from './authoringScene'
import { BONUS_CONTEXTS, type BonusContext, type BonusContextTarget } from './bonusContexts'
import { isEegSite } from './eegElectrodes'
import { KNOWLEDGE_COLLECTIONS, type KnowledgeCollection, type KnowledgeAssetSlot } from './knowledgeRegistry'
import type { SequenceTargetRef } from './sequenceTargetRef'
import { parseTimelineDocument, type TimelineDocument } from './timelineDocument'
import { parseViewerStateSnapshot, type ViewerStateSnapshot, type ViewerStateSnapshotState } from './viewerStateSnapshot'

export const BRAIN_APP_CONTRACT_SCHEMA_VERSION = 1

export interface BrainAppContractFixture {
  schemaVersion: number
  ontologyNodeIds: readonly string[]
  atlasRoles: readonly string[]
  sceneIds: readonly string[]
  configNames?: readonly string[]
  collections?: readonly KnowledgeCollection[]
  bonusContexts?: readonly BonusContext[]
  assetManifest?: unknown
  authoringScenes?: readonly unknown[]
  timelines?: readonly unknown[]
  snapshots?: readonly unknown[]
}

export interface BrainAppContractReport {
  schemaVersion: typeof BRAIN_APP_CONTRACT_SCHEMA_VERSION
  ok: boolean
  errors: string[]
}

interface ContractContext {
  collections: readonly KnowledgeCollection[]
  collectionIds: Set<string>
  bonusContextIds: Set<string>
  ontologyNodeIds: Set<string>
  atlasRoles: Set<string>
  sceneIds: Set<string>
  configNames: Set<string>
  assetManifest: AssetManifestDocument | null
  authoringInstances: Set<string>
  authoringParts: Set<string>
  errors: string[]
}

const SNAPSHOT_VALIDATION_FALLBACK: ViewerStateSnapshotState = {
  activePreset: null,
  appMode: 'explore',
  cameraPose: null,
  cameraView: null,
  clipAtlasOverlay: false,
  colorMode: 'region',
  cutMode: 'slice',
  cuts: {
    sagittal: { on: false, pos: 0 },
    coronal: { on: false, pos: 0 },
    axial: { on: false, pos: 0 },
  },
  hidden: [],
  highlight: [],
  isolated: null,
  lang: 'de',
  mode: 'full',
  pickedAtlasArea: null,
  pickedAtlasSlug: null,
  rodPhase: 0,
  rodVisible: false,
  route: null,
  selectMode: 'group',
  selected: null,
  showAtlasDkt: false,
  showAtlasJulich: false,
  showCarveBrodmann: false,
  showCarveDkt: false,
  showCarveJulich: false,
  showSkull: false,
  skullOpacity: 1,
}

function add(errors: string[], path: string, message: string): void {
  errors.push(`${path}: ${message}`)
}

function parseOrReport<T>(path: string, raw: unknown, parse: (value: unknown) => T, errors: string[]): T | null {
  try {
    return parse(raw)
  } catch (error) {
    add(errors, path, error instanceof Error ? error.message : String(error))
    return null
  }
}

function idKey(...parts: readonly string[]): string {
  return parts.join('/')
}

function assetMatchesSlot(asset: AssetManifestEntry, slot: KnowledgeAssetSlot, path: string, ctx: ContractContext): void {
  const slotId = idKey(asset.collectionId, slot.id)
  if (!slot.formats.includes(asset.format)) {
    add(ctx.errors, path, `format "${asset.format}" passt nicht zu Slot ${slotId}`)
  }
  if (asset.optional !== slot.optional) {
    add(ctx.errors, path, `optional ${asset.optional} passt nicht zu Slot ${slotId} optional ${slot.optional}`)
  }
}

function validateAssetManifest(ctx: ContractContext): void {
  const manifest = ctx.assetManifest
  if (!manifest) return
  manifest.assets.forEach((asset, index) => {
    const path = `assetManifest.assets[${index}]`
    const collection = ctx.collections.find((candidate) => candidate.id === asset.collectionId)
    if (!collection) {
      add(ctx.errors, path, `collectionId "${asset.collectionId}" ist nicht bekannt`)
      return
    }
    const slot = collection.assetSlots?.find((candidate) => candidate.id === asset.slotId)
    if (!slot) {
      add(ctx.errors, path, `slot "${asset.collectionId}/${asset.slotId}" ist nicht in der Registry deklariert`)
      return
    }
    assetMatchesSlot(asset, slot, path, ctx)
  })
  ctx.collections.forEach((collection) => {
    collection.assetSlots?.forEach((slot) => {
      const hasAsset = manifest.assets.some((asset) => asset.collectionId === collection.id && asset.slotId === slot.id)
      if (!hasAsset && !slot.optional) add(ctx.errors, `collections.${collection.id}.assetSlots.${slot.id}`, 'required Asset fehlt')
    })
  })
}

function validateTarget(target: BonusContextTarget, path: string, ctx: ContractContext): void {
  if (target.kind === 'scene' && !ctx.sceneIds.has(target.id)) add(ctx.errors, path, `scene "${target.id}" ist nicht bekannt`)
  if (target.kind === 'eeg-site' && !isEegSite(target.id)) add(ctx.errors, path, `eeg-site "${target.id}" ist nicht bekannt`)
  if (target.kind === 'atlas-role' && !ctx.atlasRoles.has(target.id)) add(ctx.errors, path, `atlas-role "${target.id}" ist nicht bekannt`)
  if (target.kind === 'ontology-node' && !ctx.ontologyNodeIds.has(target.id)) {
    add(ctx.errors, path, `ontology-node "${target.id}" ist nicht bekannt`)
  }
}

function validateBonusContexts(contexts: readonly BonusContext[], ctx: ContractContext): void {
  const seen = new Set<string>()
  contexts.forEach((context) => {
    const path = `bonusContexts.${context.id}`
    if (seen.has(context.id)) add(ctx.errors, path, `doppelte Kontext-ID "${context.id}"`)
    seen.add(context.id)
    context.collectionIds.forEach((collectionId, index) => {
      if (!ctx.collectionIds.has(collectionId)) add(ctx.errors, `${path}.collectionIds[${index}]`, `collection "${collectionId}" ist nicht bekannt`)
    })
    context.targets.forEach((target, index) => validateTarget(target, `${path}.targets[${index}]`, ctx))
    const hints = context.animationHints
    if (!hints) return
    if (hints.sceneId && !ctx.sceneIds.has(hints.sceneId)) add(ctx.errors, `${path}.animationHints.sceneId`, `scene "${hints.sceneId}" ist nicht bekannt`)
    if (hints.configName && ctx.configNames.size > 0 && !ctx.configNames.has(hints.configName)) {
      add(ctx.errors, `${path}.animationHints.configName`, `config "${hints.configName}" ist nicht bekannt`)
    }
    hints.eegSites?.forEach((site, index) => {
      if (!isEegSite(site)) add(ctx.errors, `${path}.animationHints.eegSites[${index}]`, `eeg-site "${site}" ist nicht bekannt`)
    })
  })
}

function addAuthoringScene(scene: AuthoringScene, path: string, ctx: ContractContext): void {
  scene.assetInstances.forEach((instance, index) => {
    const instancePath = `${path}.assetInstances[${index}]`
    if (!ctx.collectionIds.has(instance.collectionId)) add(ctx.errors, `${instancePath}.collectionId`, `collection "${instance.collectionId}" ist nicht bekannt`)
    if (ctx.assetManifest && !ctx.assetManifest.assets.some((asset) =>
      asset.collectionId === instance.collectionId && asset.assetId === instance.assetId,
    )) {
      add(ctx.errors, `${instancePath}.assetId`, `asset "${instance.assetId}" ist nicht im Asset-Manifest`)
    }
    ctx.authoringInstances.add(idKey(instance.collectionId, instance.instanceId))
    instance.parts?.forEach((part) => ctx.authoringParts.add(idKey(instance.collectionId, instance.instanceId, part.partId)))
  })
}

function validateTargetRef(ref: SequenceTargetRef, path: string, ctx: ContractContext): void {
  if (!ctx.collectionIds.has(ref.collectionId)) add(ctx.errors, `${path}.collectionId`, `collection "${ref.collectionId}" ist nicht bekannt`)
  if (ref.targetKind === 'ontology-node' && !ctx.ontologyNodeIds.has(ref.ontologyNodeId)) {
    add(ctx.errors, path, `ontology-node "${ref.ontologyNodeId}" ist nicht bekannt`)
  }
  if (ref.targetKind === 'atlas-role' && !ctx.atlasRoles.has(ref.atlasRole)) add(ctx.errors, path, `atlas-role "${ref.atlasRole}" ist nicht bekannt`)
  if (ref.targetKind === 'asset-instance' && ctx.authoringInstances.size > 0 && !ctx.authoringInstances.has(idKey(ref.collectionId, ref.instanceId))) {
    add(ctx.errors, path, `asset-instance "${idKey(ref.collectionId, ref.instanceId)}" ist nicht bekannt`)
  }
  if (ref.targetKind === 'asset-part' && ctx.authoringParts.size > 0 && !ctx.authoringParts.has(idKey(ref.collectionId, ref.instanceId, ref.partId))) {
    add(ctx.errors, path, `asset-part "${idKey(ref.collectionId, ref.instanceId, ref.partId)}" ist nicht bekannt`)
  }
}

function validateTimeline(timeline: TimelineDocument, path: string, ctx: ContractContext): void {
  const route = timeline.restore.route
  if (route?.sceneId && !ctx.sceneIds.has(route.sceneId)) add(ctx.errors, `${path}.restore.route.sceneId`, `scene "${route.sceneId}" ist nicht bekannt`)
  if (route?.configName && ctx.configNames.size > 0 && !ctx.configNames.has(route.configName)) {
    add(ctx.errors, `${path}.restore.route.configName`, `config "${route.configName}" ist nicht bekannt`)
  }
  timeline.steps.forEach((step, stepIndex) => step.keyframes.forEach((keyframe, keyframeIndex) => {
    const channels = keyframe.channels
    const base = `${path}.steps[${stepIndex}].keyframes[${keyframeIndex}].channels`
    if (channels.overlay?.sceneId && !ctx.sceneIds.has(channels.overlay.sceneId)) {
      add(ctx.errors, `${base}.overlay.sceneId`, `scene "${channels.overlay.sceneId}" ist nicht bekannt`)
    }
    if (channels.overlay?.configName && ctx.configNames.size > 0 && !ctx.configNames.has(channels.overlay.configName)) {
      add(ctx.errors, `${base}.overlay.configName`, `config "${channels.overlay.configName}" ist nicht bekannt`)
    }
    channels.collections?.forEach((entry, index) => {
      if (!ctx.collectionIds.has(entry.collectionId)) add(ctx.errors, `${base}.collections[${index}].collectionId`, `collection "${entry.collectionId}" ist nicht bekannt`)
    })
    channels.contexts?.forEach((entry, index) => {
      if (!ctx.bonusContextIds.has(entry.contextId)) add(ctx.errors, `${base}.contexts[${index}].contextId`, `bonus-context "${entry.contextId}" ist nicht bekannt`)
      if (entry.collectionId && !ctx.collectionIds.has(entry.collectionId)) add(ctx.errors, `${base}.contexts[${index}].collectionId`, `collection "${entry.collectionId}" ist nicht bekannt`)
    })
    channels.labels?.forEach((entry, index) => validateTargetRef(entry.targetRef, `${base}.labels[${index}].targetRef`, ctx))
    channels.annotations?.forEach((entry, index) => validateTargetRef(entry.targetRef, `${base}.annotations[${index}].targetRef`, ctx))
    channels.objects?.forEach((entry, index) => validateTargetRef(entry.targetRef, `${base}.objects[${index}].targetRef`, ctx))
    channels.animation?.forEach((entry, index) => {
      if (entry.targetRef) validateTargetRef(entry.targetRef, `${base}.animation[${index}].targetRef`, ctx)
    })
  }))
}

function validateSnapshot(snapshot: ViewerStateSnapshot, path: string, ctx: ContractContext): void {
  const route = snapshot.state.route
  if (route?.sceneId && !ctx.sceneIds.has(route.sceneId)) add(ctx.errors, `${path}.state.route.sceneId`, `scene "${route.sceneId}" ist nicht bekannt`)
  if (route?.configName && ctx.configNames.size > 0 && !ctx.configNames.has(route.configName)) {
    add(ctx.errors, `${path}.state.route.configName`, `config "${route.configName}" ist nicht bekannt`)
  }
}

export function validateBrainAppContracts(input: BrainAppContractFixture): BrainAppContractReport {
  const collections = input.collections ?? KNOWLEDGE_COLLECTIONS
  const bonusContexts = input.bonusContexts ?? BONUS_CONTEXTS
  const errors: string[] = []
  if (input.schemaVersion !== BRAIN_APP_CONTRACT_SCHEMA_VERSION) add(errors, 'schemaVersion', `Version "${input.schemaVersion}" wird nicht unterstuetzt`)
  const assetManifest = input.assetManifest === undefined
    ? null
    : parseOrReport('assetManifest', input.assetManifest, parseAssetManifestDocument, errors)
  const ctx: ContractContext = {
    collections,
    collectionIds: new Set(collections.map((collection) => collection.id)),
    bonusContextIds: new Set(bonusContexts.map((context) => context.id)),
    ontologyNodeIds: new Set(input.ontologyNodeIds),
    atlasRoles: new Set(input.atlasRoles),
    sceneIds: new Set(input.sceneIds),
    configNames: new Set(input.configNames ?? []),
    assetManifest,
    authoringInstances: new Set(),
    authoringParts: new Set(),
    errors,
  }
  validateAssetManifest(ctx)
  validateBonusContexts(bonusContexts, ctx)
  input.authoringScenes?.forEach((raw, index) => {
    const scene = parseOrReport(`authoringScenes[${index}]`, raw, parseAuthoringScene, errors)
    if (scene) addAuthoringScene(scene, `authoringScenes[${index}]`, ctx)
  })
  input.timelines?.forEach((raw, index) => {
    const timeline = parseOrReport(`timelines[${index}]`, raw, parseTimelineDocument, errors)
    if (timeline) validateTimeline(timeline, `timelines[${index}]`, ctx)
  })
  input.snapshots?.forEach((raw, index) => {
    const snapshot = parseOrReport(
      `snapshots[${index}]`,
      raw,
      (value) => parseViewerStateSnapshot(value, SNAPSHOT_VALIDATION_FALLBACK),
      errors,
    )
    if (snapshot) validateSnapshot(snapshot, `snapshots[${index}]`, ctx)
  })
  return { schemaVersion: BRAIN_APP_CONTRACT_SCHEMA_VERSION, ok: errors.length === 0, errors }
}

export function assertBrainAppContracts(input: BrainAppContractFixture): void {
  const report = validateBrainAppContracts(input)
  if (!report.ok) throw new Error(`BrainAppContracts: ${report.errors.join('; ')}`)
}
