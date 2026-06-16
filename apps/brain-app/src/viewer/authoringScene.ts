export const AUTHORING_SCENE_SCHEMA_VERSION = 1

export type Vec3 = [number, number, number]
export type AuthoringNodeRole = 'selectable' | 'helper'
export type AuthoringOriginPolicyName = 'asset-origin' | 'bounds-center' | 'custom'

export interface AuthoringTransform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

export interface AuthoringOriginPolicy {
  policy: AuthoringOriginPolicyName
  offset?: Vec3
}

export interface AuthoringSelectablePart {
  partId: string
  label: string
  nodeName?: string
  pickable: boolean
  role: AuthoringNodeRole
}

export interface AuthoringClipBinding {
  bindingId: string
  clipId: string
  targetPartId?: string | null
}

export interface AuthoringAnnotation {
  annotationId: string
  target: {
    instanceId: string
    partId?: string
  }
  label: string
  body?: string
}

export interface AuthoringAssetInstance {
  instanceId: string
  assetId: string
  collectionId: string
  parentId?: string | null
  visible: boolean
  transform: AuthoringTransform
  origin: AuthoringOriginPolicy
  parts?: AuthoringSelectablePart[]
  clipBindings?: AuthoringClipBinding[]
  annotations?: AuthoringAnnotation[]
}

export interface AuthoringScene {
  schemaVersion: typeof AUTHORING_SCENE_SCHEMA_VERSION
  sceneId: string
  assetInstances: AuthoringAssetInstance[]
}

const ORIGIN_POLICIES = ['asset-origin', 'bounds-center', 'custom'] as const satisfies readonly AuthoringOriginPolicyName[]
const NODE_ROLES = ['selectable', 'helper'] as const satisfies readonly AuthoringNodeRole[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`AuthoringScene: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`AuthoringScene: ${field} enthaelt unbekanntes Feld "${key}"`)
    }
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`AuthoringScene: ${field} muss ein nicht-leerer String sein`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function optionalStringOrNull(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return requiredString(value, field)
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`AuthoringScene: ${field} muss boolean sein`)
  return value
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`AuthoringScene: ${field} muss eine finite Zahl sein`)
  }
  return value
}

function vec3Value(value: unknown, field: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`AuthoringScene: ${field} muss ein [x,y,z]-Array sein`)
  }
  return [
    finiteNumber(value[0], `${field}[0]`),
    finiteNumber(value[1], `${field}[1]`),
    finiteNumber(value[2], `${field}[2]`),
  ]
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`AuthoringScene: ${field} hat einen ungueltigen Wert`)
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

function parseOrigin(raw: unknown, field: string): AuthoringOriginPolicy {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['policy', 'offset'], field)
  const policy = enumValue(value.policy, ORIGIN_POLICIES, `${field}.policy`)
  const offset = value.offset === undefined ? undefined : vec3Value(value.offset, `${field}.offset`)
  if (policy === 'custom' && offset === undefined) {
    throw new Error(`AuthoringScene: ${field}.offset ist fuer custom erforderlich`)
  }
  return offset === undefined ? { policy } : { policy, offset }
}

function parsePart(raw: unknown, field: string): AuthoringSelectablePart {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['partId', 'label', 'nodeName', 'pickable', 'role'], field)
  const role = enumValue(value.role, NODE_ROLES, `${field}.role`)
  const pickable = requiredBoolean(value.pickable, `${field}.pickable`)
  if (role === 'helper' && pickable) {
    throw new Error(`AuthoringScene: ${field}.pickable muss fuer helper false sein`)
  }
  const nodeName = optionalString(value.nodeName, `${field}.nodeName`)
  return {
    partId: requiredString(value.partId, `${field}.partId`),
    label: requiredString(value.label, `${field}.label`),
    ...(nodeName === undefined ? {} : { nodeName }),
    pickable,
    role,
  }
}

function parseClipBinding(raw: unknown, field: string): AuthoringClipBinding {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['bindingId', 'clipId', 'targetPartId'], field)
  const targetPartId = optionalStringOrNull(value.targetPartId, `${field}.targetPartId`)
  return {
    bindingId: requiredString(value.bindingId, `${field}.bindingId`),
    clipId: requiredString(value.clipId, `${field}.clipId`),
    ...(targetPartId === undefined ? {} : { targetPartId }),
  }
}

function parseAnnotationTarget(raw: unknown, field: string): AuthoringAnnotation['target'] {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['instanceId', 'partId'], field)
  const partId = optionalString(value.partId, `${field}.partId`)
  return {
    instanceId: requiredString(value.instanceId, `${field}.instanceId`),
    ...(partId === undefined ? {} : { partId }),
  }
}

function parseAnnotation(raw: unknown, field: string): AuthoringAnnotation {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['annotationId', 'target', 'label', 'body'], field)
  const body = optionalString(value.body, `${field}.body`)
  return {
    annotationId: requiredString(value.annotationId, `${field}.annotationId`),
    target: parseAnnotationTarget(value.target, `${field}.target`),
    label: requiredString(value.label, `${field}.label`),
    ...(body === undefined ? {} : { body }),
  }
}

function parseArray<T>(value: unknown, field: string, parseItem: (item: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`AuthoringScene: ${field} muss ein Array sein`)
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
    if (seen.has(id)) throw new Error(`AuthoringScene: ${field} enthaelt doppelte ID "${id}"`)
    seen.add(id)
  }
}

function parseAssetInstance(raw: unknown, field: string): AuthoringAssetInstance {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, [
    'instanceId',
    'assetId',
    'collectionId',
    'parentId',
    'visible',
    'transform',
    'origin',
    'parts',
    'clipBindings',
    'annotations',
  ], field)
  const parts = parseOptionalArray(value.parts, `${field}.parts`, parsePart)
  if (parts) assertUnique(parts.map((part) => part.partId), `${field}.parts`)
  const clipBindings = parseOptionalArray(value.clipBindings, `${field}.clipBindings`, parseClipBinding)
  if (clipBindings) assertUnique(clipBindings.map((binding) => binding.bindingId), `${field}.clipBindings`)
  const annotations = parseOptionalArray(value.annotations, `${field}.annotations`, parseAnnotation)
  if (annotations) assertUnique(annotations.map((annotation) => annotation.annotationId), `${field}.annotations`)
  const parentId = optionalStringOrNull(value.parentId, `${field}.parentId`)
  return {
    instanceId: requiredString(value.instanceId, `${field}.instanceId`),
    assetId: requiredString(value.assetId, `${field}.assetId`),
    collectionId: requiredString(value.collectionId, `${field}.collectionId`),
    ...(parentId === undefined ? {} : { parentId }),
    visible: requiredBoolean(value.visible, `${field}.visible`),
    transform: parseTransform(value.transform, `${field}.transform`),
    origin: parseOrigin(value.origin, `${field}.origin`),
    ...(parts === undefined ? {} : { parts }),
    ...(clipBindings === undefined ? {} : { clipBindings }),
    ...(annotations === undefined ? {} : { annotations }),
  }
}

function validateReferences(assetInstances: readonly AuthoringAssetInstance[]): void {
  const instanceIds = new Set(assetInstances.map((instance) => instance.instanceId))
  const partIdsByInstance = new Map(
    assetInstances.map((instance) => [
      instance.instanceId,
      new Set((instance.parts ?? []).map((part) => part.partId)),
    ]),
  )

  assetInstances.forEach((instance, instanceIndex) => {
    const instanceField = `assetInstances[${instanceIndex}]`
    if (instance.parentId) {
      if (instance.parentId === instance.instanceId) {
        throw new Error(`AuthoringScene: ${instanceField}.parentId darf nicht auf sich selbst zeigen`)
      }
      if (!instanceIds.has(instance.parentId)) {
        throw new Error(`AuthoringScene: ${instanceField}.parentId "${instance.parentId}" ist nicht definiert`)
      }
    }

    const localPartIds = partIdsByInstance.get(instance.instanceId) ?? new Set<string>()
    const clipBindings = instance.clipBindings ?? []
    clipBindings.forEach((binding, bindingIndex) => {
      if (binding.targetPartId && !localPartIds.has(binding.targetPartId)) {
        throw new Error(
          `AuthoringScene: ${instanceField}.clipBindings[${bindingIndex}].targetPartId "${binding.targetPartId}" ist nicht definiert`,
        )
      }
    })

    const annotations = instance.annotations ?? []
    annotations.forEach((annotation, annotationIndex) => {
      const targetInstanceId = annotation.target.instanceId
      if (!instanceIds.has(targetInstanceId)) {
        throw new Error(
          `AuthoringScene: ${instanceField}.annotations[${annotationIndex}].target.instanceId "${targetInstanceId}" ist nicht definiert`,
        )
      }
      const targetPartId = annotation.target.partId
      if (!targetPartId) return
      const targetPartIds = partIdsByInstance.get(targetInstanceId) ?? new Set<string>()
      if (!targetPartIds.has(targetPartId)) {
        throw new Error(
          `AuthoringScene: ${instanceField}.annotations[${annotationIndex}].target.partId "${targetPartId}" ist nicht definiert`,
        )
      }
    })
  })
}

export function parseAuthoringScene(raw: unknown): AuthoringScene {
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, ['schemaVersion', 'sceneId', 'assetInstances'], 'Root')
  if (value.schemaVersion !== AUTHORING_SCENE_SCHEMA_VERSION) {
    throw new Error(`AuthoringScene: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`)
  }
  const assetInstances = parseArray(value.assetInstances, 'assetInstances', parseAssetInstance)
  assertUnique(assetInstances.map((instance) => instance.instanceId), 'assetInstances')
  validateReferences(assetInstances)
  return {
    schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
    sceneId: requiredString(value.sceneId, 'sceneId'),
    assetInstances,
  }
}

export function toAuthoringSceneJson(scene: AuthoringScene): string {
  return JSON.stringify(parseAuthoringScene(scene), null, 2)
}
