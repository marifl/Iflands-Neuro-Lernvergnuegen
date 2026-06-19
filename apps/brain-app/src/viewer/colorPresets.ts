/**
 * Figur-spezifische Farb-Presets: lädt die kanonische Atlas-Config und löst
 * jede Gruppe (Buckets + Hue) auf konkrete Mesh-Farben auf. Trägt die didaktischen
 * Färbungen der Lehrbuch-Abbildungen und Vortrags-Configs (Abb. 11-04, 11-05, 11-13, ...).
 *
 * Mehr-Hue-Palette ist hier bewusst erlaubt (didaktische Daten-Visualisierung: jede
 * funktionelle Gruppe braucht eine distinkte Farbe), bleibt aber gedaempft (kontrollierte
 * Saettigung/Helligkeit), passend zur editorialen Zurueckhaltung der App.
 */
import { z } from 'zod'
import {
  ATLAS_VIEWER_COLORS,
  COLOR_ROLE_VALUES,
  PRESET_HUE_LIGHTNESS,
  PRESET_HUE_SATURATION,
  type ColorRole,
} from './atlasColorSystem'
import { bucketToMeshes } from './bucketMeshes'

const ColorGroupSchema = z.object({
  label: z.string(),
  role: z.enum(COLOR_ROLE_VALUES),
  meaning: z.string().min(1),
  hue: z.number(),
  buckets: z.array(z.string()).min(1),
})

const ColorPresetNodeSchema = z.object({
  label: z.string(),
  sourceFigure: z.string().optional(),
  intent: z.string().min(1),
  coverage: z.enum(['full', 'partial']).default('full'),
  coverageNote: z.string().optional(),
  groups: z.array(ColorGroupSchema).min(1),
  dimOthers: z.boolean().default(true),
}).superRefine((preset, ctx) => {
  if (preset.coverage === 'partial' && !preset.coverageNote) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'coverageNote ist Pflicht bei coverage="partial"',
      path: ['coverageNote'],
    })
  }
})

const AtlasColorConfigSchema = z.object({
  color_presets: z.record(ColorPresetNodeSchema),
  configurations: z.record(z.object({
    label_de: z.string(),
    replaces_figure: z.string().optional(),
    colors: z.object({
      preset: z.string().optional(),
      dim_others: z.boolean().optional(),
      scheme: z.string().optional(),
    }).optional(),
    overlay: z.object({ scene: z.string().optional() }).optional(),
  })),
  presentation: z.record(z.object({
    label_de: z.string(),
    steps: z.array(z.string()),
  })),
})

export type ColorGroup = z.infer<typeof ColorGroupSchema>
export type ColorPreset = z.infer<typeof ColorPresetNodeSchema> & { id: string }
export type { ColorRole }

export interface PresentationColorItem {
  id: string
  label: string
  scene: string
  sourceFigure?: string
  colorScheme?: string
  colorPresetId?: string
  dimOthers?: boolean
}

/** Gedaempftes Neutral fuer nicht-gruppierte Strukturen, wenn `dimOthers` aktiv ist. */
export const PRESET_DIM_COLOR = ATLAS_VIEWER_COLORS.presetDim

const ATLAS_CONFIG_URL = '/assets/atlas-canonical/atlas-config.json'

/** Rohdaten gegen das Schema validieren (rein, fuer Tests + Loader). Wirft laut bei Verstoss. */
export function parseColorPresets(raw: unknown): ColorPreset[] {
  const parsed = AtlasColorConfigSchema.parse(raw)
  const entries = Object.entries(parsed.color_presets)
  if (entries.length === 0) throw new Error('atlas-config.json enthaelt keine color_presets')
  return entries.map(([id, preset]) => ({ id, ...preset }))
}

function parseAtlasColorConfig(raw: unknown): z.infer<typeof AtlasColorConfigSchema> {
  return AtlasColorConfigSchema.parse(raw)
}

/** Presets laden + validieren. Wirft laut bei HTTP- oder Schema-Fehler (kein stiller Fallback). */
export async function fetchColorPresets(): Promise<ColorPreset[]> {
  const res = await fetch(ATLAS_CONFIG_URL)
  if (!res.ok) throw new Error(`atlas-config.json nicht ladbar (HTTP ${res.status})`)
  return parseColorPresets(await res.json())
}

export function presentationColorItemsFromConfig(raw: unknown, sequenceName = 'kapitel11-vorlesung'): PresentationColorItem[] {
  const parsed = parseAtlasColorConfig(raw)
  const sequence = parsed.presentation[sequenceName]
  if (!sequence) throw new Error(`presentationColorItemsFromConfig: Sequence "${sequenceName}" fehlt`)
  return sequence.steps.map((id) => {
    const cfg = parsed.configurations[id]
    if (!cfg) throw new Error(`presentationColorItemsFromConfig: Configuration "${id}" fehlt`)
    const scene = cfg.overlay?.scene
    if (!scene) throw new Error(`presentationColorItemsFromConfig: Configuration "${id}" hat kein overlay.scene`)
    const colorPresetId = cfg.colors?.preset
    if (colorPresetId && !parsed.color_presets[colorPresetId]) {
      throw new Error(`presentationColorItemsFromConfig: Farb-Preset "${colorPresetId}" fehlt`)
    }
    return {
      id,
      label: cfg.label_de,
      scene,
      ...(cfg.replaces_figure === undefined ? {} : { sourceFigure: cfg.replaces_figure }),
      ...(cfg.colors?.scheme === undefined ? {} : { colorScheme: cfg.colors.scheme }),
      ...(colorPresetId === undefined ? {} : { colorPresetId }),
      ...(cfg.colors?.dim_others === undefined ? {} : { dimOthers: cfg.colors.dim_others }),
    }
  })
}

export async function fetchPresentationColorItems(sequenceName = 'kapitel11-vorlesung'): Promise<PresentationColorItem[]> {
  const res = await fetch(ATLAS_CONFIG_URL)
  if (!res.ok) throw new Error(`atlas-config.json nicht ladbar (HTTP ${res.status})`)
  return presentationColorItemsFromConfig(await res.json(), sequenceName)
}

/** Hue (0-360) -> gedaempftes Hex. Saettigung/Helligkeit fix, damit die Palette ruhig bleibt. */
export function hueToHex(hue: number, sat = PRESET_HUE_SATURATION, light = PRESET_HUE_LIGHTNESS): string {
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
 * Config-spezifischer Preset-Schnitt: Nur Buckets, die die aktive Config deklariert,
 * bleiben in den Gruppen. Keine stillen Extra-Buckets in 3D oder Legende.
 */
export function restrictPresetToBuckets(preset: ColorPreset, buckets: readonly string[], context = preset.id): ColorPreset {
  const wanted = new Set(buckets)
  if (wanted.size === 0) {
    throw new Error(`restrictPresetToBuckets: ${context} nutzt ein Farb-Preset ohne regions.buckets`)
  }

  const bucketOwners = new Map<string, string>()
  for (const group of preset.groups) {
    for (const bucket of group.buckets) {
      const owner = bucketOwners.get(bucket)
      if (owner && owner !== group.label) {
        throw new Error(
          `restrictPresetToBuckets: Bucket "${bucket}" liegt in mehreren Preset-Gruppen (${owner}, ${group.label})`,
        )
      }
      bucketOwners.set(bucket, group.label)
    }
  }

  const missing = [...wanted].filter((bucket) => !bucketOwners.has(bucket))
  if (missing.length > 0) {
    throw new Error(
      `restrictPresetToBuckets: Preset "${preset.id}" deckt Config "${context}" nicht ab; fehlende Buckets: ${missing.join(', ')}`,
    )
  }

  const groups = preset.groups.flatMap((group) => {
    const relevantBuckets = group.buckets.filter((bucket) => wanted.has(bucket))
    return relevantBuckets.length > 0 ? [{ ...group, buckets: relevantBuckets }] : []
  })
  if (groups.length === 0) {
    throw new Error(`restrictPresetToBuckets: Config "${context}" hat keine relevante Preset-Gruppe`)
  }

  return { ...preset, groups }
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
