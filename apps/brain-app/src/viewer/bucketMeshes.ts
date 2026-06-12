/**
 * Bucket -> TARO-Mesh-Aufloesung fuer die figur-spezifischen Faerbemodi.
 *
 * Ein "Bucket" ist eine didaktische Praesentations-Region (dlpfc, vlpfc, ...) aus
 * `companion/config/color-presets.json` bzw. `vortrag-mesh-map.json`. Hier wird jeder
 * Bucket auf die realen Mesh-Namen im Haupt-Hirn (`brain.glb`, Gyrus-/Kern-Ebene)
 * abgebildet. Sub-gyrale Verfeinerung (IFG -> pars opercularis/triangularis/orbitalis
 * etc.) kommt in Wave 1-B ueber die erweiterten Sub-Patches; bis dahin faerbt ein
 * Bucket den ganzen Host-Gyrus.
 *
 * KEINE stillen Fallbacks: ein Bucket ohne Geometrie ist als leeres Array markiert
 * (bekannte Luecke) und `bucketToMeshes` wirft laut mit Kontext, sobald ein aktives
 * Preset ihn referenziert. So bricht eine Figur sichtbar statt still eine Gruppe zu
 * verschlucken.
 */

const L = (name: string): string[] => [`left-${name}`, `right-${name}`]

/** Bucket-Slug -> Mesh-Namen im Haupt-Hirn (brain.glb). Verifiziert gegen structures.json. */
export const BUCKET_MESHES: Record<string, string[]> = {
  // Dorsolateraler PFC = mittlere + obere Stirnwindung (BA 9/46).
  dlpfc: [...L('middle-frontal-gyrus'), ...L('superior-frontal-gyrus')],
  // Ventrolateraler PFC = untere Stirnwindung (BA 44/45/47). W1-B: sub-gyral als pars
  // opercularis/triangularis/orbitalis (DKT-Sub-Patches in k11-subparcels.glb).
  vlpfc: [...L('parsopercularis'), ...L('parstriangularis'), ...L('parsorbitalis')],
  // Orbitofrontaler Cortex. W1-B: lateral/medial als DKT-Sub-Patches; anterior/posterior
  // (ohne DKT-Pendant) bleiben die TARO-Gyri.
  ofc: [
    ...L('lateral-orbitofrontal'),
    ...L('medial-orbitofrontal'),
    ...L('anterior-orbital-gyrus'),
    ...L('posterior-orbital-gyrus'),
  ],
  // Ventromedialer PFC = medialer Orbital-Gyrus + subkallosales Areal.
  vmpfc: [...L('medial-orbital-gyrus'), ...L('subcallosal-area')],
  // Dorsales Striatum (Eingang der BG-Schleife).
  'striatum-dorsal': [...L('caudate-nucleus'), ...L('putamen')],
  // Pallidum (Ausgang der BG-Schleife).
  'globus-pallidus': L('globus-pallidus'),
  // Thalamische Relais-Kerne der BG-Schleife (VA/VL).
  thalamus: [
    ...L('ventral-anterior-nucleus'),
    'caudal-part-of-left-ventral-lateral-nucleus',
    'caudal-part-of-right-ventral-lateral-nucleus',
  ],
  amygdala: L('amygdala'),
  hippocampus: L('hippocampus-proper'),
  // Dorsales (kaudales) anteriores Cingulum. W1-B: sub-gyral als caudal anterior cingulate
  // (DKT-Sub-Patch) — der rostrale/ventrale Teil bleibt korrekt aussen vor (vgl. Bush 11-13).
  dacc: L('caudal-anterior-cingulate'),
  // Posteriorer parietaler Cortex.
  ppc: [...L('superior-parietal-lobule'), ...L('supramarginal-gyrus'), ...L('angular-gyrus')],
  'pcc-praecuneus': L('precuneus'),
  insula: L('insula'),
  'substantia-nigra': L('substantia-nigra'),
  // SMA/pre-SMA leben im separaten Sub-Patch-GLB (Highlight-Layer), nicht in brain.glb.
  'sma-presma': ['left-sma', 'right-sma', 'left-pre-sma', 'right-pre-sma'],

  // Nucleus accumbens (ventrales Striatum). W1-B: DKT-Sub-Patch (Subkortex-Affine auf den
  // ventro-anterioren Caudatus registriert, k11-subparcels.glb) — schaltet Abb. 11-04 frei.
  'nucleus-accumbens': L('nucleus-accumbens'),

  // Frontopolarer Cortex (BA 10) = Frontalpol. W2: geometrischer Pol-Sub-Patch (vorderste
  // SFG+MFG-Spitze, 22mm Tiefe) — kein Atlas-Mesh, definitionsgemaess der Pol. k11-subparcels.glb.
  frontopolar: L('frontopolar'),

  // --- Bekannte Geometrie-Luecken (laut, nicht still): keine TARO-Meshes vorhanden ---
  // Inferior frontal junction (Aufgabenset-Wechsel) ist kein eigenes Mesh.
  ifj: [],
}

/**
 * Mesh-Namen fuer einen Bucket. Wirft laut bei unbekanntem Bucket oder bekannter
 * Geometrie-Luecke (leeres Array) — mit Kontext, welcher Bucket und warum.
 */
export function bucketToMeshes(bucket: string): string[] {
  const meshes = BUCKET_MESHES[bucket]
  if (meshes === undefined) {
    throw new Error(
      `bucketToMeshes: unbekannter Bucket "${bucket}" — in BUCKET_MESHES ergaenzen oder Preset/vortrag-mesh-map pruefen`,
    )
  }
  if (meshes.length === 0) {
    throw new Error(
      `bucketToMeshes: Bucket "${bucket}" hat keine Geometrie im aktuellen TARO-Hirn ` +
        `(bekannte Luecke) — braucht Wave-B-Subparzellierung oder Atlas-Regeneration, bevor eine Figur ihn nutzen kann`,
    )
  }
  return meshes
}
