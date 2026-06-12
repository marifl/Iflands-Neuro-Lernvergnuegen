/**
 * Figur-spezifische Farb-Presets: laedt `companion/config/color-presets.json` und loest
 * jede Gruppe (Buckets + Hue) auf konkrete Mesh-Farben auf. Trägt die didaktischen
 * Färbungen der Lehrbuch-Abbildungen (Abb. 11-04, 11-05, 11-13, ...).
 *
 * Mehr-Hue-Palette ist hier bewusst erlaubt (didaktische Daten-Visualisierung: jede
 * funktionelle Gruppe braucht eine distinkte Farbe), bleibt aber gedaempft (kontrollierte
 * Saettigung/Helligkeit), passend zur editorialen Zurueckhaltung der App.
 */
import { z } from 'zod'
import { bucketToMeshes } from './bucketMeshes'

const ColorGroupSchema = z.object({
  label: z.string(),
  hue: z.number(),
  buckets: z.array(z.string()).min(1),
})

const ColorPresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  groups: z.array(ColorGroupSchema).min(1),
  dimOthers: z.boolean().default(true),
})

const ColorPresetsFileSchema = z.object({
  version: z.number(),
  presets: z.array(ColorPresetSchema).min(1),
})

export type ColorGroup = z.infer<typeof ColorGroupSchema>
export type ColorPreset = z.infer<typeof ColorPresetSchema>

/** Gedaempftes Neutral fuer nicht-gruppierte Strukturen, wenn `dimOthers` aktiv ist. */
export const PRESET_DIM_COLOR = '#3a3631'

const COLOR_PRESETS_URL = '/companion/config/color-presets.json'

/** Rohdaten gegen das Schema validieren (rein, fuer Tests + Loader). Wirft laut bei Verstoss. */
export function parseColorPresets(raw: unknown): ColorPreset[] {
  return ColorPresetsFileSchema.parse(raw).presets
}

/** Presets laden + validieren. Wirft laut bei HTTP- oder Schema-Fehler (kein stiller Fallback). */
export async function fetchColorPresets(): Promise<ColorPreset[]> {
  const res = await fetch(COLOR_PRESETS_URL)
  if (!res.ok) throw new Error(`color-presets.json nicht ladbar (HTTP ${res.status})`)
  return parseColorPresets(await res.json())
}

/** Hue (0-360) -> gedaempftes Hex. Saettigung/Helligkeit fix, damit die Palette ruhig bleibt. */
export function hueToHex(hue: number, sat = 0.46, light = 0.52): string {
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const hp = (((hue % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const hex = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/**
 * Preset -> Map(Mesh-Name -> Hex). Jede Gruppe faerbt alle Meshes ihrer Buckets in der
 * Gruppen-Farbe. Wirft laut, wenn ein Bucket keine Geometrie hat (via bucketToMeshes).
 * Meshes, die in keiner Gruppe sind, fehlen in der Map (Aufrufer dimmt sie bei dimOthers).
 */
export function resolvePresetColors(preset: ColorPreset): Map<string, string> {
  const out = new Map<string, string>()
  for (const group of preset.groups) {
    const color = hueToHex(group.hue)
    for (const bucket of group.buckets) {
      for (const mesh of bucketToMeshes(bucket)) {
        if (!out.has(mesh)) out.set(mesh, color)
      }
    }
  }
  return out
}

/**
 * Pruefen, ob ein Preset mit der aktuellen Geometrie aufloesbar ist. Liefert die
 * Fehler-Message (z.B. Geometrie-Luecke) oder null bei OK. Fuer den Picker, damit
 * ein noch nicht baubares Preset deaktiviert statt den Viewer crashen kann.
 */
export function presetIssue(preset: ColorPreset): string | null {
  try {
    resolvePresetColors(preset)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}
