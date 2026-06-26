/**
 * ActivationMappingContract (GDXRWz0ZsFoT, Slice A).
 *
 * Offener Datenvertrag fuer qEEG/sLORETA/Z-Score-Aktivierungsfelder — visualisiert
 * Laborergebnisse aehnlich oeffentlich beschriebener Methodik (z.B. BrainAvatar) OHNE
 * proprietaere Software/Normdatenbanken zu kopieren. Unterscheidet die Pipeline-Stufen
 * eindeutig und erzwingt fail-loud, dass jede Ausgabe ihre Metadaten traegt.
 *
 * Zod wie overlayContract (Trust-Boundary fuer importierte Labordaten). MNI ist der
 * Default-Space fuer Source-Grid/Z-Score; TARO bleibt ueber den SpaceTransformGraph
 * Zielmodell. Eine z-score-Stufe ohne deklarierte Normreferenz wird abgelehnt — es wird
 * nie eine proprietaere Normdatenbank angenommen.
 */
import { z } from 'zod'
import { BRAIN_SPACES } from './overlayContract'

export const ACTIVATION_PIPELINE_VERSION = 1

/** Frequenzbaender (laborspezifische Bandgrenzen bleiben in der Quelle dokumentiert). */
export const EEG_BANDS = ['delta', 'theta', 'alpha', 'beta', 'gamma', 'broadband'] as const

/** Pipeline-Stufen vom Roh-Signal bis zur Visualisierung. */
export const ACTIVATION_STAGES = [
  'raw-eeg',
  'bandpower',
  'connectivity',
  'source-grid',
  'roi-value',
  'z-score',
  'visualization',
] as const

const TimeWindowSchema = z
  .object({ startMs: z.number(), endMs: z.number() })
  .superRefine((w, ctx) => {
    if (w.endMs <= w.startMs) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'endMs muss groesser als startMs sein', path: ['endMs'] })
    }
  })

/** Solver-/Inversmodell-Metadaten (sLORETA/eLORETA/min-norm ...). Offene Zusatzfelder erlaubt. */
const SolverMetadataSchema = z
  .object({
    method: z.string().min(1),
    version: z.string().min(1),
  })
  .catchall(z.unknown())

/** Pflicht-Metadaten jeder Stufen-Ausgabe. Fehlen -> parse wirft -> nicht renderbar. */
const MetadataSchema = z.object({
  pipelineVersion: z.literal(ACTIVATION_PIPELINE_VERSION),
  brainModelId: z.string().min(1),
  space: z.enum(BRAIN_SPACES).default('mni152'),
  montage: z.string().min(1),
  band: z.enum(EEG_BANDS),
  timeWindow: TimeWindowSchema,
  normReference: z.string().min(1).optional(),
  uncertainty: z.number().nonnegative().optional(),
  solver: SolverMetadataSchema.optional(),
})

const RawEegStage = MetadataSchema.extend({
  kind: z.literal('raw-eeg'),
  channels: z.array(z.string().min(1)).min(1),
  sampleRateHz: z.number().positive(),
})
const BandpowerStage = MetadataSchema.extend({
  kind: z.literal('bandpower'),
  values: z.record(z.number()),
})
const ConnectivityStage = MetadataSchema.extend({
  kind: z.literal('connectivity'),
  nodes: z.array(z.string().min(1)).min(2),
  matrix: z.array(z.array(z.number())).min(1),
})
const SourceGridStage = MetadataSchema.extend({
  kind: z.literal('source-grid'),
  gridId: z.string().min(1),
  values: z.array(z.number()).min(1),
})
const RoiValueStage = MetadataSchema.extend({
  kind: z.literal('roi-value'),
  atlasId: z.string().min(1),
  values: z.record(z.number()),
})
const ZScoreStage = MetadataSchema.extend({
  kind: z.literal('z-score'),
  atlasId: z.string().min(1),
  zScores: z.record(z.number()),
})
const VisualizationStage = MetadataSchema.extend({
  kind: z.literal('visualization'),
  overlayId: z.string().min(1),
})

export const ActivationResultSchema = z.discriminatedUnion('kind', [
  RawEegStage,
  BandpowerStage,
  ConnectivityStage,
  SourceGridStage,
  RoiValueStage,
  ZScoreStage,
  VisualizationStage,
])

export type EegBand = (typeof EEG_BANDS)[number]
export type ActivationStage = (typeof ACTIVATION_STAGES)[number]
export type ActivationResult = z.infer<typeof ActivationResultSchema>

/**
 * Deserialisiert + validiert eine Aktivierungsstufe. Wirft laut bei fehlenden Metadaten,
 * unbekanntem Band/Space/Stufe und bei z-score ohne deklarierte Normreferenz
 * (keine proprietaere Normdatenbank-Annahme).
 */
export function parseActivationResult(raw: unknown): ActivationResult {
  const result = ActivationResultSchema.parse(raw)
  if (result.kind === 'z-score' && !result.normReference) {
    throw new Error('z-score-Stufe braucht eine deklarierte normReference (keine proprietaere Normdatenbank-Annahme)')
  }
  return result
}
