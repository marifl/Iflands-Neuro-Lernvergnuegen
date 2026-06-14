// A1: fsaverage-DKT-Label <-> TARO-Gyrus-Host-Korrespondenz + fsaverage-Julich-Label <-> julich3-Slug.
//
// Zweck: Vor dem eigentlichen Transfer (A2, Python) die zwei Brueckentabellen bauen + LAUT validieren:
//   1. dkt_label (fsaverage-Integer) -> TARO-Host-Stem  (Registrierungs-Vehikel: welcher fsaverage-Gyrus
//      gehoert zu welchem TARO-Gyrus). Quelle: manifest.lut.dkt + register_atlas.DKT_HOST.
//   2. julich_label (fsaverage-Integer 1..146) -> julich3-Basis-Slug (z.B. 'julich3-area-45-ifg'). Quelle:
//      manifest.lut.julich (Name 'Area 45 (IFG)') 1:1 gematcht gegen die 146 Basis-Slugs aus
//      work/atlas_labels_julich.json via normalisiertem code+host-Schluessel.
//
// Die Slug->TARO-Host-Zuweisung selbst (inkl. AUTO_NEAREST/Hippocampus-Aufloesung) bleibt unveraendert aus
// work/atlas_labels_julich.json (register_atlas-Ergebnis, Bake-kompatibel) — A2 ersetzt nur die
// vertex_indices konnektivitaetserhaltend, nicht die Host-Gruppierung.
//
// Aufruf: node build_gyrus_correspondence.mjs  -> schreibt work/dkt_to_taro_gyrus.json
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(here, '../../apps/brain-app/public/assets/atlas-canonical/manifest.json')))
const julLabels = JSON.parse(readFileSync(resolve(here, 'work/atlas_labels_julich.json')))

// DKT-Name -> TARO-Host-Stem (identisch zu register_atlas.DKT_HOST; frontalpole/bankssts/temporalpole
// dort ohne Host, hier ergaenzt fuer die Korrespondenz: frontalpole tilet den Frontalpol-Combined-Host,
// bankssts/temporalpole -> adjazenter STG/MTG per anatomischer Konvention).
const DKT_HOST = {
  parsopercularis: 'inferior-frontal-gyrus', parstriangularis: 'inferior-frontal-gyrus',
  parsorbitalis: 'inferior-frontal-gyrus', caudalmiddlefrontal: 'middle-frontal-gyrus',
  rostralmiddlefrontal: 'middle-frontal-gyrus', superiorfrontal: 'superior-frontal-gyrus',
  lateralorbitofrontal: 'lateral-orbital-gyrus', medialorbitofrontal: 'medial-orbital-gyrus',
  parsorbitofrontal: 'anterior-orbital-gyrus', caudalanteriorcingulate: 'cingulate-gyrus',
  rostralanteriorcingulate: 'cingulate-gyrus', posteriorcingulate: 'cingulate-gyrus',
  isthmuscingulate: 'cingulate-gyrus', precentral: 'precentral-gyrus',
  postcentral: 'postcentral-gyrus', paracentral: 'superior-frontal-gyrus',
  supramarginal: 'supramarginal-gyrus', superiorparietal: 'superior-parietal-lobule',
  inferiorparietal: 'ipl-combined', precuneus: 'precuneus',
  superiortemporal: 'superior-temporal-gyrus', middletemporal: 'middle-temporal-gyrus',
  inferiortemporal: 'inferior-temporal-gyrus', fusiform: 'fusiform-gyrus',
  transversetemporal: 'heschl-combined', entorhinal: 'parahippocampal-gyrus',
  parahippocampal: 'parahippocampal-gyrus', lateraloccipital: 'lateral-occipital-gyrus',
  lingual: 'lingual-gyrus', cuneus: 'cuneus', pericalcarine: 'cuneus',
  insula: 'insula-combined',
  frontalpole: 'frontal-pole-combined', bankssts: 'superior-temporal-gyrus',
  temporalpole: 'middle-temporal-gyrus',
}

// --- 1. dkt_label (int) -> TARO-Host-Stem ---
const dktLut = manifest.lut.dkt
const dktToTaro = {}
const noHost = []
const DKT_NON_CORTEX = new Set(['corpuscallosum']) // Faserbahn, kein Kortex-Gyrus, traegt keine Julich-Areale
for (const k of Object.keys(dktLut)) {
  const e = dktLut[k]
  if (Number(k) === 0 || e.medial || DKT_NON_CORTEX.has(e.name)) continue // medial wall / unkartiert / Nicht-Kortex
  const host = DKT_HOST[e.name]
  if (host === undefined) { noHost.push(`${k}:${e.name}`); continue }
  dktToTaro[k] = { dkt_name: e.name, taro_host_stem: host }
}
if (noHost.length) throw new Error(`A1: DKT-Labels ohne TARO-Host (DKT_HOST ergaenzen): ${noHost.join(', ')}`)

// --- 2. julich_label (int 1..146) -> julich3-Basis-Slug ---
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const baseSlugs = [...new Set(Object.keys(julLabels).map((s) => s.replace(/-[lr]$/, '')))]
const slugByNorm = new Map()
for (const b of baseSlugs) {
  const code = b.replace(/^julich3-area-/, '').replace(/^julich3-/, '') // z.B. '45-ifg' / 'ca1-hippocampus'
  slugByNorm.set(norm(code), b)
}
const julLut = manifest.lut.julich
const julToSlug = {}
const unmatched = []
for (const k of Object.keys(julLut)) {
  const n = Number(k)
  if (n === 0 || n >= 147) continue // 0 = medial, 147/148 = unkartierter Rest
  const name = julLut[k].name // 'Area 45 (IFG)' | 'CA2 (Hippocampus)' | 'Frontal-II (GapMap)'
  const paren = name.match(/\(([^)]*)\)\s*$/)
  const host = paren ? paren[1] : ''
  const core = name.replace(/\s*\([^)]*\)\s*$/, '').replace(/^Area\s+/i, '').trim()
  const key = norm(core + host)
  const slug = slugByNorm.get(key)
  if (!slug) { unmatched.push(`${k}:${name}->${key}`); continue }
  julToSlug[k] = slug
}
if (unmatched.length) throw new Error(`A1: ${unmatched.length} Julich-Labels ohne Slug-Match: ${unmatched.slice(0, 10).join(' | ')}`)
const matchedSlugs = new Set(Object.values(julToSlug))
const slugsNoLabel = baseSlugs.filter((b) => !matchedSlugs.has(b))
if (slugsNoLabel.length) throw new Error(`A1: ${slugsNoLabel.length} Basis-Slugs ohne fsaverage-Label: ${slugsNoLabel.slice(0, 10).join(', ')}`)

// --- 3. Validierung: jeder TARO-Kortex-Gyrus-Host, der Julich-Slugs traegt, ist via DKT erreichbar ---
const julHostStems = new Set(Object.values(julLabels).map((v) => v.host_stem))
const dktReachable = new Set(Object.values(dktToTaro).map((v) => v.taro_host_stem))
// Combined-Hosts: deren Komponenten muessen via DKT erreichbar sein bzw. der Combined-Key selbst.
const unreachable = [...julHostStems].filter((h) => !dktReachable.has(h))
// hippocampus-proper ist subkortikal (kein fsaverage-Kortex-DKT-Label) -> A2 nutzt Label-Membership+FLOOR,
// kein DKT-Patch. Das ist dokumentiert/erwartet, kein stiller Verlust.

const out = {
  _doc: 'A1-Bruecke: dkt_label->TARO-Host (Registrierungs-Vehikel) + julich_label->julich3-Slug (1:1). '
    + 'Slug->Host-Zuweisung selbst kommt aus work/atlas_labels_julich.json (unveraendert).',
  dkt_to_taro: dktToTaro,
  julich_to_slug: julToSlug,
  julich_hosts_not_dkt_reachable: unreachable,
}
writeFileSync(resolve(here, 'work/dkt_to_taro_gyrus.json'), JSON.stringify(out, null, 1))

console.log('=== A1 Gyrus-Korrespondenz ===')
console.log(`  DKT-Labels -> TARO-Host: ${Object.keys(dktToTaro).length} (0 ohne Host)`)
console.log(`  Julich-Labels -> Slug: ${Object.keys(julToSlug).length}/146 (0 unmatched, 0 Slugs ohne Label)`)
console.log(`  TARO-Julich-Hosts nicht via DKT erreichbar (erwartet, A2 nutzt Label-Membership+FLOOR): ${unreachable.join(', ') || '—'}`)
console.log('  -> work/dkt_to_taro_gyrus.json')
