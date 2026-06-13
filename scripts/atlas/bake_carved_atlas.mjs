// VIEWER-CARVE-Overlay: carvt die transformierten Atlas-Parzellen aus der TARO-Host-Geometrie
// (identische Carve-Logik wie atlas_bake.mjs, aber MIT Vertex-Normalen) und schreibt ein
// viewer-ladbares GLB ins App-Asset. Anders als das Roh-Overlay (atlas-raw-*, fremde MNI-Geometrie
// per Affine) besteht der Carve aus TARO-EIGENEN Vertices -> liegt per Konstruktion exakt (0 mm)
// auf der TARO-Oberflaeche. Diagnose-Layer: zeigt, dass das Pin-Ziel bereits deckungsgleich ist.
// Aufruf: node bake_carved_atlas.mjs <julich|dkt>
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeVertexNormals } from './subpatch_bake.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (source !== 'julich' && source !== 'dkt') throw new Error('Aufruf: node bake_carved_atlas.mjs <julich|dkt>')

const labels = JSON.parse(readFileSync(resolve(here, `work/atlas_labels_${source}.json`)))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))
const hostMap = JSON.parse(readFileSync(resolve(here, 'host_map.json')))
const COMBINED = hostMap.combined_hosts

// Host-Geometrie je "<side>-<stem>" — combined werden konkateniert (Faces offset),
// identisch zu atlas_bake.hostGeom / register_atlas.host_vertices().
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
  if (!hosts[hostKey]) throw new Error(`bake_carved: Host ${hostKey} fehlt in taro_cortex_hosts`)
  return hosts[hostKey]
}

const doc = new Document()
const buf = doc.createBuffer()
const scene = doc.createScene()
let carved = 0, skipped = 0

for (const [slug, { host, vertex_indices }] of Object.entries(labels)) {
  const H = hostGeom(host)
  let keep = new Set(vertex_indices)
  // Strikt: nur Faces, deren 3 Ecken alle behalten sind.
  let kf = H.faces.filter((f) => keep.has(f[0]) && keep.has(f[1]) && keep.has(f[2]))
  // Fallback (Backfill-Patches an Combined-Host-Naehten): falls 0 Faces, alle Faces nehmen,
  // die >=1 behaltenen Vertex beruehren.
  if (kf.length === 0) {
    kf = H.faces.filter((f) => keep.has(f[0]) || keep.has(f[1]) || keep.has(f[2]))
    keep = new Set(kf.flat())
  }
  if (kf.length === 0) { skipped++; continue }
  const remap = new Map()
  const verts = []
  for (const vi of keep) { remap.set(vi, verts.length); verts.push(H.vertices[vi]) }
  const faces = kf.map((f) => [remap.get(f[0]), remap.get(f[1]), remap.get(f[2])])
  const normals = computeVertexNormals(verts, faces)

  const pos = new Float32Array(verts.flat())
  const nor = new Float32Array(normals.flat())
  const idx = new Uint32Array(faces.flat())
  const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
  const nac = doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf)
  const iac = doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buf)
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setAttribute('NORMAL', nac).setIndices(iac)
  scene.addChild(doc.createNode(slug).setMesh(doc.createMesh(slug).addPrimitive(prim)))
  carved++
}

const out = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/atlas-carved-${source}.glb`)
await new NodeIO().write(out, doc)
console.log(`${source}: ${carved} Carve-Parzellen (${skipped} ohne Faces) -> ${out}`)
