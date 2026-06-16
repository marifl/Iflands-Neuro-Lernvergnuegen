import { targetMeshesForCamera, type AtlasConfigFile, type ConfigCamera, type ConfigurationNode, type SequenceNode } from '../viewer/atlas/atlasConfig'
import { loadCatalog, type AtlasCatalog } from '../viewer/atlas/atlasCatalog'
import type { SceneLocation, SceneSequenceKind } from './router'
import { SceneSchema, type Scene } from './types'

const CONFIG_URL = '/assets/atlas-canonical/atlas-config.json'
const DEFAULT_SEQUENCE_KIND = 'learning'
const DEFAULT_SEQUENCE_NAME = 'kapitel11-pfad'

export type SequenceKind = SceneSequenceKind

export interface LoadScenesOptions {
  sequenceKind?: SequenceKind
  sequenceName?: string
}

export type LoadedScene = Scene & {
  configName: string
  configCamera?: ConfigCamera
  configCameraTargetMeshes: string[]
}

interface SequenceSceneRef {
  id: string
  configName: string
  config: ConfigurationNode
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`scenes: ${url} nicht ladbar (HTTP ${res.status})`)
  return res.json()
}

function sequenceMap(file: AtlasConfigFile, kind: SequenceKind): Record<string, SequenceNode> {
  const sequences = kind === 'learning' ? file.learning : file.presentation
  if (!sequences || typeof sequences !== 'object') {
    throw new Error(`scenes: Config enthaelt keine Sequenzen fuer "${kind}"`)
  }
  return sequences
}

function sequenceFor(file: AtlasConfigFile, kind: SequenceKind, name: string): SequenceNode {
  const sequence = sequenceMap(file, kind)[name]
  if (!sequence) throw new Error(`scenes: Sequenz "${kind}.${name}" nicht definiert`)
  return sequence
}

function sceneForStep(file: AtlasConfigFile, step: string): SequenceSceneRef {
  const config = file.configurations[step]
  if (!config) throw new Error(`scenes: Sequenz-Step "${step}" nicht als Configuration definiert`)
  const sceneId = config.overlay?.scene
  if (!sceneId) throw new Error(`scenes: Sequenz-Step "${step}" hat kein overlay.scene`)
  return { id: sceneId, configName: step, config }
}

function scenesForSequence(file: AtlasConfigFile, sequence: SequenceNode): SequenceSceneRef[] {
  const steps = new Set<string>()
  return sequence.steps.map((step) => {
    if (steps.has(step)) throw new Error(`scenes: Sequenz enthaelt doppelten Step "${step}"`)
    steps.add(step)
    return sceneForStep(file, step)
  })
}

async function loadConfigFile(): Promise<AtlasConfigFile> {
  return (await fetchJson(CONFIG_URL)) as AtlasConfigFile
}

function needsCameraTargetMeshes(refs: SequenceSceneRef[]): boolean {
  return refs.some((ref) => ref.config.camera?.fit === 'target')
}

function cameraTargetMeshes(ref: SequenceSceneRef, catalog: AtlasCatalog | null): string[] {
  if (ref.config.camera?.fit !== 'target') return []
  if (!catalog) throw new Error(`scenes: Configuration "${ref.configName}" camera.fit="target" braucht Atlas-Katalog`)
  return targetMeshesForCamera(catalog, ref.configName, ref.config.camera)
}

async function loadScene(ref: SequenceSceneRef, catalog: AtlasCatalog | null): Promise<LoadedScene> {
  const scene = SceneSchema.parse(await fetchJson(`/scenes/${ref.id}.json`))
  if (scene.id !== ref.id) throw new Error(`scenes: ${ref.id}.json enthaelt id "${scene.id}"`)
  const configCameraTargetMeshes = cameraTargetMeshes(ref, catalog)
  if (!ref.config.camera) return { ...scene, configName: ref.configName, configCameraTargetMeshes }
  return { ...scene, configName: ref.configName, configCamera: ref.config.camera, configCameraTargetMeshes }
}

export function sceneIndexForLocation(scenes: LoadedScene[], loc: SceneLocation): number {
  if (loc.configName && loc.sceneId) {
    const byConfig = scenes.find((scene) => scene.configName === loc.configName)
    if (!byConfig) throw new Error(`scenes: URL-Config "${loc.configName}" ist nicht in der geladenen Sequenz`)
    if (byConfig.id !== loc.sceneId) {
      throw new Error(
        `scenes: URL-Config "${loc.configName}" verweist auf Scene "${byConfig.id}", URL-Scene "${loc.sceneId}" passt nicht`,
      )
    }
    return scenes.indexOf(byConfig)
  }

  if (loc.sceneId) return scenes.findIndex((scene) => scene.id === loc.sceneId)
  if (loc.configName) return scenes.findIndex((scene) => scene.configName === loc.configName)
  return 0
}

/** Laedt + validiert Szenen in der Reihenfolge der versionierten Config-Sequenz. */
export async function loadScenes(options: LoadScenesOptions = {}): Promise<LoadedScene[]> {
  const file = await loadConfigFile()
  const sequence = sequenceFor(
    file,
    options.sequenceKind ?? DEFAULT_SEQUENCE_KIND,
    options.sequenceName ?? DEFAULT_SEQUENCE_NAME,
  )
  const refs = scenesForSequence(file, sequence)
  const catalog = needsCameraTargetMeshes(refs) ? await loadCatalog() : null
  return Promise.all(refs.map((ref) => loadScene(ref, catalog)))
}
