// Save-Loop (Autoren): serialisiert den aktuellen Toggle-/View-/Kamera-Zustand als
// [configurations.<name>]-TOML-Block zum Copy-Paste in config.default.toml. Kein Runtime-Write.
// Der erzeugte Block ist nach Re-Parse + build-config validierbar (Roundtrip-Garantie).
import type { AtlasConfigFile, ConfigCamera, ConfigurationNode, ConfigView, ScopeMap } from './atlasConfig'

export type ExportInput = Partial<Omit<ConfigurationNode, 'label_de' | 'scopes'>> & {
  label_de?: string
  scopes: ScopeMap
  view?: ConfigView
  camera?: ConfigCamera
}

/** TOML-String-Quoting fuer Werte. */
function tomlStr(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function tomlStringArray(values: string[]): string {
  return `[${values.map(tomlStr).join(', ')}]`
}

function tomlNumberArray(values: [number, number, number]): string {
  return `[${values.join(', ')}]`
}

function inlineTable(fields: [string, string | undefined][]): string {
  return `{ ${fields.filter(([, value]) => value !== undefined).map(([key, value]) => `${key} = ${value}`).join(', ')} }`
}

function pushTable(lines: string[], name: string, table: string, rows: [string, string | undefined][]): void {
  const present = rows.filter(([, value]) => value !== undefined)
  if (present.length === 0) return
  lines.push('')
  lines.push(`[configurations.${name}.${table}]`)
  for (const [key, value] of present) lines.push(`${key} = ${value}`)
}

/** Erzeugt einen [configurations.<name>]-Block aus dem aktuellen Zustand. */
export function toTomlConfiguration(name: string, input: ExportInput): string {
  const lines: string[] = []
  lines.push(`[configurations.${name}]`)
  lines.push(`label_de = ${tomlStr(input.label_de ?? name)}`)
  if (input.title !== undefined) lines.push(`title = ${tomlStr(input.title)}`)
  if (input.section !== undefined) lines.push(`section = ${tomlStr(input.section)}`)
  if (input.replaces_figure !== undefined) lines.push(`replaces_figure = ${tomlStr(input.replaces_figure)}`)

  const view = input.view ?? {}
  pushTable(lines, name, 'facets', [
    ['clinic', input.facets?.clinic?.toString()],
    ['function', input.facets?.function?.toString()],
    ['chapter', input.facets?.chapter?.toString()],
    ['provenance', input.facets?.provenance?.toString()],
  ])
  pushTable(lines, name, 'view', [
    ['surface', view.surface !== undefined ? tomlStr(view.surface) : undefined],
    ['subcortex', view.subcortex?.toString()],
    ['carve_on_taro', view.carve_on_taro !== undefined ? tomlStr(view.carve_on_taro) : undefined],
  ])

  const camera = input.camera ?? {}
  pushTable(lines, name, 'camera', [
    ['target', camera.target !== undefined ? tomlStr(camera.target) : undefined],
    ['shot', camera.shot !== undefined ? tomlStr(camera.shot) : undefined],
    ['fit', camera.fit !== undefined ? tomlStr(camera.fit) : undefined],
    ['margin', camera.margin?.toString()],
    ['fov', camera.fov?.toString()],
  ])
  pushTable(lines, name, 'camera.bounds', [
    ['center', camera.bounds ? tomlNumberArray(camera.bounds.center) : undefined],
    ['radius', camera.bounds?.radius.toString()],
  ])
  pushTable(lines, name, 'camera.pose', [
    ['position', camera.pose ? tomlNumberArray(camera.pose.position) : undefined],
    ['look_at', camera.pose ? tomlNumberArray(camera.pose.look_at) : undefined],
  ])

  pushTable(lines, name, 'regions', [
    ['areas', input.regions?.areas !== undefined ? tomlStringArray(input.regions.areas) : undefined],
    ['buckets', input.regions?.buckets !== undefined ? tomlStringArray(input.regions.buckets) : undefined],
    ['meshes', input.regions?.meshes !== undefined ? tomlStringArray(input.regions.meshes) : undefined],
    ['scene_regions', input.regions?.scene_regions !== undefined ? tomlStringArray(input.regions.scene_regions) : undefined],
  ])

  pushTable(lines, name, 'colors', [
    ['enabled', input.colors?.enabled?.toString()],
    ['preset', input.colors?.preset !== undefined ? tomlStr(input.colors.preset) : undefined],
    ['groups', input.colors?.groups !== undefined
      ? `[${input.colors.groups.map((group) => inlineTable([
        ['label', tomlStr(group.label)],
        ['hue', group.hue.toString()],
        ['buckets', tomlStringArray(group.buckets)],
      ])).join(', ')}]`
      : undefined],
    ['dim_others', input.colors?.dim_others?.toString()],
  ])

  pushTable(lines, name, 'visibility', [
    ['dim_others', input.visibility?.dim_others?.toString()],
    ['dim_opacity', input.visibility?.dim_opacity?.toString()],
    ['hidden', input.visibility?.hidden !== undefined ? tomlStringArray(input.visibility.hidden) : undefined],
    ['isolated', input.visibility?.isolated !== undefined ? tomlStringArray(input.visibility.isolated) : undefined],
  ])

  pushTable(lines, name, 'cuts', [
    ['enabled', input.cuts?.enabled?.toString()],
    ['planes', input.cuts?.planes !== undefined
      ? `[${input.cuts.planes.map((plane) => inlineTable([
        ['axis', tomlStr(plane.axis)],
        ['position', plane.position.toString()],
        ['keep', plane.keep !== undefined ? tomlStr(plane.keep) : undefined],
      ])).join(', ')}]`
      : undefined],
  ])

  pushTable(lines, name, 'overlay', [
    ['kind', input.overlay?.kind !== undefined ? tomlStr(input.overlay.kind) : undefined],
    ['scene', input.overlay?.scene !== undefined ? tomlStr(input.overlay.scene) : undefined],
    ['position', input.overlay?.position !== undefined ? tomlStr(input.overlay.position) : undefined],
    ['size', input.overlay?.size !== undefined ? tomlStr(input.overlay.size) : undefined],
    ['fallback_image', input.overlay?.fallback_image !== undefined ? tomlStr(input.overlay.fallback_image) : undefined],
  ])

  pushTable(lines, name, 'sequencing', [
    ['presentation', input.sequencing?.presentation !== undefined ? tomlStr(input.sequencing.presentation) : undefined],
    ['learning', input.sequencing?.learning !== undefined ? tomlStr(input.sequencing.learning) : undefined],
    ['step', input.sequencing?.step !== undefined ? tomlStr(input.sequencing.step) : undefined],
  ])

  const scopeKeys = Object.keys(input.scopes)
  if (scopeKeys.length > 0) {
    lines.push('')
    lines.push(`[configurations.${name}.scopes]`)
    for (const key of scopeKeys.sort()) lines.push(`${tomlStr(key)} = ${input.scopes[key]}`)
  }

  return lines.join('\n') + '\n'
}

export function toCanonicalTomlConfiguration(file: AtlasConfigFile, name: string): string {
  const cfg = file.configurations[name]
  if (!cfg) throw new Error(`toCanonicalTomlConfiguration: Configuration "${name}" nicht definiert`)
  return toTomlConfiguration(name, cfg)
}
