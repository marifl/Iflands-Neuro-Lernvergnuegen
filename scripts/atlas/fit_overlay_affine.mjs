// Korrespondenz-Affine fuer das Roh-Atlas-Overlay: fittet eine Affine MNI -> TARO ueber
// (Parzelle-MNI-Centroid  ->  Centroid ihres Carve-Patches im Shelf work/atlas-<source>.glb).
// Die Carve-Patch-Centroide spannen die TARO-OBERFLAECHE (nicht die inneren Host-Centroide) und
// sind anatomisch korrespondierend -> korrekte Orientierung UND Skalierung, KEIN 180deg-Flip
// (im Gegensatz zu korrespondenzlosem Punktwolken-CPD bei symmetrischem Hirn).
// Schreibt work/atlas_surface_affine_<source>.json {B,t}: v' = v @ B + t.
// Aufruf: node fit_overlay_affine.mjs <julich|dkt>
import { NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (source !== 'julich' && source !== 'dkt') throw new Error('Aufruf: node fit_overlay_affine.mjs <julich|dkt>')

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

// 4x4 lineares System M a = b loesen (Gauss-Elimination mit partieller Pivotisierung).
function solve4(M, b) {
  const A = M.map((row, i) => [...row, b[i]])
  for (let c = 0; c < 4; c++) {
    let p = c
    for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    ;[A[c], A[p]] = [A[p], A[c]]
    for (let r = 0; r < 4; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let k = c; k <= 4; k++) A[r][k] -= f * A[c][k]
    }
  }
  return A.map((row, i) => row[4] / A[i][i])
}

const dst = await meshCentroids(resolve(here, `work/atlas-${source}.glb`))         // TARO (Carve-Patch)
const src = jsonCentroids(JSON.parse(readFileSync(resolve(here, `work/${source}_parcels.json`)))) // MNI

// Korrespondenz-Paare (gleicher Name). Normalgleichungen X^T X a = X^T y mit X=[src,1] (N,4).
const names = Object.keys(src).filter((k) => dst[k])
const M = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
const rhs = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] // je Output-Dim j ein 4-Vektor
for (const n of names) {
  const x = [src[n][0], src[n][1], src[n][2], 1]
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 4; k++) M[i][k] += x[i] * x[k]
    for (let j = 0; j < 3; j++) rhs[j][i] += x[i] * dst[n][j]
  }
}
const cols = [solve4(M, rhs[0]), solve4(M, rhs[1]), solve4(M, rhs[2])] // je 4er-Spalte von A
const A = [0, 1, 2, 3].map((i) => [cols[0][i], cols[1][i], cols[2][i]]) // 4x3
const B = A.slice(0, 3); const t = A[3]
writeFileSync(resolve(here, `work/atlas_surface_affine_${source}.json`), JSON.stringify({ B, t }))

// Residuum + Orientierungs-Sanity (Frontalpol anterior? links = +X wie TARO?).
const apply = (v) => [
  v[0] * B[0][0] + v[1] * B[1][0] + v[2] * B[2][0] + t[0],
  v[0] * B[0][1] + v[1] * B[1][1] + v[2] * B[2][1] + t[1],
  v[0] * B[0][2] + v[1] * B[1][2] + v[2] * B[2][2] + t[2],
]
let sum = 0
for (const n of names) {
  const p = apply(src[n]); const d = dst[n]
  sum += Math.hypot(p[0] - d[0], p[1] - d[1], p[2] - d[2])
}
const det =
  B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) -
  B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) +
  B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0])
console.log(`${source}: ${names.length} Korrespondenzen, mittl. Centroid-Residuum ${(sum / names.length).toFixed(1)} mm, det(B)=${det.toFixed(3)}`)
for (const probe of ['fp1', 'hoc1', '44-ifg-l']) {
  const n = names.find((k) => k.includes(probe))
  if (n) { const p = apply(src[n]).map((x) => +x.toFixed(1)); console.log(`  ${probe.padEnd(9)} ${n} -> [${p}]  (vs TARO-Carve [${dst[n].map((x) => +x.toFixed(1))}])`) }
}
console.log(`  -> work/atlas_surface_affine_${source}.json`)
