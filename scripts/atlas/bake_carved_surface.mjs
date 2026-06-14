// EINE durchgehende TARO-Kortex-Flaeche (alle Host-Gyri gemergt) mit Per-Vertex-Atlas-Farbe
// + Nearest-Fill (jeder Vertex bekommt ein Areal -> KEINE Loecher) + Per-Vertex-Label (Pick).
//
// Warum: separate Carve-Parzellen-Meshes sind die falsche Bauart (Julich kachelt nicht flaechen-
// deckend -> Loecher; koplanar mit der Kortex -> Z-Fighting). Der Monorepo loest das mit EINER
// vertex-gefaerbten Flaeche (mni152-pial). Dieses Skript bringt dieselbe Architektur auf TARO:
// ein Mesh, Farbe je Vertex, keine konkurrierende Geometrie.
//
// Aufruf: node bake_carved_surface.mjs <julich|dkt|brodmann>
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeVertexNormals } from './subpatch_bake.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (source !== 'julich' && source !== 'dkt' && source !== 'brodmann') throw new Error('Aufruf: node bake_carved_surface.mjs <julich|dkt|brodmann>')

const labels = JSON.parse(readFileSync(resolve(here, `work/atlas_labels_${source}.json`)))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))
const hostMap = JSON.parse(readFileSync(resolve(here, 'host_map.json')))
const COMBINED = hostMap.combined_hosts

// Host-Geometrie je "<side>-<stem>" — combined werden konkateniert (identisch zu bake_carved_atlas).
function hostGeom(hostKey) {
  const m = hostKey.match(/^(left|right)-(.+)$/)
  const side = m[1], stem = m[2]
  if (COMBINED[stem]) {
    const verts = [], faces = []
    let off = 0
    for (const c of COMBINED[stem]) {
      const k = `${side}-${c}`
      if (!hosts[k]) continue
      verts.push(...hosts[k].vertices)
      faces.push(...hosts[k].faces.map((f) => [f[0] + off, f[1] + off, f[2] + off]))
      off += hosts[k].vertices.length
    }
    return { vertices: verts, faces }
  }
  if (!hosts[hostKey]) throw new Error(`hostGeom: Host ${hostKey} fehlt`)
  return hosts[hostKey]
}

// --- 1. Alle Host-Gyri zu EINEM Mesh mergen + Positions->Global-Index-Map ---
const mergedV = []
const mergedF = []
const posMap = new Map()
const pkey = (p) => `${Math.round(p[0] * 64)},${Math.round(p[1] * 64)},${Math.round(p[2] * 64)}`
for (const hk of Object.keys(hosts)) {
  const H = hosts[hk]
  const off = mergedV.length
  for (const v of H.vertices) {
    const gi = mergedV.length
    mergedV.push(v)
    const k = pkey(v)
    if (!posMap.has(k)) posMap.set(k, gi)
  }
  for (const f of H.faces) mergedF.push([f[0] + off, f[1] + off, f[2] + off])
}
const N = mergedV.length

// --- 2. Per-Vertex-Parzelle via Positions-Match (deckt combined Hosts ab) ---
const slugs = Object.keys(labels)
const vlab = new Int16Array(N).fill(-1)
slugs.forEach((slug, pi) => {
  const H = hostGeom(labels[slug].host)
  for (const li of labels[slug].vertex_indices) {
    const p = H.vertices[li]
    if (!p) continue
    const gi = posMap.get(pkey(p))
    if (gi !== undefined && vlab[gi] === -1) vlab[gi] = pi // first-wins (Backfill-Overlap)
  }
})

// --- 2b. Seed-Garantie: jede Parzelle MUSS >=1 Vertex haben (User-Vorgabe: kein Areal verloren).
// First-wins kann winzige/ueberlappende (Backfill-)Slugs vollstaendig schlucken. Hier holt sich jeder
// leere Slug genau einen Vertex zurueck: den ersten seiner vertex_indices, der im Mesh existiert
// (ueberschreibt first-wins fuer diesen einen Vertex). LAUTER Fehler, wenn KEIN Vertex auffindbar ist.
const present = new Set()
for (let i = 0; i < N; i++) if (vlab[i] >= 0) present.add(vlab[i])
const claimed = new Int16Array(N).fill(0) // markiert per Seed-Garantie gepinnte Vertices (nicht ueberschreiben)
slugs.forEach((slug, pi) => {
  if (present.has(pi)) return // hat schon Vertices
  let pinned = false
  for (const li of labels[slug].vertex_indices) {
    const p = hostGeom(labels[slug].host).vertices[li]
    if (!p) continue
    const gi = posMap.get(pkey(p))
    if (gi === undefined) continue
    if (claimed[gi]) continue // nicht einem anderen Seed klauen
    vlab[gi] = pi; claimed[gi] = 1; pinned = true; break
  }
  if (!pinned) throw new Error(`bake: Slug ${slug} hat keinen auffindbaren Vertex (Areal verloren) — labels/geom inkonsistent`)
})

// --- 3. Nearest-Fill der unzugeordneten Vertices (Grid-beschleunigt) -> keine Loecher ---
const CELL = 6
const grid = new Map()
const gkey = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`
for (let i = 0; i < N; i++) {
  if (vlab[i] === -1) continue
  const p = mergedV[i]
  const k = gkey(p[0], p[1], p[2])
  if (!grid.has(k)) grid.set(k, [])
  grid.get(k).push(i)
}
function nearestLabel(p) {
  let best = -1, bd = Infinity
  for (let r = 1; r <= 10; r++) {
    const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL), cz = Math.floor(p[2] / CELL)
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      if (r > 1 && Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue // nur neue Schale
      const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`)
      if (!cell) continue
      for (const j of cell) {
        const q = mergedV[j]
        const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
        if (d < bd) { bd = d; best = vlab[j] }
      }
    }
    if (best !== -1) break
  }
  return best
}
let filled = 0
for (let i = 0; i < N; i++) if (vlab[i] === -1) { vlab[i] = nearestLabel(mergedV[i]); filled++ }

// --- 4. Per-Vertex-Farbe (identisch zu app parcelColor: HSL-Hash, L/R seitengleich) ---
function baseName(s) { return s.replace(/-(l|r)$/, '') }
function hslToRgb(h, s, l) {
  const k = (n) => (n + h * 12) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}
const colCache = slugs.map((slug) => {
  const b = baseName(slug)
  let hh = 0
  for (let i = 0; i < b.length; i++) hh = (hh * 31 + b.charCodeAt(i)) >>> 0
  return hslToRgb((hh % 360) / 360, 0.52, 0.56)
})
const vcol = new Float32Array(N * 3)
for (let i = 0; i < N; i++) {
  const pi = vlab[i]
  const c = pi >= 0 ? colCache[pi] : [0.12, 0.12, 0.12]
  vcol[i * 3] = c[0]; vcol[i * 3 + 1] = c[1]; vcol[i * 3 + 2] = c[2]
}

// --- 5. Normalen + GLB (POSITION, NORMAL, COLOR_0) ---
const normals = computeVertexNormals(mergedV, mergedF)
const doc = new Document()
const buf = doc.createBuffer()
const scene = doc.createScene()
const acc = doc.createAccessor().setType('VEC3').setArray(new Float32Array(mergedV.flat())).setBuffer(buf)
const nac = doc.createAccessor().setType('VEC3').setArray(new Float32Array(normals.flat())).setBuffer(buf)
const cac = doc.createAccessor().setType('VEC3').setArray(vcol).setBuffer(buf)
const iac = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(mergedF.flat())).setBuffer(buf)
const prim = doc.createPrimitive().setAttribute('POSITION', acc).setAttribute('NORMAL', nac).setAttribute('COLOR_0', cac).setIndices(iac)
const name = `atlas-surface-${source}`
scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
const outGlb = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/${name}.glb`)
await new NodeIO().write(outGlb, doc)

// --- 6. Pick-Sidecar: slugs + per-Vertex-Label (Reihenfolge == GLB-Vertices) ---
const outPick = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/${name}-pick.json`)
writeFileSync(outPick, JSON.stringify({ slugs, vlabels: Array.from(vlab) }))
console.log(`${name}: ${N} Vertices, ${slugs.length} Parzellen, ${filled} per Nearest-Fill geschlossen -> ${outGlb}`)
