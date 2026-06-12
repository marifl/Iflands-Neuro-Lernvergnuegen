import { REGION_MESHES } from './regions'

/** Uebersetzt semantische Region-Slugs in das vereinigte, deduplizierte Mesh-Namen-Set
 *  fuer viewerStore.setHighlight(). Wirft laut bei unbekanntem Slug (kein stiller Fallback). */
export function regionsToMeshes(regions: string[]): string[] {
  const out = new Set<string>()
  for (const r of regions) {
    const meshes = REGION_MESHES[r]
    if (!meshes) throw new Error(`brainBridge: unbekannte Region: ${r} (in regions.ts ergaenzen)`)
    for (const m of meshes) out.add(m)
  }
  return [...out]
}
