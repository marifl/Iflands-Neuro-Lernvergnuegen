// scripts/atlas/build-config.mjs
// TOML-Config (config.default.toml) -> validiertes config.json. Validiert JEDE Referenz
// (Areal/Gruppe/Atlas/Achse/Config/Step) gegen atlas-ontology.json. Tote Referenz = lauter throw.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../..')
const APP_ASSETS = join(HERE, '../../apps/brain-app/public/assets/atlas-canonical')
const APP_PUBLIC = join(REPO, 'apps/brain-app/public')
const APP_SRC = join(REPO, 'apps/brain-app/src')
const GENERATED_MESH_MAPPINGS = join(APP_SRC, 'viewer/meshMappings.generated.json')
const FIGURE_MAPPING = join(REPO, 'docs/KAPITEL11_ABBILDUNGEN_MAPPING.md')
const STRUCTURE_COORDS = join(APP_PUBLIC, 'scenes/structure-coords.json')
const COLOR_PRESETS = join(APP_PUBLIC, 'companion/config/color-presets.json')

/** Sammelt valide Scope-IDs aus dem Katalog (axes/atlases/groups/areas). */
export function indexCatalog(catalog) {
  const idx = { axes: new Set(), atlases: new Set(), groups: new Set(), areas: new Set() }
  for (const ax of catalog.axes) idx.axes.add(ax.id)
  for (const a of catalog.atlases) {
    idx.atlases.add(a.id)
    for (const g of a.groups) {
      idx.groups.add(`group:${a.id}:${g.id}`)
      for (const area of g.areas) idx.areas.add(area.id)
    }
  }
  return idx
}

/** Wirft laut bei unbekannter Scope-Art oder toter Referenz. */
export function validateScopeKey(key, idx) {
  if (key.startsWith('axis:')) {
    const id = key.slice('axis:'.length)
    if (!idx.axes.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Achse unbekannt)`)
  } else if (key.startsWith('atlas:')) {
    const id = key.slice('atlas:'.length)
    if (!idx.atlases.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Atlas unbekannt)`)
  } else if (key.startsWith('group:')) {
    if (!idx.groups.has(key)) throw new Error(`build-config: tote Scope-Ref "${key}" (Gruppe unbekannt)`)
  } else if (key.startsWith('area:')) {
    const id = key.slice('area:'.length)
    if (!idx.areas.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Areal unbekannt)`)
  } else {
    throw new Error(`build-config: unbekannte Scope-Art in "${key}"`)
  }
}

const FACET_KEYS = new Set(['clinic', 'function', 'chapter', 'provenance'])
const SURFACES = new Set(['pial', 'inflated'])
const CARVE = new Set(['off', 'dkt', 'julich'])
const ROOT_KEYS = new Set(['preset', 'presets', 'mesh_mappings', 'configurations', 'presentation', 'learning'])
const PRESET_KEYS = new Set(['label_de', 'scopes'])
const MESH_MAPPINGS_KEYS = new Set(['buckets', 'scene_regions'])
const MESH_MAPPING_KEYS = new Set(['meshes', 'known_gap', 'gap_reason'])
const CONFIGURATION_KEYS = new Set([
  'label_de', 'title', 'section', 'replaces_figure', 'facets', 'view', 'camera',
  'regions', 'colors', 'visibility', 'cuts', 'overlay', 'sequencing', 'scopes',
])
const VIEW_KEYS = new Set(['surface', 'subcortex', 'carve_on_taro'])
const CAMERA_KEYS = new Set(['target', 'shot', 'fit', 'bounds', 'margin', 'fov', 'pose'])
const CAMERA_BOUNDS_KEYS = new Set(['center', 'radius'])
const CAMERA_POSE_KEYS = new Set(['position', 'look_at'])
const REGION_KEYS = new Set(['areas', 'buckets', 'meshes', 'scene_regions'])
const COLOR_KEYS = new Set(['enabled', 'preset', 'groups', 'dim_others'])
const COLOR_GROUP_KEYS = new Set(['label', 'hue', 'buckets'])
const VISIBILITY_KEYS = new Set(['dim_others', 'dim_opacity', 'hidden', 'isolated'])
const CUTS_KEYS = new Set(['enabled', 'planes'])
const CUT_PLANE_KEYS = new Set(['axis', 'position', 'keep'])
const OVERLAY_KEYS = new Set(['kind', 'scene', 'position', 'size', 'fallback_image'])
const OVERLAY_KINDS = new Set(['erp', 'topography', 'flowchart', 'table', 'image', 'prose'])
const SEQUENCING_KEYS = new Set(['presentation', 'learning', 'step'])
const SEQUENCE_KEYS = new Set(['label_de', 'steps'])
const CAMERA_FITS = new Set(['bounds', 'target'])
const CUT_AXES = new Set(['x', 'y', 'z'])
const CUT_KEEP = new Set(['positive', 'negative'])
const REQUIRED_ROOT_KEYS = ['preset', 'presets', 'mesh_mappings', 'configurations', 'presentation', 'learning']
const REQUIRED_CONFIGURATION_KEYS = [
  'label_de', 'title', 'section', 'view', 'camera', 'regions',
  'colors', 'visibility', 'cuts', 'overlay', 'sequencing', 'scopes',
]

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertPlainObject(value, context) {
  if (!isPlainObject(value)) throw new Error(`build-config: ${context} muss ein Objekt sein`)
}

function assertKnownKeys(obj, allowed, context) {
  if (!obj || typeof obj !== 'object') return
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) throw new Error(`build-config: ${context} hat unbekannten Key "${key}"`)
  }
}

function assertRequiredKeys(obj, required, context) {
  for (const key of required) {
    if (!(key in obj)) throw new Error(`build-config: ${context}.${key} fehlt`)
  }
}

function assertString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`build-config: ${context} muss ein nicht-leerer String sein`)
  }
}

function assertOptionalString(value, context) {
  if (value !== undefined) assertString(value, context)
}

function assertBoolean(value, context) {
  if (typeof value !== 'boolean') throw new Error(`build-config: ${context} muss boolean sein`)
}

function assertOptionalBoolean(value, context) {
  if (value !== undefined) assertBoolean(value, context)
}

function assertStringArray(value, context) {
  if (!Array.isArray(value)) throw new Error(`build-config: ${context} muss ein String-Array sein`)
  value.forEach((entry, i) => assertString(entry, `${context}[${i}]`))
}

function assertOptionalStringArray(value, context) {
  if (value !== undefined) assertStringArray(value, context)
}

function assertFiniteNumber(value, context) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`build-config: ${context} muss eine finite Zahl sein`)
  }
}

function assertPositiveNumber(value, context) {
  assertFiniteNumber(value, context)
  if (value <= 0) throw new Error(`build-config: ${context} muss groesser 0 sein`)
}

function assertUnitNumber(value, context) {
  assertFiniteNumber(value, context)
  if (value < 0 || value > 1) throw new Error(`build-config: ${context} muss zwischen 0 und 1 liegen`)
}

function assertCameraFov(value, context) {
  assertFiniteNumber(value, context)
  if (value <= 0 || value >= 180) throw new Error(`build-config: ${context} muss zwischen 0 und 180 liegen`)
}

function assertVec3(value, context) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`build-config: ${context} muss ein [x,y,z]-Array sein`)
  }
  value.forEach((v, i) => assertFiniteNumber(v, `${context}[${i}]`))
}

function assertKnownMesh(mesh, ctx, context) {
  if (ctx.meshIds && !ctx.meshIds.has(mesh)) {
    throw new Error(`build-config: ${context} "${mesh}" — Mesh unbekannt`)
  }
}

function assertKnownBucket(bucket, ctx, context) {
  if (!ctx.bucketMappings) return
  const mapping = ctx.bucketMappings[bucket]
  if (mapping === undefined) throw new Error(`build-config: ${context} "${bucket}" — Bucket unbekannt`)
  const meshes = mapping.meshes
  if (meshes.length === 0) {
    const reason = mapping.gap_reason ? `: ${mapping.gap_reason}` : ''
    throw new Error(`build-config: ${context} "${bucket}" hat keine Geometrie${reason}`)
  }
  for (const mesh of meshes) assertKnownMesh(mesh, ctx, `${context} "${bucket}" referenziert Mesh`)
}

function assertMeshMappingNode(node, ctx, context) {
  assertKnownKeys(node, MESH_MAPPING_KEYS, context)
  if (!node || typeof node !== 'object') throw new Error(`build-config: ${context} muss ein Objekt sein`)
  if (!Array.isArray(node.meshes)) throw new Error(`build-config: ${context}.meshes muss ein Array sein`)
  for (const mesh of node.meshes) {
    if (typeof mesh !== 'string' || mesh.length === 0) {
      throw new Error(`build-config: ${context}.meshes enthaelt keinen gueltigen Mesh-Namen`)
    }
    assertKnownMesh(mesh, ctx, `${context}.meshes`)
  }
  if (node.known_gap !== undefined && typeof node.known_gap !== 'boolean') {
    throw new Error(`build-config: ${context}.known_gap muss boolean sein`)
  }
  if (node.gap_reason !== undefined && (typeof node.gap_reason !== 'string' || node.gap_reason.trim() === '')) {
    throw new Error(`build-config: ${context}.gap_reason muss ein nicht-leerer String sein`)
  }
  if (node.meshes.length === 0) {
    if (node.known_gap !== true) throw new Error(`build-config: ${context} hat keine Meshes und muss known_gap=true setzen`)
    if (!node.gap_reason) throw new Error(`build-config: ${context} braucht gap_reason`)
  } else if (node.known_gap === true) {
    throw new Error(`build-config: ${context} darf known_gap=true nicht mit Meshes kombinieren`)
  }
}

function validateMeshMappings(meshMappings, ctx) {
  if (!meshMappings || typeof meshMappings !== 'object') {
    throw new Error('build-config: mesh_mappings fehlt oder ist kein Objekt')
  }
  assertKnownKeys(meshMappings, MESH_MAPPINGS_KEYS, 'mesh_mappings')
  for (const kind of ['buckets', 'scene_regions']) {
    const mappings = meshMappings[kind]
    if (!mappings || typeof mappings !== 'object') {
      throw new Error(`build-config: mesh_mappings.${kind} fehlt oder ist kein Objekt`)
    }
    if (Object.keys(mappings).length === 0) {
      throw new Error(`build-config: mesh_mappings.${kind} enthaelt keine Eintraege`)
    }
    for (const [name, node] of Object.entries(mappings)) {
      assertMeshMappingNode(node, ctx, `mesh_mappings.${kind}.${name}`)
    }
  }
}

function extractExportedObjectExpression(source, name) {
  const start = source.indexOf(`export const ${name}`)
  if (start < 0) throw new Error(`build-config: export const ${name} nicht gefunden`)
  const eq = source.indexOf('=', start)
  const open = source.indexOf('{', eq)
  if (eq < 0 || open < 0) throw new Error(`build-config: ${name} ist kein Objektliteral`)
  let depth = 0
  let quote = null
  let escaped = false
  for (let i = open; i < source.length; i++) {
    const ch = source[i]
    if (quote) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  throw new Error(`build-config: ${name} Objektliteral nicht geschlossen`)
}

function loadTsObject(path, name, helpers = {}) {
  const expr = extractExportedObjectExpression(readFileSync(path, 'utf8'), name)
  const helperNames = Object.keys(helpers)
  const helperValues = Object.values(helpers)
  return Function(...helperNames, `"use strict"; return (${expr})`)(...helperValues)
}

export function figureAliases(ref) {
  const compact = ref.replace(/\s+/g, '')
  const aliases = new Set([ref.trim(), compact])
  const match = compact.match(/^(\d+)-(\d+)(.*)$/)
  if (match) {
    const [, chapter, number, suffix] = match
    aliases.add(`${chapter}-${number.padStart(2, '0')}${suffix}`)
    aliases.add(`${chapter}-${Number(number)}${suffix}`)
    const component = suffix.match(/^\((\d+)[a-z]\)$/i)
    if (component) {
      aliases.add(`${chapter}-${Number(number)}(${component[1]})`)
      aliases.add(`${chapter}-${number.padStart(2, '0')}(${component[1]})`)
    }
  }
  return aliases
}

export function canonicalFigureId(label) {
  const match = label.match(/^\s*(\d+)\s*-\s*(\d+)(?:\s*(?:\(([^)]*)\)|([a-z](?:\/[a-z])?)))?\s*$/i)
  if (!match) return null
  const [, chapter, rawNumber, parenSuffix, bareSuffix] = match
  const figure = `${chapter}-${rawNumber.padStart(2, '0')}`
  const suffix = (parenSuffix ?? bareSuffix ?? '').trim()
  if (!suffix) return figure
  const numberedPanel = suffix.match(/^(\d+)[a-z]$/i)
  if (numberedPanel) return `${figure}(${numberedPanel[1]})`
  if (/^\d+$/.test(suffix)) return `${figure}(${suffix})`
  return `${figure}${suffix.toUpperCase()}`
}

function addFigureAliases(figures, label) {
  const canonical = canonicalFigureId(label)
  if (!canonical) return
  for (const alias of figureAliases(label)) figures.add(alias)
  for (const alias of figureAliases(canonical)) figures.add(alias)
}

function markdownSection(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`)
  if (start < 0) throw new Error(`build-config: Mapping-Abschnitt "${heading}" fehlt`)
  const next = markdown.indexOf('\n## ', start + 1)
  return next < 0 ? markdown.slice(start) : markdown.slice(start, next)
}

export function loadKnownFigures(mappingPath = FIGURE_MAPPING) {
  const md = readFileSync(mappingPath, 'utf8')
  const tableSection = markdownSection(md, 'Zuordnung Abbildung → Bilddatei')
  const textOnlySection = markdownSection(md, 'Abbildungen ohne Bilddatei')
  const figures = new Set()
  for (const match of tableSection.matchAll(/^\|\s*\*\*([^*]+)\*\*\s*\|/gm)) {
    addFigureAliases(figures, match[1])
  }
  for (const match of textOnlySection.matchAll(/^-\s*\*\*([^*]+?)\s+[—-]/gm)) {
    addFigureAliases(figures, match[1])
  }
  if (figures.size === 0) throw new Error(`build-config: keine Kapitel-11-Abbildungen in ${mappingPath} gefunden`)
  return figures
}

function referencedSceneIds(config) {
  const sceneIds = new Set()
  for (const cfg of Object.values(config?.configurations ?? {})) {
    const sceneId = cfg?.overlay?.scene
    if (typeof sceneId === 'string' && sceneId.trim() !== '') sceneIds.add(sceneId)
  }
  return [...sceneIds].sort()
}

export function loadScenesContext(config, scenesRoot = join(APP_PUBLIC, 'scenes')) {
  const sceneIds = new Set()
  for (const sceneId of referencedSceneIds(config)) {
    const file = `${sceneId}.json`
    let raw
    try {
      raw = readFileSync(join(scenesRoot, file), 'utf8')
    } catch {
      throw new Error(`build-config: configuration overlay.scene "${sceneId}" referenziert fehlende Szene ${file}`)
    }
    let scene
    try {
      scene = JSON.parse(raw)
    } catch {
      throw new Error(`build-config: Szene ${file} ist kein gueltiges JSON`)
    }
    if (!scene.id) throw new Error(`build-config: Szene ${file} hat keine id`)
    if (scene.id !== sceneId) throw new Error(`build-config: Szene ${file} enthaelt id "${scene.id}"`)
    sceneIds.add(scene.id)
  }
  return { sceneIds }
}

function loadValidationContext(config) {
  const cameraDirections = loadTsObject(join(APP_SRC, 'scene/cameraPresets.ts'), 'CAMERA_DIRECTIONS')
  const colorPresets = JSON.parse(readFileSync(COLOR_PRESETS, 'utf8')).presets ?? []
  const meshIds = new Set(Object.keys(JSON.parse(readFileSync(STRUCTURE_COORDS, 'utf8'))))
  return {
    ...loadScenesContext(config),
    bucketMappings: config.mesh_mappings?.buckets,
    cameraShots: new Set(Object.keys(cameraDirections)),
    colorPresets: new Map(colorPresets.map((preset) => [preset.id, preset])),
    knownFigures: loadKnownFigures(),
    meshIds,
    sceneRegionMappings: config.mesh_mappings?.scene_regions,
  }
}

function validateColorPresetBuckets(preset, ctx, context) {
  for (const group of preset.groups ?? []) {
    for (const bucket of group.buckets ?? []) assertKnownBucket(bucket, ctx, context)
  }
}

function validateScopeMap(scopes, idx, context) {
  assertPlainObject(scopes, `${context}.scopes`)
  for (const [key, value] of Object.entries(scopes)) {
    assertBoolean(value, `${context}.scopes["${key}"]`)
    validateScopeKey(key, idx)
  }
}

function validateConfigurationSchema(name, c, idx) {
  const context = `configuration "${name}"`
  assertPlainObject(c, context)
  assertRequiredKeys(c, REQUIRED_CONFIGURATION_KEYS, context)
  assertString(c.label_de, `${context}.label_de`)
  assertString(c.title, `${context}.title`)
  assertString(c.section, `${context}.section`)
  assertOptionalString(c.replaces_figure, `${context}.replaces_figure`)

  if (c.facets !== undefined) {
    assertPlainObject(c.facets, `${context}.facets`)
    for (const key of Object.keys(c.facets)) assertOptionalBoolean(c.facets[key], `${context}.facets.${key}`)
  }
  assertPlainObject(c.view, `${context}.view`)
  assertOptionalString(c.view.surface, `${context}.view.surface`)
  assertOptionalBoolean(c.view.subcortex, `${context}.view.subcortex`)
  assertOptionalString(c.view.carve_on_taro, `${context}.view.carve_on_taro`)

  assertPlainObject(c.camera, `${context}.camera`)
  assertOptionalString(c.camera.target, `${context}.camera.target`)
  assertOptionalString(c.camera.shot, `${context}.camera.shot`)
  assertOptionalString(c.camera.fit, `${context}.camera.fit`)
  if (c.camera.bounds !== undefined) {
    assertPlainObject(c.camera.bounds, `${context}.camera.bounds`)
    assertKnownKeys(c.camera.bounds, CAMERA_BOUNDS_KEYS, `${context}.camera.bounds`)
    assertRequiredKeys(c.camera.bounds, ['center', 'radius'], `${context}.camera.bounds`)
  }
  if (c.camera.pose !== undefined) {
    assertPlainObject(c.camera.pose, `${context}.camera.pose`)
    assertKnownKeys(c.camera.pose, CAMERA_POSE_KEYS, `${context}.camera.pose`)
  }

  assertPlainObject(c.regions, `${context}.regions`)
  assertOptionalStringArray(c.regions.areas, `${context}.regions.areas`)
  assertOptionalStringArray(c.regions.buckets, `${context}.regions.buckets`)
  assertOptionalStringArray(c.regions.meshes, `${context}.regions.meshes`)
  assertOptionalStringArray(c.regions.scene_regions, `${context}.regions.scene_regions`)

  assertPlainObject(c.colors, `${context}.colors`)
  assertOptionalBoolean(c.colors.enabled, `${context}.colors.enabled`)
  assertOptionalString(c.colors.preset, `${context}.colors.preset`)
  assertOptionalBoolean(c.colors.dim_others, `${context}.colors.dim_others`)
  if (c.colors.groups !== undefined) {
    if (!Array.isArray(c.colors.groups)) throw new Error(`build-config: ${context}.colors.groups muss ein Array sein`)
    c.colors.groups.forEach((group, i) => {
      assertPlainObject(group, `${context}.colors.groups[${i}]`)
      assertKnownKeys(group, COLOR_GROUP_KEYS, `${context}.colors.groups[${i}]`)
      assertString(group.label, `${context}.colors.groups[${i}].label`)
      assertFiniteNumber(group.hue, `${context}.colors.groups[${i}].hue`)
      assertStringArray(group.buckets, `${context}.colors.groups[${i}].buckets`)
    })
  }

  assertPlainObject(c.visibility, `${context}.visibility`)
  assertOptionalBoolean(c.visibility.dim_others, `${context}.visibility.dim_others`)
  if (c.visibility.dim_opacity !== undefined) assertUnitNumber(c.visibility.dim_opacity, `${context}.visibility.dim_opacity`)
  assertOptionalStringArray(c.visibility.hidden, `${context}.visibility.hidden`)
  assertOptionalStringArray(c.visibility.isolated, `${context}.visibility.isolated`)

  assertPlainObject(c.cuts, `${context}.cuts`)
  assertOptionalBoolean(c.cuts.enabled, `${context}.cuts.enabled`)
  if (c.cuts.planes !== undefined) {
    if (!Array.isArray(c.cuts.planes)) throw new Error(`build-config: ${context}.cuts.planes muss ein Array sein`)
    c.cuts.planes.forEach((plane, i) => {
      assertPlainObject(plane, `${context}.cuts.planes[${i}]`)
      assertKnownKeys(plane, CUT_PLANE_KEYS, `${context}.cuts.planes[${i}]`)
    })
  }

  assertPlainObject(c.overlay, `${context}.overlay`)
  assertOptionalString(c.overlay.kind, `${context}.overlay.kind`)
  assertOptionalString(c.overlay.scene, `${context}.overlay.scene`)
  assertOptionalString(c.overlay.position, `${context}.overlay.position`)
  assertOptionalString(c.overlay.size, `${context}.overlay.size`)
  assertOptionalString(c.overlay.fallback_image, `${context}.overlay.fallback_image`)

  assertPlainObject(c.sequencing, `${context}.sequencing`)
  assertOptionalString(c.sequencing.presentation, `${context}.sequencing.presentation`)
  assertOptionalString(c.sequencing.learning, `${context}.sequencing.learning`)
  assertOptionalString(c.sequencing.step, `${context}.sequencing.step`)
  validateScopeMap(c.scopes, idx, context)
}

function validateFigureFields(name, c, idx, ctx) {
  if (c.replaces_figure && ctx.knownFigures && !ctx.knownFigures.has(c.replaces_figure)) {
    throw new Error(`build-config: configuration "${name}" replaces_figure "${c.replaces_figure}" — Figur unbekannt`)
  }
  if (c.camera?.target && !idx.areas.has(c.camera.target)) {
    throw new Error(`build-config: configuration "${name}" camera.target "${c.camera.target}" — Areal unbekannt`)
  }
  if (c.camera?.shot && ctx.cameraShots && !ctx.cameraShots.has(c.camera.shot)) {
    throw new Error(`build-config: configuration "${name}" camera.shot "${c.camera.shot}" unbekannt`)
  }
  if (c.camera?.fit && !CAMERA_FITS.has(c.camera.fit)) {
    throw new Error(`build-config: configuration "${name}" camera.fit "${c.camera.fit}" ungueltig`)
  }
  if (c.camera?.bounds !== undefined) {
    assertVec3(c.camera.bounds.center, `configuration "${name}" camera.bounds.center`)
    assertPositiveNumber(c.camera.bounds.radius, `configuration "${name}" camera.bounds.radius`)
  }
  if (c.camera?.margin !== undefined) assertPositiveNumber(c.camera.margin, `configuration "${name}" camera.margin`)
  if (c.camera?.fov !== undefined) assertCameraFov(c.camera.fov, `configuration "${name}" camera.fov`)
  if (c.camera?.pose !== undefined) {
    assertVec3(c.camera.pose.position, `configuration "${name}" camera.pose.position`)
    assertVec3(c.camera.pose.look_at, `configuration "${name}" camera.pose.look_at`)
  }
  for (const area of c.regions?.areas ?? []) {
    if (!idx.areas.has(area)) throw new Error(`build-config: configuration "${name}" regions.areas "${area}" — Areal unbekannt`)
  }
  for (const bucket of c.regions?.buckets ?? []) assertKnownBucket(bucket, ctx, `configuration "${name}" regions.buckets`)
  for (const mesh of c.regions?.meshes ?? []) assertKnownMesh(mesh, ctx, `configuration "${name}" regions.meshes`)
  for (const region of c.regions?.scene_regions ?? []) {
    const mapping = ctx.sceneRegionMappings?.[region]
    if (!mapping) {
      throw new Error(`build-config: configuration "${name}" regions.scene_regions "${region}" unbekannt`)
    }
    if (mapping.meshes.length === 0) {
      throw new Error(`build-config: configuration "${name}" regions.scene_regions "${region}" hat keine Geometrie`)
    }
  }
  if (c.colors?.preset !== undefined) {
    const preset = ctx.colorPresets?.get(c.colors.preset)
    if (!preset) throw new Error(`build-config: configuration "${name}" colors.preset "${c.colors.preset}" unbekannt`)
    validateColorPresetBuckets(preset, ctx, `configuration "${name}" colors.preset "${c.colors.preset}" Bucket`)
  }
  for (const group of c.colors?.groups ?? []) {
    for (const bucket of group.buckets ?? []) assertKnownBucket(bucket, ctx, `configuration "${name}" colors.groups Bucket`)
  }
  for (const mesh of c.visibility?.hidden ?? []) assertKnownMesh(mesh, ctx, `configuration "${name}" visibility.hidden`)
  for (const mesh of c.visibility?.isolated ?? []) assertKnownMesh(mesh, ctx, `configuration "${name}" visibility.isolated`)
  for (const [i, plane] of (c.cuts?.planes ?? []).entries()) {
    if (!CUT_AXES.has(plane.axis)) throw new Error(`build-config: configuration "${name}" cuts.planes[${i}].axis ungueltig`)
    assertFiniteNumber(plane.position, `configuration "${name}" cuts.planes[${i}].position`)
    if (plane.keep !== undefined && !CUT_KEEP.has(plane.keep)) {
      throw new Error(`build-config: configuration "${name}" cuts.planes[${i}].keep ungueltig`)
    }
  }
  if (c.overlay?.scene && ctx.sceneIds && !ctx.sceneIds.has(c.overlay.scene)) {
    throw new Error(`build-config: configuration "${name}" overlay.scene "${c.overlay.scene}" unbekannt`)
  }
}

function validateSequencingRefs(name, c, config) {
  if (c.sequencing?.presentation !== undefined && !config.presentation?.[c.sequencing.presentation]) {
    throw new Error(`build-config: configuration "${name}" sequencing.presentation "${c.sequencing.presentation}" unbekannt`)
  }
  if (c.sequencing?.learning !== undefined && !config.learning?.[c.sequencing.learning]) {
    throw new Error(`build-config: configuration "${name}" sequencing.learning "${c.sequencing.learning}" unbekannt`)
  }
  if (c.sequencing?.step !== undefined && !config.configurations?.[c.sequencing.step]) {
    throw new Error(`build-config: configuration "${name}" sequencing.step "${c.sequencing.step}" unbekannt`)
  }
}

function validateSequence(name, sequence, config) {
  const steps = new Set()
  for (const step of sequence.steps ?? []) {
    if (steps.has(step)) throw new Error(`build-config: ${name} enthaelt doppelten Step "${step}"`)
    steps.add(step)
    const stepConfig = config.configurations?.[step]
    if (!stepConfig) throw new Error(`build-config: ${name} referenziert unbekannten Step "${step}"`)
    const sceneId = stepConfig.overlay?.scene
    if (!sceneId) throw new Error(`build-config: ${name} Step "${step}" hat kein overlay.scene`)
  }
}

/** Validiert die ganze Config gegen den Katalog. Jede tote Referenz wirft. */
export function validateConfig(config, idx, ctx = {}) {
  assertPlainObject(config, 'root')
  assertRequiredKeys(config, REQUIRED_ROOT_KEYS, 'root')
  assertKnownKeys(config, ROOT_KEYS, 'root')
  assertString(config.preset, 'root.preset')
  assertPlainObject(config.presets, 'presets')
  assertPlainObject(config.configurations, 'configurations')
  assertPlainObject(config.presentation, 'presentation')
  assertPlainObject(config.learning, 'learning')
  if (!config.presets?.[config.preset]) {
    throw new Error(`build-config: aktives Preset "${config.preset}" nicht in [presets] definiert`)
  }
  validateMeshMappings(config.mesh_mappings, ctx)
  const validationCtx = {
    ...ctx,
    bucketMappings: config.mesh_mappings.buckets,
    sceneRegionMappings: config.mesh_mappings.scene_regions,
  }
  for (const [name, p] of Object.entries(config.presets)) {
    assertPlainObject(p, `preset "${name}"`)
    assertString(p.label_de, `preset "${name}".label_de`)
    assertKnownKeys(p, PRESET_KEYS, `preset "${name}"`)
    validateScopeMap(p.scopes, idx, `preset "${name}"`)
  }
  for (const [name, c] of Object.entries(config.configurations ?? {})) {
    validateConfigurationSchema(name, c, idx)
    assertKnownKeys(c, CONFIGURATION_KEYS, `configuration "${name}"`)
    for (const fk of Object.keys(c.facets ?? {})) {
      if (!FACET_KEYS.has(fk)) throw new Error(`build-config: configuration "${name}" hat unbekannte Facette "${fk}"`)
    }
    assertKnownKeys(c.view, VIEW_KEYS, `configuration "${name}".view`)
    if (c.view?.surface && !SURFACES.has(c.view.surface)) {
      throw new Error(`build-config: configuration "${name}" view.surface "${c.view.surface}" ungueltig`)
    }
    if (c.view?.carve_on_taro && !CARVE.has(c.view.carve_on_taro)) {
      throw new Error(`build-config: configuration "${name}" view.carve_on_taro "${c.view.carve_on_taro}" ungueltig`)
    }
    assertKnownKeys(c.camera, CAMERA_KEYS, `configuration "${name}".camera`)
    assertKnownKeys(c.regions, REGION_KEYS, `configuration "${name}".regions`)
    assertKnownKeys(c.colors, COLOR_KEYS, `configuration "${name}".colors`)
    assertKnownKeys(c.visibility, VISIBILITY_KEYS, `configuration "${name}".visibility`)
    assertKnownKeys(c.cuts, CUTS_KEYS, `configuration "${name}".cuts`)
    assertKnownKeys(c.overlay, OVERLAY_KEYS, `configuration "${name}".overlay`)
    if (c.overlay?.kind && !OVERLAY_KINDS.has(c.overlay.kind)) {
      throw new Error(`build-config: configuration "${name}" overlay.kind "${c.overlay.kind}" ungueltig`)
    }
    assertKnownKeys(c.sequencing, SEQUENCING_KEYS, `configuration "${name}".sequencing`)
    validateFigureFields(name, c, idx, validationCtx)
    validateSequencingRefs(name, c, config)
  }
  for (const seqKind of ['presentation', 'learning']) {
    for (const [seqName, seq] of Object.entries(config[seqKind] ?? {})) {
      assertPlainObject(seq, `${seqKind} "${seqName}"`)
      assertKnownKeys(seq, SEQUENCE_KEYS, `${seqKind} "${seqName}"`)
      assertString(seq.label_de, `${seqKind} "${seqName}".label_de`)
      assertStringArray(seq.steps, `${seqKind} "${seqName}".steps`)
      validateSequence(`${seqKind} "${seqName}"`, seq, config)
    }
  }
}

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedValue(value[key])]))
}

export function formatConfig(config) {
  return `${JSON.stringify(sortedValue(config), null, 2)}\n`
}

/** smol-toml aus apps/brain-app/node_modules aufloesen (nicht von repo-root sichtbar). */
async function loadToml(path) {
  const appReq = createRequire(pathToFileURL(join(HERE, '../../apps/brain-app/package.json')))
  const { parse } = await import(pathToFileURL(appReq.resolve('smol-toml')))
  return parse(readFileSync(path, 'utf8'))
}

/** Parst config.default.toml, validiert gegen Katalog, gibt {config} zurueck. */
export async function buildConfig() {
  const catalog = JSON.parse(readFileSync(join(APP_ASSETS, 'atlas-ontology.json'), 'utf8'))
  const config = await loadToml(join(HERE, 'config.default.toml'))
  const idx = indexCatalog(catalog)
  validateConfig(config, idx, loadValidationContext(config))
  return { config }
}

async function main() {
  const { config } = await buildConfig()
  const out = join(APP_ASSETS, 'atlas-config.json')
  writeFileSync(out, formatConfig(config))
  writeFileSync(GENERATED_MESH_MAPPINGS, formatConfig(config.mesh_mappings))
  const nCfg = Object.keys(config.configurations ?? {}).length
  const nPreset = Object.keys(config.presets ?? {}).length
  console.log(`build-config: ${nPreset} Presets, ${nCfg} Configurations -> ${out}`)
  console.log(`build-config: Mesh-Mappings -> ${GENERATED_MESH_MAPPINGS}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
