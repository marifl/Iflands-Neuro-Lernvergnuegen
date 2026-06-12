/** Semantische Region-Slugs -> GLB-Mesh-Namen. Empirisch verifiziert in A1 gegen
 *  public/scenes/structure-coords.json (Centroid-Plausibilisierung, Viewer-Raum:
 *  +X=links, +Y=superior, +Z=anterior). Vorbild: animations.ts (BG-Helper).
 *
 *  Datenbefund (A1, 2026-06-12): Das Hirn-GLB enthaelt KEIN eigenes
 *  `anterior-cingulate-gyrus`- und KEIN `supplementary-motor`/`paracentral-lobule`-Mesh.
 *  - Cingulum: nur `cingulate-gyrus` (paarig, Centroid nahe Mittellinie X~7, Z~0).
 *  - SMA/pre-SMA (medialer BA6): liegt im `superior-frontal-gyrus` (anterior/superior/medial).
 *  Daher wird das ACC-Cingulum auf das gesamte `cingulate-gyrus` abgebildet und das
 *  SMA-Areal auf den medialen Anteil des `superior-frontal-gyrus` (im Companion-Text so benannt). */
const BG = (...names: string[]): string[] => names.flatMap((n) => [`left-${n}`, `right-${n}`])

export const REGION_MESHES: Record<string, string[]> = {
  // ACC/Cingulum (Konfliktmonitoring, P3a). Kein anterior-cingulate-Mesh -> volles Cingulum.
  'acc-cingulum': BG('cingulate-gyrus'),
  // Parietal (+ frontaler Anteil) als Quelle der P3b-Engagement-Komponente.
  'parietal-frontal': BG('superior-parietal-lobule', 'supramarginal-gyrus', 'superior-frontal-gyrus'),
  // SMA/pre-SMA = medialer BA6 (Sub-Patches aus MNI-Atlas registriert, k11-subparcels.glb).
  'sma-presma': BG('sma', 'pre-sma'),
  // Inhibitions-Netzwerk (Intro/Zusammenfassung): mediofrontal + Cingulum.
  'inhibition-network': BG('superior-frontal-gyrus', 'cingulate-gyrus'),
  // Praezise Sub-Patches (MNI-Atlas-Registrierung, echte TARO-Geometrie, scripts/atlas/).
  'acc-anterior': BG('anterior-cingulate'),
  'sma': BG('sma'),
  'pre-sma': BG('pre-sma'),
}

export type RegionSlug = keyof typeof REGION_MESHES
