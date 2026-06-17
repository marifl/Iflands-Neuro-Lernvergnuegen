import { create } from 'zustand'
import { parseAuthoringScene, type AuthoringScene } from './authoringScene'
import { BONUS_CONTEXTS } from './bonusContexts'
import { KNOWLEDGE_COLLECTIONS } from './knowledgeRegistry'
import {
  parseSequenceTargetRef,
  resolveSequenceTargetRef,
  type SequenceTargetRef,
} from './sequenceTargetRef'
import {
  parseTimelineDocument,
  type TimelineDocument,
  type TimelineAnimationAction,
} from './timelineDocument'

export const AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION = 1

export interface AuthoringRegistryContextState {
  collectionIds: string[]
  bonusContextIds: string[]
}

export interface AuthoringTimelineCursor {
  timelineId: string
  stepId: string
  keyframeId: string
}

export interface AuthoringAnimationState {
  bindingId: string
  clipId: string
  action: TimelineAnimationAction
  targetRef?: SequenceTargetRef
  timeMs?: number
}

export interface AuthoringSnapshotState {
  schemaVersion: typeof AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION
  registryContext: AuthoringRegistryContextState
  authoringScenes: AuthoringScene[]
  timelines: TimelineDocument[]
  activeSceneId?: string
  activeTargetRef?: SequenceTargetRef
  activeTimeline?: AuthoringTimelineCursor
  animationState?: AuthoringAnimationState[]
}

interface AuthoringSnapshotStoreState {
  authoring: AuthoringSnapshotState | null
  setAuthoringSnapshotState: (authoring: AuthoringSnapshotState | null) => void
  resetAuthoringSnapshotState: () => void
}

const ANIMATION_ACTIONS = ['play', 'pause', 'stop', 'scrub'] as const satisfies readonly TimelineAnimationAction[]
const knownCollectionIds = new Set(KNOWLEDGE_COLLECTIONS.map((collection) => collection.id))
const knownBonusContextIds = new Set(BONUS_CONTEXTS.map((context) => context.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`AuthoringSnapshotState: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`AuthoringSnapshotState: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`AuthoringSnapshotState: ${field} muss ein nicht-leerer String sein`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function nonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`AuthoringSnapshotState: ${field} muss eine nicht-negative finite Zahl sein`)
  }
  return value
}

function optionalNonNegativeNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  return nonNegativeNumber(value, field)
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`AuthoringSnapshotState: ${field} muss ein String-Array mit nicht-leeren Eintraegen sein`)
  }
  return [...value]
}

function parseArray<T>(value: unknown, field: string, parseItem: (item: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`AuthoringSnapshotState: ${field} muss ein Array sein`)
  return value.map((item, index) => parseItem(item, `${field}[${index}]`))
}

function parseOptionalArray<T>(
  value: unknown,
  field: string,
  parseItem: (item: unknown, field: string) => T,
): T[] | undefined {
  if (value === undefined) return undefined
  return parseArray(value, field, parseItem)
}

function assertUnique(ids: readonly string[], field: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`AuthoringSnapshotState: ${field} enthaelt doppelte ID "${id}"`)
    seen.add(id)
  }
}

function assertKnownIds(ids: readonly string[], known: ReadonlySet<string>, field: string): void {
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`AuthoringSnapshotState: ${field} enthaelt unbekannte ID "${id}"`)
  }
}

function parseRegistryContext(raw: unknown): AuthoringRegistryContextState {
  const value = assertRecord(raw, 'registryContext')
  assertKnownKeys(value, ['collectionIds', 'bonusContextIds'], 'registryContext')
  const collectionIds = stringArray(value.collectionIds, 'registryContext.collectionIds')
  const bonusContextIds = stringArray(value.bonusContextIds, 'registryContext.bonusContextIds')
  assertUnique(collectionIds, 'registryContext.collectionIds')
  assertUnique(bonusContextIds, 'registryContext.bonusContextIds')
  assertKnownIds(collectionIds, knownCollectionIds, 'registryContext.collectionIds')
  assertKnownIds(bonusContextIds, knownBonusContextIds, 'registryContext.bonusContextIds')
  return { collectionIds, bonusContextIds }
}

function parseTimelineCursor(raw: unknown): AuthoringTimelineCursor {
  const value = assertRecord(raw, 'activeTimeline')
  assertKnownKeys(value, ['timelineId', 'stepId', 'keyframeId'], 'activeTimeline')
  return {
    timelineId: requiredString(value.timelineId, 'activeTimeline.timelineId'),
    stepId: requiredString(value.stepId, 'activeTimeline.stepId'),
    keyframeId: requiredString(value.keyframeId, 'activeTimeline.keyframeId'),
  }
}

function parseTargetRef(raw: unknown, field: string): SequenceTargetRef {
  try {
    return parseSequenceTargetRef(raw)
  } catch (error) {
    if (error instanceof Error) throw new Error(`AuthoringSnapshotState: ${field} ist ungueltig: ${error.message}`)
    throw error
  }
}

function animationAction(value: unknown, field: string): TimelineAnimationAction {
  if (typeof value === 'string' && (ANIMATION_ACTIONS as readonly string[]).includes(value)) {
    return value as TimelineAnimationAction
  }
  throw new Error(`AuthoringSnapshotState: ${field} hat einen ungueltigen Wert`)
}

function parseAnimationState(raw: unknown, field: string): AuthoringAnimationState {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['bindingId', 'clipId', 'action', 'targetRef', 'timeMs'], field)
  const targetRef = value.targetRef === undefined ? undefined : parseTargetRef(value.targetRef, `${field}.targetRef`)
  const timeMs = optionalNonNegativeNumber(value.timeMs, `${field}.timeMs`)
  return {
    bindingId: requiredString(value.bindingId, `${field}.bindingId`),
    clipId: requiredString(value.clipId, `${field}.clipId`),
    action: animationAction(value.action, `${field}.action`),
    ...(targetRef === undefined ? {} : { targetRef }),
    ...(timeMs === undefined ? {} : { timeMs }),
  }
}

function assetInstanceIds(scenes: readonly AuthoringScene[]): string[] {
  return scenes.flatMap((scene) => scene.assetInstances.map((instance) => `${instance.collectionId}/${instance.instanceId}`))
}

function assetPartIds(scenes: readonly AuthoringScene[]): string[] {
  return scenes.flatMap((scene) => scene.assetInstances.flatMap((instance) =>
    (instance.parts ?? []).map((part) => `${instance.collectionId}/${instance.instanceId}/${part.partId}`),
  ))
}

function validateTargetRef(
  ref: SequenceTargetRef,
  scenes: readonly AuthoringScene[],
  collectionIds: readonly string[],
  field: string,
): void {
  const resolution = resolveSequenceTargetRef(ref, {
    collections: collectionIds,
    assetInstanceIds: assetInstanceIds(scenes),
    assetPartIds: assetPartIds(scenes),
  })
  if (resolution.status === 'unknown') {
    throw new Error(`AuthoringSnapshotState: ${field} referenziert fehlendes Ziel: ${resolution.reason}`)
  }
}

function validateActiveTimeline(cursor: AuthoringTimelineCursor, timelines: readonly TimelineDocument[]): void {
  const timeline = timelines.find((candidate) => candidate.timelineId === cursor.timelineId)
  if (!timeline) throw new Error(`AuthoringSnapshotState: activeTimeline.timelineId "${cursor.timelineId}" ist nicht definiert`)
  const step = timeline.steps.find((candidate) => candidate.stepId === cursor.stepId)
  if (!step) throw new Error(`AuthoringSnapshotState: activeTimeline.stepId "${cursor.stepId}" ist nicht definiert`)
  if (!step.keyframes.some((candidate) => candidate.keyframeId === cursor.keyframeId)) {
    throw new Error(`AuthoringSnapshotState: activeTimeline.keyframeId "${cursor.keyframeId}" ist nicht definiert`)
  }
}

function validateState(state: AuthoringSnapshotState): void {
  assertUnique(state.authoringScenes.map((scene) => scene.sceneId), 'authoringScenes.sceneId')
  assertUnique(state.timelines.map((timeline) => timeline.timelineId), 'timelines.timelineId')
  if (state.activeSceneId && !state.authoringScenes.some((scene) => scene.sceneId === state.activeSceneId)) {
    throw new Error(`AuthoringSnapshotState: activeSceneId "${state.activeSceneId}" ist nicht definiert`)
  }
  if (state.activeTimeline) validateActiveTimeline(state.activeTimeline, state.timelines)
  if (state.activeTargetRef) {
    validateTargetRef(state.activeTargetRef, state.authoringScenes, state.registryContext.collectionIds, 'activeTargetRef')
  }
  state.animationState?.forEach((entry, index) => {
    if (entry.targetRef) {
      validateTargetRef(entry.targetRef, state.authoringScenes, state.registryContext.collectionIds, `animationState[${index}].targetRef`)
    }
  })
}

export function parseAuthoringSnapshotState(raw: unknown): AuthoringSnapshotState | null {
  if (raw === undefined || raw === null) return null
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, [
    'schemaVersion',
    'registryContext',
    'authoringScenes',
    'timelines',
    'activeSceneId',
    'activeTargetRef',
    'activeTimeline',
    'animationState',
  ], 'Root')
  if (value.schemaVersion !== AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION) {
    throw new Error(`AuthoringSnapshotState: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`)
  }
  const activeSceneId = optionalString(value.activeSceneId, 'activeSceneId')
  const activeTargetRef = value.activeTargetRef === undefined ? undefined : parseTargetRef(value.activeTargetRef, 'activeTargetRef')
  const activeTimeline = value.activeTimeline === undefined ? undefined : parseTimelineCursor(value.activeTimeline)
  const animationState = parseOptionalArray(value.animationState, 'animationState', parseAnimationState)
  const state: AuthoringSnapshotState = {
    schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
    registryContext: parseRegistryContext(value.registryContext),
    authoringScenes: parseArray(value.authoringScenes, 'authoringScenes', (item) => parseAuthoringScene(item)),
    timelines: parseArray(value.timelines, 'timelines', (item) => parseTimelineDocument(item)),
    ...(activeSceneId === undefined ? {} : { activeSceneId }),
    ...(activeTargetRef === undefined ? {} : { activeTargetRef }),
    ...(activeTimeline === undefined ? {} : { activeTimeline }),
    ...(animationState === undefined ? {} : { animationState }),
  }
  validateState(state)
  return state
}

export function toAuthoringSnapshotStateJson(state: AuthoringSnapshotState): string {
  return JSON.stringify(parseAuthoringSnapshotState(state), null, 2)
}

export const useAuthoringSnapshotStore = create<AuthoringSnapshotStoreState>((set) => ({
  authoring: null,
  setAuthoringSnapshotState: (authoring) => set({ authoring: parseAuthoringSnapshotState(authoring) }),
  resetAuthoringSnapshotState: () => set({ authoring: null }),
}))
