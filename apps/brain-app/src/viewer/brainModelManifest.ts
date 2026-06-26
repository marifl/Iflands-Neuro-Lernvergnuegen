/**
 * BrainModelManifest (9xGQeXYPZqS1, Description-Punkt 1).
 *
 * Vollstaendiger Metadaten-Vertrag fuer ein registriertes Brain Model: beschreibt
 * Koordinatenraum, Einheiten, Orientierung, Hemisphaeren-Konvention, Lizenz/Provenienz
 * und die zugehoerigen Surface-/Volume-/LUT-Dateien. Wird aus externem Asset-JSON
 * geladen -> Zod-Validierung wie overlayContract (Trust-Boundary, fail-loud).
 *
 * Abgrenzung zu brainModelOptions.ts: dort liegt die schlanke Runtime-Auswahl
 * (URL-Param -> id/label/url/space). Hier liegt der volle Asset-Vertrag eines Modells.
 */
import { z } from 'zod'
import { BRAIN_SPACES } from './overlayContract'

export const BRAIN_MODEL_MANIFEST_VERSION = 1

/** Rollen, die eine Modell-Datei erfuellen kann. */
export const MODEL_FILE_ROLES = ['cortex-surface', 'subcortex-mesh', 'label-volume', 'lut', 'curvature'] as const

const ModelFileSchema = z.object({
  role: z.enum(MODEL_FILE_ROLES),
  path: z.string().min(1),
})

export const BrainModelManifestSchema = z.object({
  schemaVersion: z.literal(BRAIN_MODEL_MANIFEST_VERSION),
  id: z.string().min(1),
  label: z.string().min(1),
  modelVersion: z.string().min(1),
  license: z.string().min(1),
  space: z.enum(BRAIN_SPACES),
  units: z.enum(['mm', 'cm', 'm']),
  orientation: z.enum(['RAS', 'LAS', 'LPS']),
  hemispheres: z.array(z.enum(['L', 'R'])).min(1),
  files: z.array(ModelFileSchema).min(1),
})

export type ModelFileRole = (typeof MODEL_FILE_ROLES)[number]
export type BrainModelManifest = z.infer<typeof BrainModelManifestSchema>

/** Deserialisiert + validiert ein Brain-Model-Manifest. Wirft laut bei jedem Vertragsbruch. */
export function parseBrainModelManifest(raw: unknown): BrainModelManifest {
  return BrainModelManifestSchema.parse(raw)
}
