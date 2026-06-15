// Save-Loop (Autoren): serialisiert den aktuellen Toggle-/View-/Kamera-Zustand als
// [configurations.<name>]-TOML-Block zum Copy-Paste in config.default.toml. Kein Runtime-Write.
// Der erzeugte Block ist nach Re-Parse + build-config validierbar (Roundtrip-Garantie).
import type { ScopeMap, ConfigView, ConfigCamera } from './atlasConfig'

export interface ExportInput {
  scopes: ScopeMap
  view: ConfigView
  camera: ConfigCamera
}

/** TOML-String-Quoting fuer Werte. */
function tomlStr(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Erzeugt einen [configurations.<name>]-Block aus dem aktuellen Zustand. */
export function toTomlConfiguration(name: string, input: ExportInput): string {
  const lines: string[] = []
  lines.push(`[configurations.${name}]`)
  lines.push(`label_de = ${tomlStr(name)}`)

  const view = input.view
  const viewKeys = Object.keys(view) as (keyof ConfigView)[]
  if (viewKeys.length > 0) {
    lines.push('')
    lines.push(`[configurations.${name}.view]`)
    if (view.surface !== undefined) lines.push(`surface = ${tomlStr(view.surface)}`)
    if (view.subcortex !== undefined) lines.push(`subcortex = ${view.subcortex}`)
    if (view.carve_on_taro !== undefined) lines.push(`carve_on_taro = ${tomlStr(view.carve_on_taro)}`)
  }

  if (input.camera.target !== undefined) {
    lines.push('')
    lines.push(`[configurations.${name}.camera]`)
    lines.push(`target = ${tomlStr(input.camera.target)}`)
  }

  const scopeKeys = Object.keys(input.scopes)
  if (scopeKeys.length > 0) {
    lines.push('')
    lines.push(`[configurations.${name}.scopes]`)
    for (const key of scopeKeys) lines.push(`${tomlStr(key)} = ${input.scopes[key]}`)
  }

  return lines.join('\n') + '\n'
}
