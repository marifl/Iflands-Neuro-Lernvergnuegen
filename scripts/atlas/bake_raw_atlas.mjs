// Roh-Atlas-Overlay: die ORIGINALEN Julich/DKT-Mesh-Areale (eigene Polygonisierung, NICHT aus
// TARO gecarvt) per globaler Affine MNI->TARO grob auf das TARO-Hirn gelegt — als optionaler
// Layer zum Ein-/Ausblenden, damit der echte Rest-Drift sichtbar wird.
// Quelle: work/<source>_parcels.json (decode_glb-Rohgeometrie) + work/atlas_affine_<source>.json.
// Aufruf: node bake_raw_atlas.mjs julich   |   node bake_raw_atlas.mjs dkt
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeVertexNormals } from './subpatch_bake.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (source !== 'julich' && source !== 'dkt') throw new Error('Aufruf: node bake_raw_atlas.mjs <julich|dkt>')

const parcels = JSON.parse(readFileSync(resolve(here, `work/${source}_parcels.json`)))
const A = JSON.parse(readFileSync(resolve(here, `work/atlas_affine_${source}.json`))) // 4x3, apply: [x,y,z,1] @ A

// Affine auf einen Vertex anwenden: out[j] = sum_i vh[i]*A[i][j], vh = [x,y,z,1].
function applyAffine(v) {
  const x = v[0], y = v[1], z = v[2]
  return [
    x * A[0][0] + y * A[1][0] + z * A[2][0] + A[3][0],
    x * A[0][1] + y * A[1][1] + z * A[2][1] + A[3][1],
    x * A[0][2] + y * A[1][2] + z * A[2][2] + A[3][2],
  ]
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
