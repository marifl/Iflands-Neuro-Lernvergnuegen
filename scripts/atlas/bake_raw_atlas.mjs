// Roh-Atlas-Overlay: die ORIGINALEN Julich/DKT-Mesh-Areale (eigene Polygonisierung, NICHT aus
// TARO gecarvt) per globaler Affine MNI->TARO grob auf das TARO-Hirn gelegt — als optionaler
// Layer zum Ein-/Ausblenden, damit der echte Rest-Drift sichtbar wird.
// Quelle: work/<source>_parcels.json (decode_glb-Rohgeometrie) + work/atlas_affine_<source>.json.
// Aufruf: node bake_raw_atlas.mjs julich   |   node bake_raw_atlas.mjs dkt
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeVertexNormals } from './subpatch_bake.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (source !== 'julich' && source !== 'dkt') throw new Error('Aufruf: node bake_raw_atlas.mjs <julich|dkt>')

const parcels = JSON.parse(readFileSync(resolve(here, `work/${source}_parcels.json`)))

// Bevorzugt die OBERFLAECHEN-Affine (register_raw_overlay.py, CPD Surface->Surface, ~4.5mm Residuum);
// faellt zurueck auf die Zentroid-Affine (register_atlas.py), die ein Overlay aber unterskaliert.
const surfPath = resolve(here, `work/atlas_surface_affine_${source}.json`)
let applyAffine
if (existsSync(surfPath)) {
  const { B, t } = JSON.parse(readFileSync(surfPath)) // v' = v @ B + t, B 3x3, t 3
  applyAffine = (v) => [
    v[0] * B[0][0] + v[1] * B[1][0] + v[2] * B[2][0] + t[0],
    v[0] * B[0][1] + v[1] * B[1][1] + v[2] * B[2][1] + t[1],
    v[0] * B[0][2] + v[1] * B[1][2] + v[2] * B[2][2] + t[2],
  ]
  console.log(`${source}: Oberflaechen-Affine (CPD surface->surface)`)
} else {
  const A = JSON.parse(readFileSync(resolve(here, `work/atlas_affine_${source}.json`))) // 4x3
  applyAffine = (v) => [
    v[0] * A[0][0] + v[1] * A[1][0] + v[2] * A[2][0] + A[3][0],
    v[0] * A[0][1] + v[1] * A[1][1] + v[2] * A[2][1] + A[3][1],
    v[0] * A[0][2] + v[1] * A[1][2] + v[2] * A[2][2] + A[3][2],
  ]
  console.log(`${source}: Zentroid-Affine (Fallback — unterskaliert ein Overlay)`)
}

const doc = new Document()
const buf = doc.createBuffer()
const scene = doc.createScene()
let meshes = 0, totalFaces = 0

for (const [name, geom] of Object.entries(parcels)) {
  const faces = geom.faces
  if (!faces || faces.length === 0) continue
  const verts = geom.vertices.map(applyAffine)
  const normals = computeVertexNormals(verts, faces)

  const pos = new Float32Array(verts.flat())
  const nor = new Float32Array(normals.flat())
  const idx = new Uint32Array(faces.flat())
  const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
  const nac = doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf)
  const iac = doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buf)
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setAttribute('NORMAL', nac).setIndices(iac)
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
  meshes++
  totalFaces += faces.length
}

const out = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/atlas-raw-${source}.glb`)
await new NodeIO().write(out, doc)
console.log(`${source}: ${meshes} Areale, ${totalFaces} Faces -> ${out}`)
