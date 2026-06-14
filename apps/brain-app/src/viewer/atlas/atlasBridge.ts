/** Brücke TARO → fsaverage-Atlas: verbindet die Funktion-Sicht (TARO-Lern-Hirn) mit der
 *  präzisen Struktur-Sicht (fsaverage). Eine gewählte TARO-Region führt zu ihrem Areal im
 *  Atlas (Layer + Label-Name), das dort hervorgehoben + benannt wird.
 *
 *  Bewusst KURATIERT auf die Kapitel-11-relevanten kortikalen PFC/OFC/Cingulum-Regionen
 *  (DKT-Makroanatomie). Kein generisches Slug↔Atlas-Mapping (das gibt es zwischen zwei
 *  verschiedenen Hirnen nicht sauber) — nur die didaktisch genutzten Areale. Subkortex (BG/
 *  Thalamus) liegt im Atlas als separate Mesh-Ebene und ist hier (noch) nicht verlinkt. */
import julichBridgeMap from './julichBridgeMap.json'

export interface AtlasTarget {
  layer: string
  /** Areal-Name im LUT des Layers (DKT-aparc-Name). */
  name: string
}

// Side-gestrippter TARO-Slug -> Atlas-Areal (Layer 'dkt' + aparc-Name).
const BRIDGE: Record<string, AtlasTarget> = {
  'superior-frontal-gyrus': { layer: 'dkt', name: 'superiorfrontal' },
  'middle-frontal-gyrus': { layer: 'dkt', name: 'rostralmiddlefrontal' }, // DLPFC (BA46/9)
  'inferior-frontal-gyrus': { layer: 'dkt', name: 'parstriangularis' }, // VLPFC/Broca-Region
  'cingulate-gyrus': { layer: 'dkt', name: 'rostralanteriorcingulate' },
  'anterior-cingulate': { layer: 'dkt', name: 'rostralanteriorcingulate' },
  'anterior-orbital-gyrus': { layer: 'dkt', name: 'lateralorbitofrontal' },
  'lateral-orbital-gyrus': { layer: 'dkt', name: 'lateralorbitofrontal' },
  'posterior-orbital-gyrus': { layer: 'dkt', name: 'lateralorbitofrontal' },
  'medial-orbital-gyrus': { layer: 'dkt', name: 'medialorbitofrontal' },
  // Carve-Sub-Patches, deren Slug bereits dem aparc-Namen entspricht (Identitaet):
  'parsopercularis': { layer: 'dkt', name: 'parsopercularis' },
  'parstriangularis': { layer: 'dkt', name: 'parstriangularis' },
  'parsorbitalis': { layer: 'dkt', name: 'parsorbitalis' },
  'rostral-anterior-cingulate': { layer: 'dkt', name: 'rostralanteriorcingulate' },
  'caudal-anterior-cingulate': { layer: 'dkt', name: 'caudalanteriorcingulate' },
  'lateral-orbitofrontal': { layer: 'dkt', name: 'lateralorbitofrontal' },
  'medial-orbitofrontal': { layer: 'dkt', name: 'medialorbitofrontal' },
}

/** Atlas-Ziel fuer einen TARO-Slug, oder null wenn die Region (noch) nicht verlinkt ist.
 *  Strippt den Lateralitaets-Praefix (left-/right-) und eine optionale -v2-Variante. */
export function bridgeFor(slug: string | null): AtlasTarget | null {
  if (!slug) return null
  const base = slug.replace(/^(left|right)-/, '').replace(/-v2$/, '')
  return BRIDGE[base] ?? null
}

// Julich-Carve-Slug (z.B. `julich3-area-44-ifg-l`) -> exakter fsaverage-Julich-LUT-Name
// (`Area 44 (IFG)`). Generiert aus den Carve-Slugs + dem v3.1-Manifest-LUT (Match per Areal-Code),
// siehe julichBridgeMap.json. GapMaps/Slugs ohne Areal-Code haben keinen Eintrag (kein praezises Areal).
const JULICH_MAP = julichBridgeMap as Record<string, string>

/** Atlas-Ziel (Layer 'julich') fuer ein angeklicktes Julich-Carve-Areal, oder null wenn der Slug
 *  kein zuordenbares fsaverage-Areal hat (z.B. GapMap). Strippt nur das Lateralitaets-Suffix -l/-r. */
export function julichBridgeFor(slug: string | null): AtlasTarget | null {
  if (!slug) return null
  const base = slug.replace(/-(l|r)$/, '')
  const name = JULICH_MAP[base]
  return name ? { layer: 'julich', name } : null
}
