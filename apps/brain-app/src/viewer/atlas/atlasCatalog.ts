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
export interface AreaContext {
  clinic?: string
  function?: string
  chapter?: string
  aliases?: string[]
}
export interface AreaNode {
  id: string
  label_de: string
  side: 'L' | 'R'
  hosts: string[]
  taro_present: boolean
  lobe: string
  refs: AreaRefs
  context: AreaContext
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

function runtimeCarveSlugs(atlasId: string, slug: string): string[] {
  const slugs = new Set([slug])
  if (atlasId === 'julich' && slug.startsWith('julich3-')) {
    slugs.add(slug.replace(/^julich3-/, 'julich-'))
  }
  if (atlasId === 'dkt' && !slug.startsWith('dkt-')) slugs.add(`dkt-${slug}`)
  if (atlasId === 'brodmann' && !slug.startsWith('brodmann-')) slugs.add(`brodmann-${slug}`)
  if (atlasId === 'destrieux' && !slug.startsWith('destrieux-')) slugs.add(`destrieux-${slug}`)
  return [...slugs]
}

export function buildAliasMapByCarveSlug(catalog: AtlasCatalog, atlasId: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const atlas = catalog.atlases.find((entry) => entry.id === atlasId)
  if (!atlas) return map
  for (const group of atlas.groups) {
    for (const area of group.areas) {
      const aliases = area.context.aliases ?? []
      if (!aliases.length) continue
      for (const slug of area.refs.carve) {
        for (const runtimeSlug of runtimeCarveSlugs(atlasId, slug)) {
          const merged = new Set([...(map.get(runtimeSlug) ?? []), ...aliases])
          map.set(runtimeSlug, [...merged])
        }
      }
    }
  }
  return map
}

export function buildAreaIdMapByCarveSlug(catalog: AtlasCatalog, atlasId: string): Map<string, string> {
  const map = new Map<string, string>()
  const atlas = catalog.atlases.find((entry) => entry.id === atlasId)
  if (!atlas) return map
  for (const group of atlas.groups) {
    for (const area of group.areas) {
      for (const slug of area.refs.carve) {
        for (const runtimeSlug of runtimeCarveSlugs(atlasId, slug)) {
          const existing = map.get(runtimeSlug)
          if (existing && existing !== area.id) {
            throw new Error(`buildAreaIdMapByCarveSlug: "${runtimeSlug}" mappt auf ${existing} und ${area.id}`)
          }
          map.set(runtimeSlug, area.id)
        }
      }
    }
  }
  return map
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
        if (area.context?.aliases && !area.context.aliases.every((alias) => typeof alias === 'string' && alias.trim())) {
          throw new Error(`loadCatalog: Areal-Aliase ungueltig: ${area.id}`)
        }
      }
    }
  }
  return c
}
