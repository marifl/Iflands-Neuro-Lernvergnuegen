// Per-Lappen-Korrespondenz-Affine fuer das Roh-Atlas-Overlay.
// Fittet je Hirnlappen (Frontal/Parietal/Temporal/Occipital/Insula/Cingulum) eine EIGENE Affine
// ueber anatomische Korrespondenz: Parzelle-MNI-Centroid -> Centroid ihres Carve-Patches im Shelf
// work/atlas-<source>.glb. Stueckweise -> deutlich enger (~5-7mm) als eine globale Affine (~10mm),
// OHNE non-rigide Verzerrung. Korrespondenz verhindert den 180deg-Flip (anatomisch zugeordnet).
// Kleine Lappen (< MIN_PARCELS) fallen auf die globale Affine zurueck (zu wenige Punkte fuer 12 DOF).
// Schreibt work/atlas_overlay_transform_<source>.json {global, lobes, assign}.
// Aufruf: node fit_overlay_affine.mjs <julich|dkt>
import { NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (source !== 'julich' && source !== 'dkt') throw new Error('Aufruf: node fit_overlay_affine.mjs <julich|dkt>')
const MIN_PARCELS = 8

// Host-Gyrus-Stem -> Hirnlappen.
const LOBE = {
  frontal: ['inferior-frontal-gyrus', 'middle-frontal-gyrus', 'superior-frontal-gyrus', 'precentral-gyrus',
    'ofc-combined', 'frontal-pole-combined', 'lateral-orbital-gyrus', 'medial-orbital-gyrus',
    'anterior-orbital-gyrus', 'posterior-orbital-gyrus'],
  parietal: ['superior-parietal-lobule', 'ipl-combined', 'supramarginal-gyrus', 'postcentral-gyrus', 'precuneus'],
  temporal: ['superior-temporal-gyrus', 'middle-temporal-gyrus', 'inferior-temporal-gyrus', 'fusiform-gyrus',
    'heschl-combined', 'parahippocampal-gyrus', 'hippocampus-proper'],
  occipital: ['cuneus', 'lateral-occipital-gyrus', 'lingual-gyrus'],
  insula: ['insula-combined', 'first-short-gyrus-of-insula'],
  cingulate: ['cingulate-gyrus'],
}
const STEM_LOBE = {}
for (const [lobe, stems] of Object.entries(LOBE)) for (const s of stems) STEM_LOBE[s] = lobe
const lobeOfHost = (host) => STEM_LOBE[host.replace(/^(left|right)-/, '')] ?? 'other'

function meshCentroids(glbPath) {
  const out = {}
  return new NodeIO().read(glbPath).then((doc) => {
    for (const mesh of doc.getRoot().listMeshes()) {
      const pos = mesh.listPrimitives()[0].getAttribute('POSITION')
      const v = [0, 0, 0]; const s = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); s[0] += v[0]; s[1] += v[1]; s[2] += v[2] }
      out[mesh.getName()] = [s[0] / pos.getCount(), s[1] / pos.getCount(), s[2] / pos.getCount()]
    }
    return out
  })
}
function jsonCentroids(parcels) {
  const out = {}
  for (const [k, g] of Object.entries(parcels)) {
    const s = [0, 0, 0]
    for (const v of g.vertices) { s[0] += v[0]; s[1] += v[1]; s[2] += v[2] }
    out[k] = [s[0] / g.vertices.length, s[1] / g.vertices.length, s[2] / g.vertices.length]
  }
  return out
}
function solve4(M, b) { // 4x4 Gauss-Elimination mit Pivot
  const A = M.map((row, i) => [...row, b[i]])
  for (let c = 0; c < 4; c++) {
    let p = c
    for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    ;[A[c], A[p]] = [A[p], A[c]]
    for (let r = 0; r < 4; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= 4; k++) A[r][k] -= f * A[c][k] }
  }
  return A.map((row, i) => row[4] / A[i][i])
}
function fitAffine(names, src, dst) { // Korrespondenz-Affine MNI->TARO via Normalgleichungen
  const M = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  const rhs = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  for (const n of names) {
    const x = [src[n][0], src[n][1], src[n][2], 1]
    for (let i = 0; i < 4; i++) { for (let k = 0; k < 4; k++) M[i][k] += x[i] * x[k]; for (let j = 0; j < 3; j++) rhs[j][i] += x[i] * dst[n][j] }
  }
  const cols = [solve4(M, rhs[0]), solve4(M, rhs[1]), solve4(M, rhs[2])]
  const A = [0, 1, 2, 3].map((i) => [cols[0][i], cols[1][i], cols[2][i]])
  const B = A.slice(0, 3), t = A[3]
  const apply = (v) => [
    v[0] * B[0][0] + v[1] * B[1][0] + v[2] * B[2][0] + t[0],
    v[0] * B[0][1] + v[1] * B[1][1] + v[2] * B[2][1] + t[1],
    v[0] * B[0][2] + v[1] * B[1][2] + v[2] * B[2][2] + t[2],
  ]
  let sum = 0
  for (const n of names) { const p = apply(src[n]), d = dst[n]; sum += Math.hypot(p[0] - d[0], p[1] - d[1], p[2] - d[2]) }
  return { B, t, residual: sum / names.length }
}

const dst = await meshCentroids(resolve(here, `work/atlas-${source}.glb`))
const src = jsonCentroids(JSON.parse(readFileSync(resolve(here, `work/${source}_parcels.json`))))
const labels = JSON.parse(readFileSync(resolve(here, `work/atlas_labels_${source}.json`)))
const names = Object.keys(src).filter((k) => dst[k] && labels[k])

// Global (Fallback) + je Lappen.
const global = fitAffine(names, src, dst)
const byLobe = {}
for (const n of names) (byLobe[lobeOfHost(labels[n].host)] ??= []).push(n)
const lobes = {}
const assign = {}
console.log(`${source}: global-Residuum ${global.residual.toFixed(1)} mm (${names.length} Parzellen)`)
for (const [lobe, ns] of Object.entries(byLobe)) {
  if (ns.length >= MIN_PARCELS && lobe !== 'other') {
    lobes[lobe] = fitAffine(ns, src, dst)
    for (const n of ns) assign[n] = lobe
    console.log(`  ${lobe.padEnd(10)} ${String(ns.length).padStart(3)} Parzellen, Residuum ${lobes[lobe].residual.toFixed(1)} mm`)
  } else {
    for (const n of ns) assign[n] = 'global'
    console.log(`  ${lobe.padEnd(10)} ${String(ns.length).padStart(3)} Parzellen -> global (zu klein)`)
  }
}
writeFileSync(resolve(here, `work/atlas_overlay_transform_${source}.json`),
  JSON.stringify({ global: { B: global.B, t: global.t }, lobes, assign }))
// Carve-Patch-TARO-Centroide (dst) fuer den korrespondenz-getriebenen RBF-Warp (warp_overlay.py).
const carve = {}
for (const n of names) carve[n] = dst[n]
writeFileSync(resolve(here, `work/atlas_carve_centroids_${source}.json`), JSON.stringify(carve))
console.log(`  -> work/atlas_overlay_transform_${source}.json (+ atlas_carve_centroids_${source}.json)`)
