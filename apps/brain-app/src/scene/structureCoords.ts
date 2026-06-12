// Laedt + typt die gebackene Geometrie-Tabelle (scripts/bake-structure-coords.mjs) und
// liefert deterministische Union-Bounds fuer das Kamera-Framing (CameraRig, B2).
export interface MeshCoord {
  centroid: [number, number, number]
  bbox: { min: [number, number, number]; max: [number, number, number] }
  sphere: number
  extremes: Record<'xmin' | 'xmax' | 'ymin' | 'ymax' | 'zmin' | 'zmax', [number, number, number]>
  surface: [number, number, number][]
}
export type StructureCoords = Record<string, MeshCoord>

let cache: StructureCoords | null = null
export async function loadCoords(): Promise<StructureCoords> {
  if (cache) return cache
  const res = await fetch('/scenes/structure-coords.json')
  if (!res.ok) throw new Error(`structureCoords: nicht ladbar (HTTP ${res.status}) — Bake (A0) ausgefuehrt?`)
  cache = (await res.json()) as StructureCoords
  return cache
}

/** Union-Bounds (Center + Radius) eines Mesh-Sets. Wirft laut bei fehlendem Mesh. */
export function unionBounds(
  coords: StructureCoords,
  meshNames: string[],
): { center: [number, number, number]; radius: number } {
  if (meshNames.length === 0) throw new Error('unionBounds: leeres Mesh-Set')
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const name of meshNames) {
    const m = coords[name]
    if (!m) throw new Error(`unionBounds: Mesh ${name} fehlt in structure-coords.json (Bake aktuell?)`)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], m.bbox.min[a])
      max[a] = Math.max(max[a], m.bbox.max[a])
    }
  }
  const center: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  const radius = Math.hypot(max[0] - center[0], max[1] - center[1], max[2] - center[2])
  return { center, radius }
}
