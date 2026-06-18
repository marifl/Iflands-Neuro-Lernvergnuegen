import type { AuthoringNodeRole, AuthoringOriginPolicy, AuthoringTransform, Vec3 } from './authoringScene'

export const ASSET_MANIFEST_SCHEMA_VERSION = 1

export type AssetManifestFormat = 'glb' | 'gltf'
export type AssetSourceKind = 'bodyparts3d' | 'synthetic' | 'curated' | 'external'
export type AssetUnit = 'millimeter' | 'meter'
export type AssetUpAxis = 'y-up' | 'z-up'
export type AssetMaterialPolicyName = 'source-materials' | 'standardized-materials'
export type AssetTransparencyPolicy = 'opaque' | 'alpha-blend' | 'alpha-test'

export interface AssetManifestSource {
  kind: AssetSourceKind; provenance: string; license: string; hash: string; attribution?: string
}

export interface AssetNormalization {
  unit: AssetUnit; upAxis: AssetUpAxis; scale: number; spaceId: string
  defaultPivot: AuthoringOriginPolicy; rootTransform: AuthoringTransform
}

export interface AssetMaterialPolicy {
  materials: AssetMaterialPolicyName; transparency: AssetTransparencyPolicy; shareMaterials: boolean
}

export interface AssetNodeNamingPolicy {
  requireStableNodeNames: boolean; nodeNamePattern: string; partIdPattern: string
}

export interface AssetManifestPart {
  partId: string; label: string; nodeName: string; pickable: boolean; role: AuthoringNodeRole
}

export interface AssetManifestEntry {
  assetId: string
  collectionId: string
  slotId: string
  runtimeInstanceId?: string
  label: string
  uri: string
  previewUri?: string
  format: AssetManifestFormat
  optional: boolean
  version: string
  source: AssetManifestSource
  normalization: AssetNormalization
  materialPolicy: AssetMaterialPolicy
  nodeNaming: AssetNodeNamingPolicy
  parts: AssetManifestPart[]
}

export interface AssetManifestDocument {
  schemaVersion: typeof ASSET_MANIFEST_SCHEMA_VERSION; manifestId: string; assets: AssetManifestEntry[]
}

export interface AssetManifestSlotRequest {
  collectionId: string; slotId: string; assetId?: string; optional: boolean
}

export type AssetManifestSlotResolution =
  | { status: 'available'; assetId: string; asset: AssetManifestEntry }
  | { status: 'missing-optional'; assetId: string; reason: string }
  | { status: 'missing-required'; assetId: string; reason: string }

const FORMATS = ['glb', 'gltf'] as const satisfies readonly AssetManifestFormat[]
const SOURCE_KINDS = ['bodyparts3d', 'synthetic', 'curated', 'external'] as const satisfies readonly AssetSourceKind[]
const UNITS = ['millimeter', 'meter'] as const satisfies readonly AssetUnit[]
const UP_AXES = ['y-up', 'z-up'] as const satisfies readonly AssetUpAxis[]
const MATERIAL_POLICIES = ['source-materials', 'standardized-materials'] as const satisfies readonly AssetMaterialPolicyName[]
const TRANSPARENCY_POLICIES = ['opaque', 'alpha-blend', 'alpha-test'] as const satisfies readonly AssetTransparencyPolicy[]
const NODE_ROLES = ['selectable', 'helper'] as const satisfies readonly AuthoringNodeRole[]
const ORIGIN_POLICIES = ['asset-origin', 'bounds-center', 'custom'] as const satisfies readonly AuthoringOriginPolicy['policy'][]

const PART_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const NODE_NAME_PATTERN = /^[A-Za-z0-9_.:-]+$/
const SHA_256_PATTERN = /^sha256:[a-f0-9]{64}$/i
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`AssetManifest: ${field} muss ein Objekt sein`)
  return value
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`AssetManifest: ${field} enthaelt unbekanntes Feld "${key}"`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`AssetManifest: ${field} muss ein nicht-leerer String sein`)
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`AssetManifest: ${field} muss boolean sein`)
  return value
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`AssetManifest: ${field} muss eine finite Zahl sein`)
  }
  return value
}

function positiveNumber(value: unknown, field: string): number {
  const parsed = finiteNumber(value, field)
  if (parsed <= 0) throw new Error(`AssetManifest: ${field} muss groesser 0 sein`)
  return parsed
}

function vec3Value(value: unknown, field: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`AssetManifest: ${field} muss ein [x,y,z]-Array sein`)
  }
  return [
    finiteNumber(value[0], `${field}[0]`),
    finiteNumber(value[1], `${field}[1]`),
    finiteNumber(value[2], `${field}[2]`),
  ]
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new Error(`AssetManifest: ${field} hat einen ungueltigen Wert`)
}

function parseArray<T>(value: unknown, field: string, parseItem: (item: unknown, field: string) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`AssetManifest: ${field} muss ein Array sein`)
  return value.map((item, index) => parseItem(item, `${field}[${index}]`))
}

function assertUnique(ids: readonly string[], field: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`AssetManifest: ${field} enthaelt doppelte ID "${id}"`)
    seen.add(id)
  }
}

function parseRegexPattern(value: unknown, field: string): string {
  const pattern = requiredString(value, field)
  try {
    new RegExp(pattern)
  } catch {
    throw new Error(`AssetManifest: ${field} ist kein gueltiges RegExp-Pattern`)
  }
  return pattern
}

function parseVersion(value: unknown, field: string): string {
  const version = requiredString(value, field)
  if (!SEMVER_PATTERN.test(version)) throw new Error(`AssetManifest: ${field} muss SemVer sein`)
  return version
}

function parseHash(value: unknown, field: string): string {
  const hash = requiredString(value, field)
  if (!SHA_256_PATTERN.test(hash)) throw new Error(`AssetManifest: ${field} muss sha256:<64 hex> sein`)
  return hash
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
    throw new Error(`AssetManifest: ${field}.offset ist fuer custom erforderlich`)
  }
  return offset === undefined ? { policy } : { policy, offset }
}

function parseSource(raw: unknown, field: string): AssetManifestSource {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['kind', 'provenance', 'license', 'hash', 'attribution'], field)
  const attribution = optionalString(value.attribution, `${field}.attribution`)
  return {
    kind: enumValue(value.kind, SOURCE_KINDS, `${field}.kind`),
    provenance: requiredString(value.provenance, `${field}.provenance`),
    license: requiredString(value.license, `${field}.license`),
    hash: parseHash(value.hash, `${field}.hash`),
    ...(attribution === undefined ? {} : { attribution }),
  }
}

function parseNormalization(raw: unknown, field: string): AssetNormalization {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['unit', 'upAxis', 'scale', 'spaceId', 'defaultPivot', 'rootTransform'], field)
  return {
    unit: enumValue(value.unit, UNITS, `${field}.unit`),
    upAxis: enumValue(value.upAxis, UP_AXES, `${field}.upAxis`),
    scale: positiveNumber(value.scale, `${field}.scale`),
    spaceId: requiredString(value.spaceId, `${field}.spaceId`),
    defaultPivot: parseOrigin(value.defaultPivot, `${field}.defaultPivot`),
    rootTransform: parseTransform(value.rootTransform, `${field}.rootTransform`),
  }
}

function parseMaterialPolicy(raw: unknown, field: string): AssetMaterialPolicy {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['materials', 'transparency', 'shareMaterials'], field)
  return {
    materials: enumValue(value.materials, MATERIAL_POLICIES, `${field}.materials`),
    transparency: enumValue(value.transparency, TRANSPARENCY_POLICIES, `${field}.transparency`),
    shareMaterials: requiredBoolean(value.shareMaterials, `${field}.shareMaterials`),
  }
}

function parseNodeNaming(raw: unknown, field: string): AssetNodeNamingPolicy {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['requireStableNodeNames', 'nodeNamePattern', 'partIdPattern'], field)
  return {
    requireStableNodeNames: requiredBoolean(value.requireStableNodeNames, `${field}.requireStableNodeNames`),
    nodeNamePattern: parseRegexPattern(value.nodeNamePattern, `${field}.nodeNamePattern`),
    partIdPattern: parseRegexPattern(value.partIdPattern, `${field}.partIdPattern`),
  }
}

function parsePart(raw: unknown, field: string, nodeNaming: AssetNodeNamingPolicy): AssetManifestPart {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, ['partId', 'label', 'nodeName', 'pickable', 'role'], field)
  const partId = requiredString(value.partId, `${field}.partId`)
  const nodeName = requiredString(value.nodeName, `${field}.nodeName`)
  if (!PART_ID_PATTERN.test(partId) || !new RegExp(nodeNaming.partIdPattern).test(partId)) {
    throw new Error(`AssetManifest: ${field}.partId ist kein stabiler kebab-case Identifier`)
  }
  if (!NODE_NAME_PATTERN.test(nodeName) || !new RegExp(nodeNaming.nodeNamePattern).test(nodeName)) {
    throw new Error(`AssetManifest: ${field}.nodeName ist kein stabiler GLB-Node-Name`)
  }
  const role = enumValue(value.role, NODE_ROLES, `${field}.role`)
  const pickable = requiredBoolean(value.pickable, `${field}.pickable`)
  if (role === 'helper' && pickable) {
    throw new Error(`AssetManifest: ${field}.pickable muss fuer helper false sein`)
  }
  return {
    partId,
    label: requiredString(value.label, `${field}.label`),
    nodeName,
    pickable,
    role,
  }
}

function parseUri(value: unknown, format: AssetManifestFormat, field: string): string {
  const uri = requiredString(value, field)
  if (!uri.startsWith('/assets/')) throw new Error(`AssetManifest: ${field} muss unter /assets/ liegen`)
  if (!uri.endsWith(`.${format}`)) throw new Error(`AssetManifest: ${field} passt nicht zu format "${format}"`)
  return uri
}

function parseAsset(raw: unknown, field: string): AssetManifestEntry {
  const value = assertRecord(raw, field)
  assertKnownKeys(value, [
    'assetId',
    'collectionId',
    'slotId',
    'runtimeInstanceId',
    'label',
    'uri',
    'previewUri',
    'format',
    'optional',
    'version',
    'source',
    'normalization',
    'materialPolicy',
    'nodeNaming',
    'parts',
  ], field)
  const format = enumValue(value.format, FORMATS, `${field}.format`)
  const previewUri = optionalString(value.previewUri, `${field}.previewUri`)
  const runtimeInstanceId = optionalString(value.runtimeInstanceId, `${field}.runtimeInstanceId`)
  const nodeNaming = parseNodeNaming(value.nodeNaming, `${field}.nodeNaming`)
  const parts = parseArray(value.parts, `${field}.parts`, (item, itemField) => parsePart(item, itemField, nodeNaming))
  assertUnique(parts.map((part) => part.partId), `${field}.parts`)
  assertUnique(parts.map((part) => part.nodeName), `${field}.parts.nodeName`)
  return {
    assetId: requiredString(value.assetId, `${field}.assetId`),
    collectionId: requiredString(value.collectionId, `${field}.collectionId`),
    slotId: requiredString(value.slotId, `${field}.slotId`),
    ...(runtimeInstanceId === undefined ? {} : { runtimeInstanceId }),
    label: requiredString(value.label, `${field}.label`),
    uri: parseUri(value.uri, format, `${field}.uri`),
    ...(previewUri === undefined ? {} : { previewUri }),
    format,
    optional: requiredBoolean(value.optional, `${field}.optional`),
    version: parseVersion(value.version, `${field}.version`),
    source: parseSource(value.source, `${field}.source`),
    normalization: parseNormalization(value.normalization, `${field}.normalization`),
    materialPolicy: parseMaterialPolicy(value.materialPolicy, `${field}.materialPolicy`),
    nodeNaming,
    parts,
  }
}

export function parseAssetManifestDocument(raw: unknown): AssetManifestDocument {
  const value = assertRecord(raw, 'Root')
  assertKnownKeys(value, ['schemaVersion', 'manifestId', 'assets'], 'Root')
  if (value.schemaVersion !== ASSET_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`AssetManifest: schemaVersion "${String(value.schemaVersion)}" wird nicht unterstuetzt`)
  }
  const assets = parseArray(value.assets, 'assets', parseAsset)
  if (assets.length === 0) throw new Error('AssetManifest: assets braucht mindestens ein Asset')
  assertUnique(assets.map((asset) => asset.assetId), 'assets')
  return {
    schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
    manifestId: requiredString(value.manifestId, 'manifestId'),
    assets,
  }
}

export function toAssetManifestJson(document: AssetManifestDocument): string {
  return JSON.stringify(parseAssetManifestDocument(document), null, 2)
}

export function resolveAssetManifestSlot(
  raw: unknown,
  request: AssetManifestSlotRequest,
): AssetManifestSlotResolution {
  const document = parseAssetManifestDocument(raw)
  const asset = document.assets.find((candidate) =>
    candidate.collectionId === request.collectionId
    && candidate.slotId === request.slotId
    && (request.assetId === undefined || candidate.assetId === request.assetId),
  )
  const assetId = request.assetId ?? `${request.collectionId}/${request.slotId}`
  if (asset) return { status: 'available', assetId: asset.assetId, asset }
  const reason = `Asset ${assetId} fehlt fuer ${request.collectionId}/${request.slotId}`
  return request.optional
    ? { status: 'missing-optional', assetId, reason }
    : { status: 'missing-required', assetId, reason }
}
