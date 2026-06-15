import { REGION_MAPPINGS } from './regions'
import type { ConfigRegions } from '../viewer/atlas/atlasConfig'
import { bucketToMeshes } from '../viewer/bucketMeshes'

/** Uebersetzt semantische Region-Slugs in das vereinigte, deduplizierte Mesh-Namen-Set
 *  fuer viewerStore.setHighlight(). Wirft laut bei unbekanntem Slug (kein stiller Fallback). */
export function regionsToMeshes(regions: string[]): string[] {
  const out = new Set<string>()
  for (const r of regions) {
    const mapping = REGION_MAPPINGS[r]
    if (!mapping) throw new Error(`brainBridge: unbekannte Region: ${r} (in config.default.toml mesh_mappings.scene_regions ergaenzen)`)
    if (mapping.meshes.length === 0) {
      const reason = mapping.gap_reason ? `: ${mapping.gap_reason}` : ''
      throw new Error(`brainBridge: Region "${r}" hat keine Geometrie${reason}`)
    }
    const meshes = mapping.meshes
    for (const m of meshes) out.add(m)
  }
  return [...out]
}

/** Uebersetzt Config-Regionen in direkt rendervolle TARO-Meshes. `areas` steuern Atlas-Scopes
 *  und werden ueber `view.carve_on_taro` sichtbar, nicht als TARO-Mesh-Namen geraten. */
export function configRegionsToMeshes(regions: ConfigRegions | undefined): string[] {
  const out = new Set<string>()
  for (const mesh of regions?.meshes ?? []) out.add(mesh)
  for (const bucket of regions?.buckets ?? []) {
    for (const mesh of bucketToMeshes(bucket)) out.add(mesh)
  }
  for (const region of regions?.scene_regions ?? []) {
    for (const mesh of regionsToMeshes([region])) out.add(mesh)
  }
  return [...out]
}
