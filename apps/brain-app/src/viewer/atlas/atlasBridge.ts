/** Brücke TARO → fsaverage-Atlas: verbindet die Funktion-Sicht (TARO-Lern-Hirn) mit der
 *  präzisen Struktur-Sicht (fsaverage). Eine gewählte TARO-Region führt zu ihrem Areal im
 *  Atlas (Layer + Label-Name), das dort hervorgehoben + benannt wird.
 *
 *  Bewusst KURATIERT auf die Kapitel-11-relevanten kortikalen PFC/OFC/Cingulum-Regionen
 *  (DKT-Makroanatomie). Kein generisches Slug↔Atlas-Mapping (das gibt es zwischen zwei
 *  verschiedenen Hirnen nicht sauber) — nur die didaktisch genutzten Areale. Subkortex (BG/
 *  Thalamus) liegt im Atlas als separate Mesh-Ebene und ist hier (noch) nicht verlinkt. */
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
