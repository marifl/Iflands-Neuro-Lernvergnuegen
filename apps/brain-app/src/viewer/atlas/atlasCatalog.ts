// Atlas-Katalog: Laufzeit-Typen + validierender Loader fuer atlas-ontology.json.
// Erzeugt von scripts/atlas/build-catalog.mjs. Areal = fsaverage-LUT-Eintrag pro Seite;
// TARO-Carve-Parzellen haengen als refs.carve darunter.

export interface AreaRefs {
  canonical_lut: { layer: string; label_id: number; hemi: 'L' | 'R' }
  carve: string[]
}
export interface AreaProvenance {
  source: string
  affine_det: number | null
  backfill: boolean
}
export interface AreaNode {
  id: string
  label_de: string
  side: 'L' | 'R'
  hosts: string[]
  taro_present: boolean
  lobe: string
  refs: AreaRefs
  context: Record<string, unknown>
  provenance: AreaProvenance
}
export interface GroupNode { id: string; label_de: string; areas: AreaNode[] }
export interface AtlasNode { id: string; axis: 'macro' | 'cyto'; label_de: string; groups: GroupNode[] }
export interface AtlasAxis { id: string; label_de: string; sub_de: string }
export interface AtlasCatalog {
  version: string
  space_note: string
  axes: AtlasAxis[]
  atlases: AtlasNode[]
}

const URL = '/assets/atlas-canonical/atlas-ontology.json'

/** Laedt + validiert den Katalog. Wirft laut bei fehlenden Pflichtfeldern (kein stiller Default). */
export async function loadCatalog(): Promise<AtlasCatalog> {
  const r = await fetch(URL)
  if (!r.ok) throw new Error(`loadCatalog: ${URL} nicht ladbar (HTTP ${r.status})`)
  const c = (await r.json()) as AtlasCatalog
  if (!c.atlases?.length) throw new Error('loadCatalog: catalog.atlases leer')
  for (const a of c.atlases) {
    if (!a.id || !a.groups) throw new Error(`loadCatalog: Atlas unvollstaendig: ${a.id}`)
    for (const g of a.groups) {
      for (const area of g.areas) {
        if (!area.id || !area.lobe || !area.refs?.canonical_lut) {
          throw new Error(`loadCatalog: Areal unvollstaendig: ${JSON.stringify(area).slice(0, 120)}`)
        }
      }
    }
  }
  return c
}
