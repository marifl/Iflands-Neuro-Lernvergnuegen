/**
 * Scene-Region -> TARO-Mesh-Aufloesung.
 *
 * Kanonische Quelle ist `scripts/atlas/config.default.toml`.
 * `scripts/atlas/build-config.mjs` generiert daraus `meshMappings.generated.json`.
 */
import type { MeshMappingNode } from '../viewer/atlas/atlasConfig'
import meshMappings from '../viewer/meshMappings.generated.json'

export const REGION_MAPPINGS = meshMappings.scene_regions as Record<string, MeshMappingNode>

/** Region-Slug -> Mesh-Namen. Generiert aus config.default.toml, nicht von Hand pflegen. */
export const REGION_MESHES: Record<string, string[]> = Object.fromEntries(
  Object.entries(REGION_MAPPINGS).map(([region, mapping]) => [region, mapping.meshes]),
)

export type RegionSlug = keyof typeof REGION_MESHES
