/**
 * Versionierter Lab-Overlay-Datenvertrag (NF: b4U4JPZcVwMw).
 *
 * Beschreibt importierte Laborergebnisse (EEG-/tDCS-/fMRI-aehnlich) als Overlays
 * auf austauschbaren Brain Models, ohne Handkodierung in Szenen. Trennt bewusst:
 *   - diskrete ROI-/Parzellenflaechen (benannte Areale, optional skalarwertig),
 *   - kontinuierliche Wertefelder (per-Region-Messwerte mit Einheit + Colormap),
 *   - Label-/Callout-Metadaten.
 *
 * Jedes Paket traegt `brainModelId`, `space` und `provenance`. Ungueltige IDs,
 * unbekannte Atlanten und uneindeutige Raumangaben werfen laut (kein Fallback).
 *
 * Zod wird wie in colorPresets.ts fuer "lade + validiere externe Daten" genutzt.
 */
import { z } from 'zod'

export const OVERLAY_CONTRACT_VERSION = 1

/** Eindeutiger Koordinatenraum. Uneindeutige/unbekannte Angabe wirft laut. */
export const BRAIN_SPACES = ['taro', 'mni152', 'fsaverage'] as const

/** Bekannte Atlanten. Unbekannter Atlas wirft laut. */
export const OVERLAY_ATLASES = ['dkt', 'brodmann', 'julich', 'destrieux', 'subcortical'] as const

/** Messwert-Einheiten fuer Laborergebnisse. */
export const OVERLAY_UNITS = ['t-score', 'z-score', 'p-value', 'percent-bold', 'microvolt', 'mm3', 'count', 'unitless'] as const

/** Colormaps fuer kontinuierliche Wertefelder. */
export const OVERLAY_COLORMAPS = ['hot', 'viridis', 'diverging', 'grayscale'] as const

const ProvenanceSchema = z.object({
  source: z.string().min(1),
  method: z.string().min(1).optional(),
  subjectCount: z.number().int().positive().optional(),
})

/** Diskrete ROI/Parzelle: benannte Flaeche mit optionalem Skalarwert + Farbe. */
const DiscreteRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number().optional(),
  color: z.tuple([z.number(), z.number(), z.number()]).optional(),
})

const DiscreteLayerSchema = z.object({
  kind: z.literal('discrete'),
  atlasId: z.enum(OVERLAY_ATLASES),
  unit: z.enum(OVERLAY_UNITS).default('unitless'),
  regions: z.array(DiscreteRegionSchema).min(1),
})

/** Kontinuierliche Werteskala mit Einheit, Schwelle und Colormap. */
const ContinuousScaleSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(OVERLAY_UNITS),
    colormap: z.enum(OVERLAY_COLORMAPS),
    threshold: z.number().optional(),
    clamp: z.boolean().default(true),
  })
  .superRefine((scale, ctx) => {
    if (scale.max <= scale.min) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'max muss groesser als min sein', path: ['max'] })
    }
    if (scale.threshold !== undefined && (scale.threshold < scale.min || scale.threshold > scale.max)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'threshold muss zwischen min und max liegen', path: ['threshold'] })
    }
  })

/** Kontinuierliches Feld: regionId/vertexKey -> Messwert. */
const ContinuousLayerSchema = z.object({
  kind: z.literal('continuous'),
  atlasId: z.enum(OVERLAY_ATLASES).optional(),
  scale: ContinuousScaleSchema,
  values: z.record(z.number()).refine((v) => Object.keys(v).length > 0, 'values darf nicht leer sein'),
})

const OverlayLayerSchema = z.discriminatedUnion('kind', [DiscreteLayerSchema, ContinuousLayerSchema])

/** Label/Callout auf eine Region. */
const CalloutSchema = z.object({
  regionId: z.string().min(1),
  text: z.string().min(1),
})

export const LabOverlaySchema = z.object({
  version: z.literal(OVERLAY_CONTRACT_VERSION),
  id: z.string().min(1),
  label: z.string().min(1),
  // brainModelId bleibt opaker Ref auf die (noch zu bauende) BrainModel-Registry;
  // ponytail: hier nur non-empty validiert, Registry-Mitgliedschaft prueft der Wire-Step.
  brainModelId: z.string().min(1),
  space: z.enum(BRAIN_SPACES),
  provenance: ProvenanceSchema,
  layers: z.array(OverlayLayerSchema).min(1),
  callouts: z.array(CalloutSchema).default([]),
})

export type BrainSpace = (typeof BRAIN_SPACES)[number]
export type OverlayAtlasId = (typeof OVERLAY_ATLASES)[number]
export type OverlayUnit = (typeof OVERLAY_UNITS)[number]
export type OverlayColormap = (typeof OVERLAY_COLORMAPS)[number]
export type ContinuousScale = z.infer<typeof ContinuousScaleSchema>
export type LabOverlay = z.infer<typeof LabOverlaySchema>
export type OverlayLayer = z.infer<typeof OverlayLayerSchema>

/** Deserialisiert + validiert ein Overlay-Paket. Wirft laut bei jedem Vertragsbruch. */
export function parseLabOverlay(raw: unknown): LabOverlay {
  return LabOverlaySchema.parse(raw)
}

/** Serialisiert ein validiertes Overlay-Paket zu JSON (Snapshot-Pfad). */
export function serializeLabOverlay(overlay: LabOverlay): string {
  return JSON.stringify(LabOverlaySchema.parse(overlay))
}
