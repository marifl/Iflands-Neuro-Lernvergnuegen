import type { AuthoringTransform, Vec3 } from './authoringScene'
import { requiredString, optionalString, enumValue } from './parseHelpers'
import { parseSequenceTargetRef, type SequenceTargetRef } from './sequenceTargetRef'

export type TimelineAnimationAction = 'play' | 'pause' | 'stop' | 'scrub'

export interface TimelineCameraPose {
  position: Vec3
  target: Vec3
  fov: number
}

export interface TimelineCameraChannel {
  view?: string
  pose?: TimelineCameraPose
}

export interface TimelineOverlayChannel {
  sceneId?: string
  configName?: string
  title?: string
  body?: string
}

export interface TimelineLabelChannel {
  labelId: string
  targetRef: SequenceTargetRef
  text: string
  visible: boolean
}

export interface TimelineAnnotationChannel {
  annotationId: string
  targetRef: SequenceTargetRef
  label: string
  body?: string
  visible: boolean
}

export interface TimelineContextChannel {
  contextId: string
  collectionId?: string
  active: boolean
}

export interface TimelineCollectionChannel {
  collectionId: string
  visible: boolean
}

export interface TimelineObjectChannel {
  targetRef: SequenceTargetRef
  visible?: boolean
  transform?: AuthoringTransform
}

export interface TimelineAnimationChannel {
  bindingId: string
  clipId: string
  targetRef?: SequenceTargetRef
  action: TimelineAnimationAction
  timeMs?: number
  loop?: boolean
}

export interface TimelineChannels {
  camera?: TimelineCameraChannel
  overlay?: TimelineOverlayChannel
  labels?: TimelineLabelChannel[]
  annotations?: TimelineAnnotationChannel[]
  contexts?: TimelineContextChannel[]
  collections?: TimelineCollectionChannel[]
  objects?: TimelineObjectChannel[]
  animation?: TimelineAnimationChannel[]
}

const ANIMATION_ACTIONS = ['play', 'pause', 'stop', 'scrub'] as const satisfies readonly TimelineAnimationAction[]

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

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`TimelineDocument: ${field} muss boolean sein`)
  return value
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  return requiredBoolean(value, field)
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`TimelineDocument: ${field} muss eine finite Zahl sein`)
  }
  return value
}

function optionalNonNegativeNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  const parsed = finiteNumber(value, field)
  if (parsed < 0) throw new Error(`TimelineDocument: ${field} muss nicht-negativ sein`)
  return parsed
}

function vec3Value(value: unknown, field: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`TimelineDocument: ${field} muss ein [x,y,z]-Array sein`)
  }
  return [
    finiteNumber(value[0], `${field}[0]`),
    finiteNumber(value[1], `${field}[1]`),
    finiteNumber(value[2], `${field}[2]`),
  ]
}

function parseArray<T>(value: unknown, field: string, parseItem: (item: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`TimelineDocument: ${field} muss ein Array sein`)
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

function parseCameraPose(raw: unknown, field: string): TimelineCameraPose {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['position', 'target', 'fov'], field)
  const fov = finiteNumber(value.fov, `${field}.fov`)
  if (fov <= 0 || fov >= 180) {
    throw new Error(`TimelineDocument: ${field}.fov muss zwischen 0 und 180 Grad liegen`)
  }
  return {
    position: vec3Value(value.position, `${field}.position`),
    target: vec3Value(value.target, `${field}.target`),
    fov,
  }
}

function parseCameraChannel(raw: unknown, field: string): TimelineCameraChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['view', 'pose'], field)
  const view = optionalString(value.view, `${field}.view`)
  const pose = value.pose === undefined ? undefined : parseCameraPose(value.pose, `${field}.pose`)
  if (view === undefined && pose === undefined) throw new Error(`TimelineDocument: ${field} braucht view oder pose`)
  return {
    ...(view === undefined ? {} : { view }),
    ...(pose === undefined ? {} : { pose }),
  }
}

function parseOverlayChannel(raw: unknown, field: string): TimelineOverlayChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['sceneId', 'configName', 'title', 'body'], field)
  const sceneId = optionalString(value.sceneId, `${field}.sceneId`)
  const configName = optionalString(value.configName, `${field}.configName`)
  const title = optionalString(value.title, `${field}.title`)
  const body = optionalString(value.body, `${field}.body`)
  if (!sceneId && !configName && !title && !body) {
    throw new Error(`TimelineDocument: ${field} braucht Scene-, Config- oder Textdaten`)
  }
  return {
    ...(sceneId === undefined ? {} : { sceneId }),
    ...(configName === undefined ? {} : { configName }),
    ...(title === undefined ? {} : { title }),
    ...(body === undefined ? {} : { body }),
  }
}

function parseTargetRef(raw: unknown, field: string): SequenceTargetRef {
  try {
    return parseSequenceTargetRef(raw)
  } catch (error) {
    if (error instanceof Error) throw new Error(`TimelineDocument: ${field} ist ungueltig: ${error.message}`)
    throw error
  }
}

function parseLabelChannel(raw: unknown, field: string): TimelineLabelChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['labelId', 'targetRef', 'text', 'visible'], field)
  return {
    labelId: requiredString(value.labelId, `${field}.labelId`),
    targetRef: parseTargetRef(value.targetRef, `${field}.targetRef`),
    text: requiredString(value.text, `${field}.text`),
    visible: requiredBoolean(value.visible, `${field}.visible`),
  }
}

function parseAnnotationChannel(raw: unknown, field: string): TimelineAnnotationChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['annotationId', 'targetRef', 'label', 'body', 'visible'], field)
  const body = optionalString(value.body, `${field}.body`)
  return {
    annotationId: requiredString(value.annotationId, `${field}.annotationId`),
    targetRef: parseTargetRef(value.targetRef, `${field}.targetRef`),
    label: requiredString(value.label, `${field}.label`),
    ...(body === undefined ? {} : { body }),
    visible: requiredBoolean(value.visible, `${field}.visible`),
  }
}

function parseContextChannel(raw: unknown, field: string): TimelineContextChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['contextId', 'collectionId', 'active'], field)
  const collectionId = optionalString(value.collectionId, `${field}.collectionId`)
  return {
    contextId: requiredString(value.contextId, `${field}.contextId`),
    ...(collectionId === undefined ? {} : { collectionId }),
    active: requiredBoolean(value.active, `${field}.active`),
  }
}

function parseCollectionChannel(raw: unknown, field: string): TimelineCollectionChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['collectionId', 'visible'], field)
  return {
    collectionId: requiredString(value.collectionId, `${field}.collectionId`),
    visible: requiredBoolean(value.visible, `${field}.visible`),
  }
}

function parseTransform(raw: unknown, field: string): AuthoringTransform {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['position', 'rotation', 'scale'], field)
  return {
    position: vec3Value(value.position, `${field}.position`),
    rotation: vec3Value(value.rotation, `${field}.rotation`),
    scale: vec3Value(value.scale, `${field}.scale`),
  }
}

function parseObjectChannel(raw: unknown, field: string): TimelineObjectChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['targetRef', 'visible', 'transform'], field)
  const visible = optionalBoolean(value.visible, `${field}.visible`)
  const transform = value.transform === undefined ? undefined : parseTransform(value.transform, `${field}.transform`)
  if (visible === undefined && transform === undefined) throw new Error(`TimelineDocument: ${field} braucht visible oder transform`)
  return {
    targetRef: parseTargetRef(value.targetRef, `${field}.targetRef`),
    ...(visible === undefined ? {} : { visible }),
    ...(transform === undefined ? {} : { transform }),
  }
}

function parseAnimationChannel(raw: unknown, field: string): TimelineAnimationChannel {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['bindingId', 'clipId', 'targetRef', 'action', 'timeMs', 'loop'], field)
  const targetRef = value.targetRef === undefined ? undefined : parseTargetRef(value.targetRef, `${field}.targetRef`)
  const timeMs = optionalNonNegativeNumber(value.timeMs, `${field}.timeMs`)
  const loop = optionalBoolean(value.loop, `${field}.loop`)
  return {
    bindingId: requiredString(value.bindingId, `${field}.bindingId`),
    clipId: requiredString(value.clipId, `${field}.clipId`),
    ...(targetRef === undefined ? {} : { targetRef }),
    action: enumValue(value.action, ANIMATION_ACTIONS, `${field}.action`),
    ...(timeMs === undefined ? {} : { timeMs }),
    ...(loop === undefined ? {} : { loop }),
  }
}

export function parseTimelineChannels(raw: unknown, field: string): TimelineChannels {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, [
    'camera',
    'overlay',
    'labels',
    'annotations',
    'contexts',
    'collections',
    'objects',
    'animation',
  ], field)
  const camera = value.camera === undefined ? undefined : parseCameraChannel(value.camera, `${field}.camera`)
  const overlay = value.overlay === undefined ? undefined : parseOverlayChannel(value.overlay, `${field}.overlay`)
  const labels = parseOptionalArray(value.labels, `${field}.labels`, parseLabelChannel)
  const annotations = parseOptionalArray(value.annotations, `${field}.annotations`, parseAnnotationChannel)
  const contexts = parseOptionalArray(value.contexts, `${field}.contexts`, parseContextChannel)
  const collections = parseOptionalArray(value.collections, `${field}.collections`, parseCollectionChannel)
  const objects = parseOptionalArray(value.objects, `${field}.objects`, parseObjectChannel)
  const animation = parseOptionalArray(value.animation, `${field}.animation`, parseAnimationChannel)
  return {
    ...(camera === undefined ? {} : { camera }),
    ...(overlay === undefined ? {} : { overlay }),
    ...(labels === undefined ? {} : { labels }),
    ...(annotations === undefined ? {} : { annotations }),
    ...(contexts === undefined ? {} : { contexts }),
    ...(collections === undefined ? {} : { collections }),
    ...(objects === undefined ? {} : { objects }),
    ...(animation === undefined ? {} : { animation }),
  }
}
