/**
 * Bucket -> TARO-Mesh-Aufloesung fuer figur-spezifische Faerbemodi.
 *
 * Kanonische Quelle ist `scripts/atlas/config.default.toml`.
 * `scripts/atlas/build-config.mjs` generiert daraus `meshMappings.generated.json`.
 */
import type { MeshMappingNode } from './atlas/atlasConfig'
import meshMappings from './meshMappings.generated.json'

export const BUCKET_MAPPINGS = meshMappings.buckets as Record<string, MeshMappingNode>

/** Bucket-Slug -> Mesh-Namen. Generiert aus config.default.toml, nicht von Hand pflegen. */
export const BUCKET_MESHES: Record<string, string[]> = Object.fromEntries(
  Object.entries(BUCKET_MAPPINGS).map(([bucket, mapping]) => [bucket, mapping.meshes]),
)

/**
 * Mesh-Namen fuer einen Bucket. Wirft laut bei unbekanntem Bucket oder bekannter
 * Geometrie-Luecke (leeres Array) mit dem Grund aus der Config.
 */
export function bucketToMeshes(bucket: string): string[] {
  const mapping = BUCKET_MAPPINGS[bucket]
  if (mapping === undefined) {
    throw new Error(
      `bucketToMeshes: unbekannter Bucket "${bucket}" — in config.default.toml [mesh_mappings.buckets] ergaenzen`,
    )
  }
  if (mapping.meshes.length === 0) {
    const reason = mapping.gap_reason ? `: ${mapping.gap_reason}` : ''
    throw new Error(
      `bucketToMeshes: Bucket "${bucket}" hat keine Geometrie im aktuellen TARO-Hirn ` +
        `(bekannte Luecke${reason}) — braucht Subparzellierung oder Atlas-Regeneration, bevor eine Figur ihn nutzen kann`,
    )
  }
  return mapping.meshes
}
