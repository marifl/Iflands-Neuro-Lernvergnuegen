// SHELF-Bake (KEINE Runtime-Integration): carvt die transformierten Atlas-Parzellen aus der
// TARO-Host-Geometrie und schreibt ein eigenstaendiges GLB nach work/ (NICHT ins App-Asset).
// Liest work/atlas_labels_<source>.json + work/taro_cortex_hosts.json + host_map.json
// (combined Hosts werden wie in register_atlas.py rekonstruiert: Vertices konkateniert,
// Faces offset). Aufruf: node atlas_bake.mjs <source>
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2] ?? 'julich'
const labels = JSON.parse(readFileSync(resolve(here, `work/atlas_labels_${source}.json`)))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))
const hostMap = JSON.parse(readFileSync(resolve(here, 'host_map.json')))
const COMBINED = hostMap.combined_hosts

// Host-Geometrie je "<side>-<stem>" — combined werden konkateniert (Faces offset),
// identisch zur Reihenfolge in register_atlas.host_vertices().
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
  if (!hosts[hostKey]) throw new Error(`atlas_bake: Host ${hostKey} fehlt in taro_cortex_hosts`)
  return hosts[hostKey]
}

const doc = new Document()
const buf = doc.createBuffer()
const scene = doc.createScene()
const coords = {}
let carved = 0, skipped = 0

for (const [slug, { host, vertex_indices }] of Object.entries(labels)) {
  const H = hostGeom(host)
  let keep = new Set(vertex_indices)
  // Strikt: nur Faces, deren 3 Ecken alle behalten sind.
  let kf = H.faces.filter((f) => keep.has(f[0]) && keep.has(f[1]) && keep.has(f[2]))
  // Fallback (Backfill-Patches an Combined-Host-Naehten): falls 0 Faces, alle Faces nehmen,
  // die >=1 behaltenen Vertex beruehren -> garantiert zusammenhaengende, bakebare Geometrie.
  if (kf.length === 0) {
    kf = H.faces.filter((f) => keep.has(f[0]) || keep.has(f[1]) || keep.has(f[2]))
    keep = new Set(kf.flat())
  }
  if (kf.length === 0) { skipped++; continue } // wirklich keine inzidente Geometrie
  const remap = new Map()
  const verts = []
  for (const vi of keep) { remap.set(vi, verts.length); verts.push(H.vertices[vi]) }
  const faces = kf.map((f) => [remap.get(f[0]), remap.get(f[1]), remap.get(f[2])])

  const pos = new Float32Array(verts.flat())
  const idx = new Uint32Array(faces.flat())
  const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
  const iac = doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buf)
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setIndices(iac)
  const node = doc.createNode(slug).setMesh(doc.createMesh(slug).addPrimitive(prim))
  scene.addChild(node)
  carved++

  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], sum = [0, 0, 0]
  for (const v of verts) for (let i = 0; i < 3; i++) { if (v[i] < mn[i]) mn[i] = v[i]; if (v[i] > mx[i]) mx[i] = v[i]; sum[i] += v[i] }
  const n = verts.length
  coords[slug] = {
    centroid: sum.map((s) => +(s / n).toFixed(3)),
    bbox: { min: mn.map((x) => +x.toFixed(3)), max: mx.map((x) => +x.toFixed(3)) },
  }
}

const out = resolve(here, `work/atlas-${source}.glb`)
await new NodeIO().write(out, doc)
writeFileSync(resolve(here, `work/atlas-${source}-coords.json`), JSON.stringify(coords))
console.log(`${source}: ${carved} Parzellen gecarvt (${skipped} ohne zusammenhaengende Faces uebersprungen)`)
console.log(`wrote ${out} + atlas-${source}-coords.json (SHELF — nicht im App-Asset)`)
