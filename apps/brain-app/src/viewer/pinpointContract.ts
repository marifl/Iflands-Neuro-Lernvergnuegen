/**
 * PinpointContract (d1QSeLP9T2g7, Slice A).
 *
 * Vertrag fuer punktgenaue, auditierbare Projektion von Labor-Koordinaten/Messwerten
 * auf austauschbare Brain Models. Trennt:
 *   - PinpointInput  (externe Labor-Eingabe -> Zod, fail-loud, unbekannter Raum wird abgelehnt),
 *   - PinpointResult (intern berechnete Projektion -> TS, validiert via assertPinpointDrawable).
 *
 * Wiederverwendung: das Projektionsziel ist ein PickTarget (Vertex/Face/ROI/Subkortex,
 * traegt Distanz + Validierungsstatus), die Umrechnung eine SpaceEdge-Kette aus dem
 * SpaceTransformGraph. Kein stiller Nearest-Neighbor-Fallback: Distanz ueber Limit oder
 * nicht-valider Status wirft, statt trotzdem zu zeichnen.
 *
 * Die eigentliche Projektions-/Mathe-Logik kommt in Slice B (pinpointProjection.ts).
 */
import { z } from 'zod'
import { assertDrawablePickTarget, type PickTarget } from './pickTargetContract'
import type { SpaceEdge } from './spaceTransformGraph'

/** Erkennbare Eingaberaeume. Alles andere wird blockierend abgelehnt. */
export const PINPOINT_INPUT_SPACES = ['mni152', 'fsaverage', 'taro', 'eeg-10-20', 'roi', 'vertex', 'subcortex'] as const

/** Harte Obergrenze fuer eine akzeptable Surface-Projektion. */
export const MAX_PROJECTION_DISTANCE_MM = 10

/** Unsicherheits-/Darstellungsart der Lokalisation. */
const UncertaintySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('point') }),
  z.object({ kind: z.literal('radius'), radiusMm: z.number().positive() }),
  z.object({ kind: z.literal('kernel'), sigmaMm: z.number().positive() }),
  z.object({ kind: z.literal('probability'), field: z.record(z.number()) }),
  z.object({ kind: z.literal('threshold'), thresholdMm: z.number().positive() }),
])

export const PinpointInputSchema = z
  .object({
    inputSpace: z.enum(PINPOINT_INPUT_SPACES),
    targetModelId: z.string().min(1),
    coords: z.tuple([z.number(), z.number(), z.number()]).optional(),
    roiId: z.string().min(1).optional(),
    electrodeId: z.string().min(1).optional(),
    uncertainty: UncertaintySchema,
  })
  .superRefine((input, ctx) => {
    if (!input.coords && !input.roiId && !input.electrodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pinpoint-Input braucht coords, roiId oder electrodeId',
        path: ['coords'],
      })
    }
  })

export type PinpointUncertainty = z.infer<typeof UncertaintySchema>
export type PinpointInput = z.infer<typeof PinpointInputSchema>

/** Deserialisiert + validiert eine externe Labor-Eingabe. Wirft laut bei unbekanntem Raum / fehlender Lokalisation. */
export function parsePinpointInput(raw: unknown): PinpointInput {
  return PinpointInputSchema.parse(raw)
}

/**
 * Intern berechnetes Projektionsergebnis. Traegt Eingabe (inkl. Unsicherheit), Zielobjekt
 * (PickTarget mit brainModelId/Space/Distanz/Validierungsstatus), die verwendete
 * Transformkette und Warnungen. Kein Zod (intern erzeugt, kein Trust-Boundary).
 */
export interface PinpointResult {
  input: PinpointInput
  target: PickTarget
  transformChain: SpaceEdge[]
  warnings: string[]
}

/**
 * Wirft, wenn das Ergebnis nicht gezeichnet werden darf: nicht-valides Ziel oder
 * Projektionsdistanz ueber dem harten Limit. Kein stiller Nearest-Neighbor-Fallback.
 */
export function assertPinpointDrawable(result: PinpointResult): void {
  assertDrawablePickTarget(result.target)
  const t = result.target
  if ((t.kind === 'vertex' || t.kind === 'face') && t.distanceMm > MAX_PROJECTION_DISTANCE_MM) {
    throw new Error(
      `Pinpoint: Projektionsdistanz ${t.distanceMm}mm ueberschreitet Limit ${MAX_PROJECTION_DISTANCE_MM}mm auf Modell "${t.brainModelId}"`,
    )
  }
}
