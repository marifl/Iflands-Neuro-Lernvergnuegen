import { parseTimelineChannels, type TimelineChannels } from './timelineChannels'

export {
  type TimelineAnimationAction,
  type TimelineAnimationChannel,
  type TimelineAnnotationChannel,
  type TimelineCameraChannel,
  type TimelineCameraPose,
  type TimelineChannels,
  type TimelineCollectionChannel,
  type TimelineContextChannel,
  type TimelineLabelChannel,
  type TimelineObjectChannel,
  type TimelineOverlayChannel,
} from './timelineChannels'

export const TIMELINE_DOCUMENT_SCHEMA_VERSION = 1

export interface TimelineRouteRestore {
  configName?: string
  sceneId?: string
  step: number
}

export interface TimelineRestoreTarget {
  stepId: string
  keyframeId: string
  route?: TimelineRouteRestore
}

export interface TimelineKeyframe {
  keyframeId: string
  atMs: number
  holdMs?: number
  channels: TimelineChannels
}

export interface TimelineStep {
  stepId: string
  order: number
  durationMs: number
  keyframes: TimelineKeyframe[]
}

export interface TimelineDocument {
  schemaVersion: typeof TIMELINE_DOCUMENT_SCHEMA_VERSION
  timelineId: string
  title?: string
  source?: string
  restore: TimelineRestoreTarget
  steps: TimelineStep[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`TimelineDocument: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`TimelineDocument: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`TimelineDocument: ${field} muss ein nicht-leerer String sein`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`TimelineDocument: ${field} muss eine finite Zahl sein`)
  }
  return value
}

function nonNegativeNumber(value: unknown, field: string): number {
  const parsed = finiteNumber(value, field)
  if (parsed < 0) throw new Error(`TimelineDocument: ${field} muss nicht-negativ sein`)
  return parsed
}

function nonNegativeInteger(value: unknown, field: string): number {
  const parsed = nonNegativeNumber(value, field)
  if (!Number.isSafeInteger(parsed)) throw new Error(`TimelineDocument: ${field} muss ein Integer sein`)
  return parsed
}

function positiveNumber(value: unknown, field: string): number {
  const parsed = finiteNumber(value, field)
  if (parsed <= 0) throw new Error(`TimelineDocument: ${field} muss groesser 0 sein`)
  return parsed
}

function optionalNonNegativeNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  return nonNegativeNumber(value, field)
}

function parseArray<T>(value: unknown, field: string, parseItem: (item: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`TimelineDocument: ${field} muss ein Array sein`)
  return value.map((item, index) => parseItem(item, `${field}[${index}]`))
}

function assertUnique(ids: readonly string[], field: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`TimelineDocument: ${field} enthaelt doppelte ID "${id}"`)
    seen.add(id)
  }
}

function parseRouteRestore(raw: unknown, field: string): TimelineRouteRestore {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['configName', 'sceneId', 'step'], field)
  const configName = optionalString(value.configName, `${field}.configName`)
  const sceneId = optionalString(value.sceneId, `${field}.sceneId`)
  if (!configName && !sceneId) throw new Error(`TimelineDocument: ${field} braucht configName oder sceneId`)
  return {
    ...(configName === undefined ? {} : { configName }),
    ...(sceneId === undefined ? {} : { sceneId }),
    step: nonNegativeInteger(value.step, `${field}.step`),
  }
}

function parseRestoreTarget(raw: unknown): TimelineRestoreTarget {
  const value = assertRecord(raw, 'restore')
  assertKnownKeys(value, ['stepId', 'keyframeId', 'route'], 'restore')
  const route = value.route === undefined ? undefined : parseRouteRestore(value.route, 'restore.route')
  return {
    stepId: requiredString(value.stepId, 'restore.stepId'),
    keyframeId: requiredString(value.keyframeId, 'restore.keyframeId'),
    ...(route === undefined ? {} : { route }),
  }
}

function parseKeyframe(raw: unknown, field: string): TimelineKeyframe {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['keyframeId', 'atMs', 'holdMs', 'channels'], field)
  const holdMs = optionalNonNegativeNumber(value.holdMs, `${field}.holdMs`)
  return {
    keyframeId: requiredString(value.keyframeId, `${field}.keyframeId`),
    atMs: nonNegativeNumber(value.atMs, `${field}.atMs`),
    ...(holdMs === undefined ? {} : { holdMs }),
    channels: parseTimelineChannels(value.channels, `${field}.channels`),
  }
}

function parseStep(raw: unknown, field: string): TimelineStep {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['stepId', 'order', 'durationMs', 'keyframes'], field)
  const keyframes = parseArray(value.keyframes, `${field}.keyframes`, parseKeyframe)
  assertUnique(keyframes.map((keyframe) => keyframe.keyframeId), `${field}.keyframes`)
  if (keyframes.length === 0) throw new Error(`TimelineDocument: ${field}.keyframes braucht mindestens ein Keyframe`)
  return {
    stepId: requiredString(value.stepId, `${field}.stepId`),
    order: nonNegativeInteger(value.order, `${field}.order`),
    durationMs: positiveNumber(value.durationMs, `${field}.durationMs`),
    keyframes,
  }
}

function validateStepTiming(steps: readonly TimelineStep[]): void {
  for (const step of steps) {
    for (const keyframe of step.keyframes) {
      if (keyframe.atMs > step.durationMs) {
        throw new Error(`TimelineDocument: keyframes.${keyframe.keyframeId}.atMs liegt ausserhalb von durationMs`)
      }
      if (keyframe.holdMs !== undefined && keyframe.atMs + keyframe.holdMs > step.durationMs) {
        throw new Error(`TimelineDocument: keyframes.${keyframe.keyframeId}.holdMs liegt ausserhalb von durationMs`)
      }
    }
  }
}

function validateRestoreTarget(restore: TimelineRestoreTarget, steps: readonly TimelineStep[]): void {
  const step = steps.find((candidate) => candidate.stepId === restore.stepId)
  if (!step) throw new Error(`TimelineDocument: restore.stepId "${restore.stepId}" ist nicht definiert`)
  if (!step.keyframes.some((keyframe) => keyframe.keyframeId === restore.keyframeId)) {
    throw new Error(`TimelineDocument: restore.keyframeId "${restore.keyframeId}" ist nicht definiert`)
  }
}

export function parseTimelineDocument(raw: unknown): TimelineDocument {
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, ['schemaVersion', 'timelineId', 'title', 'source', 'restore', 'steps'], 'Root')
  if (value.schemaVersion !== TIMELINE_DOCUMENT_SCHEMA_VERSION) {
    throw new Error(`TimelineDocument: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`)
  }
  const title = optionalString(value.title, 'title')
  const source = optionalString(value.source, 'source')
  const steps = parseArray(value.steps, 'steps', parseStep)
  if (steps.length === 0) throw new Error('TimelineDocument: steps braucht mindestens einen Step')
  assertUnique(steps.map((step) => step.stepId), 'steps')
  assertUnique(steps.map((step) => String(step.order)), 'steps.order')
  validateStepTiming(steps)
  const restore = parseRestoreTarget(value.restore)
  validateRestoreTarget(restore, steps)
  return {
    schemaVersion: TIMELINE_DOCUMENT_SCHEMA_VERSION,
    timelineId: requiredString(value.timelineId, 'timelineId'),
    ...(title === undefined ? {} : { title }),
    ...(source === undefined ? {} : { source }),
    restore,
    steps,
  }
}

export function toTimelineDocumentJson(document: TimelineDocument): string {
  return JSON.stringify(parseTimelineDocument(document), null, 2)
}
