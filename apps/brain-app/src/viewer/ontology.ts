export type Lang = 'de' | 'la' | 'en'
export type Side = 'left' | 'right' | 'midline'

export interface OntologyNode {
  id: string
  labels: Record<Lang, string>
  children?: OntologyNode[]
  // Nur Struktur-Blaetter (kein Gruppen-Knoten):
  fma?: string
  slug?: string
  side?: Side
  k11Role?: string
  // Linkes Gegenstueck durch Spiegelung des rechten Mesh erzeugt (synthetisch).
  mirrored?: boolean
  // Schwache/fehlende Seite einer Mittellinienstruktur per Reflexion ergaenzt (synthetisch).
  reconstructed?: boolean
  // Hinweis zur Lateralitaet: Herkunft (gespiegelt) oder Asymmetrie-Warnung.
  lateralityNote?: string
}

export interface Ontology {
  version: string
  space: string
  structureCount: number
  tree: OntologyNode
}

export function isStructure(node: OntologyNode): boolean {
  return typeof node.fma === 'string'
}

interface ContextManifestEntry {
  fma: string
  name: string
  side: Side
  region: string
  labels: Record<Lang, string>
}

const CONTEXT_REGION_LABELS: Record<string, Record<Lang, string>> = {
  skull: { de: 'Schaedel', la: 'Cranium', en: 'Skull' },
  bone: { de: 'Knochen', la: 'Ossa', en: 'Bones' },
  teeth: { de: 'Zaehne/Gingiva', la: 'Dentes', en: 'Teeth/Gingiva' },
  cartilage: { de: 'Knorpel', la: 'Cartilagines', en: 'Cartilage' },
  vertebra: { de: 'Halswirbelsaeule', la: 'Vertebrae cervicales', en: 'Cervical spine' },
  muscle: { de: 'Muskeln', la: 'Musculi', en: 'Muscles' },
  ligament: { de: 'Baender/Sehnen', la: 'Ligamenta', en: 'Ligaments' },
  nerve: { de: 'Nerven/Ganglien', la: 'Nervi', en: 'Nerves' },
  artery: { de: 'Arterien', la: 'Arteriae', en: 'Arteries' },
  vein: { de: 'Venen/Sinus', la: 'Venae', en: 'Veins/Sinuses' },
  gland: { de: 'Druesen', la: 'Glandulae', en: 'Glands' },
  eye: { de: 'Auge', la: 'Oculus', en: 'Eye' },
  ear: { de: 'Ohr', la: 'Auris', en: 'Ear' },
  airway: { de: 'Mund/Rachen/Nase', la: 'Via aerea', en: 'Airway' },
}

/**
 * Kontext-Teilbaum (Vollausbau) aus den Manifesten bauen: root "Kontext" -> Regionen ->
 * Struktur-Blaetter. Schaedel-Knochen werden zur Region "skull" zusammengezogen.
 * Liefert den Baum + die Liste aller Kontext-Slugs (fuer den Default-Hidden-Status).
 */
export function buildContextTree(
  head: { structures: Record<string, ContextManifestEntry> },
  skull: { bones: Record<string, ContextManifestEntry> },
): { tree: OntologyNode; slugs: string[] } {
  const byRegion = new Map<string, OntologyNode[]>()
  const slugs: string[] = []
  const add = (slug: string, e: ContextManifestEntry, region: string): void => {
    slugs.push(slug)
    const leaf: OntologyNode = { id: slug, slug, fma: e.fma, side: e.side, labels: e.labels }
    const arr = byRegion.get(region)
    if (arr) arr.push(leaf)
    else byRegion.set(region, [leaf])
  }
  for (const [slug, e] of Object.entries(skull.bones)) add(slug, e, 'skull')
  for (const [slug, e] of Object.entries(head.structures)) add(slug, e, e.region)

  const regionNode = (r: string): OntologyNode => ({
    id: `ctx-${r}`,
    labels: CONTEXT_REGION_LABELS[r] ?? { de: r, la: r, en: r },
    children: (byRegion.get(r) ?? []).sort((a, b) => a.labels.en.localeCompare(b.labels.en)),
  })

  // Zweistufige Hierarchie: Kontext -> Ober-Gruppe (Organsystem) -> Region -> Struktur,
  // analog zum Hirn-Baum. Reihenfolge der Regionen innerhalb einer Ober-Gruppe ist hier fix.
  const SUPER: { id: string; labels: Record<Lang, string>; regions: string[] }[] = [
    { id: 'ctx-skeleton', labels: { de: 'Skelett & Zaehne', la: 'Systema skeletale', en: 'Skeleton & teeth' },
      regions: ['skull', 'bone', 'cartilage', 'vertebra', 'teeth'] },
    { id: 'ctx-muscles', labels: { de: 'Muskulatur & Baender', la: 'Systema musculare', en: 'Muscles & ligaments' },
      regions: ['muscle', 'ligament'] },
    { id: 'ctx-vessels', labels: { de: 'Gefaesssystem', la: 'Systema vasculare', en: 'Vasculature' },
      regions: ['artery', 'vein'] },
    { id: 'ctx-nerves', labels: { de: 'Periphere Nerven', la: 'Nervi craniales', en: 'Peripheral nerves' },
      regions: ['nerve'] },
    { id: 'ctx-senses', labels: { de: 'Sinnesorgane', la: 'Organa sensuum', en: 'Sense organs' },
      regions: ['eye', 'ear'] },
    { id: 'ctx-viscera', labels: { de: 'Druesen & Atemweg', la: 'Glandulae et via aerea', en: 'Glands & airway' },
      regions: ['gland', 'airway'] },
  ]
  const assigned = new Set(SUPER.flatMap((s) => s.regions))
  const children: OntologyNode[] = SUPER
    .map((s) => ({ id: s.id, labels: s.labels, children: s.regions.filter((r) => byRegion.has(r)).map(regionNode) }))
    .filter((s) => s.children.length > 0)
  // Sicherheitsnetz: jede Region ohne Ober-Gruppe direkt einhaengen (kein stiller Verlust).
  for (const r of byRegion.keys()) if (!assigned.has(r)) children.push(regionNode(r))

  return {
    tree: {
      id: 'context',
      labels: { de: 'Kontext (Vollausbau)', la: 'Contextus', en: 'Context (full build-out)' },
      children,
    },
    slugs,
  }
}

/** slug -> Liste der Gruppen-IDs vom Wurzel-Pfad (fuer Auto-Expand). */
export function ancestorMap(tree: OntologyNode): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const walk = (node: OntologyNode, path: string[]): void => {
    if (isStructure(node)) {
      map.set(node.id, path)
      return
    }
    const next = [...path, node.id]
    for (const child of node.children ?? []) walk(child, next)
  }
  walk(tree, [])
  return map
}

/**
 * Pfad Wurzel -> Zielknoten (inklusive) ueber mehrere Baeume (Hirn + Kontext). Fuer den
 * Isolationsmodus: liefert die Breadcrumb-Kette und (ueber das letzte Element) den Teilbaum.
 */
export function nodeChain(roots: (OntologyNode | null | undefined)[], id: string): OntologyNode[] | null {
  const dfs = (node: OntologyNode, path: OntologyNode[]): OntologyNode[] | null => {
    const next = [...path, node]
    if (node.id === id) return next
    for (const child of node.children ?? []) {
      const found = dfs(child, next)
      if (found) return found
    }
    return null
  }
  for (const root of roots) {
    if (!root) continue
    const found = dfs(root, [])
    if (found) return found
  }
  return null
}

/** Alle Struktur-Blaetter flach (fuer Suche). */
export function flattenStructures(tree: OntologyNode): OntologyNode[] {
  const out: OntologyNode[] = []
  const walk = (node: OntologyNode): void => {
    if (isStructure(node)) {
      out.push(node)
      return
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(tree)
  return out
}

/**
 * Baum auf Kapitel-11-relevante Strukturen reduzieren: behalte Struktur-Blaetter mit
 * k11Role und alle Gruppen, die solche enthalten. Leere Gruppen fallen weg.
 */
export function filterK11(node: OntologyNode): OntologyNode | null {
  if (isStructure(node)) return node.k11Role ? node : null
  const kept = (node.children ?? [])
    .map(filterK11)
    .filter((child): child is OntologyNode => child !== null)
  return kept.length ? { ...node, children: kept } : null
}
