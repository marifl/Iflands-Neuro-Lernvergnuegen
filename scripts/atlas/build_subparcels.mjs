// Baut aus TARO-Host-Geometrie (work/taro_hosts.json) + Vertex-Labels (work/labels.json)
// die Sub-Patch-Meshes und schreibt sie als unkomprimiertes GLB in Viewer-Raum.
// Schreibt ausserdem Centroid/BBox/Sphere-Eintraege in structure-coords.json
// damit CameraRig die Sub-Patches per unionBounds framen kann.
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_hosts.json')))
const labels = JSON.parse(readFileSync(resolve(here, 'work/labels.json')))

const doc = new Document()
const buf = doc.createBuffer()
const scene = doc.createScene()

// Centroid/BBox-Daten fuer structure-coords.json
const coordEntries = {}

for (const [slug, { host, vertex_indices }] of Object.entries(labels)) {
  const H = hosts[host]
  const keep = new Set(vertex_indices)

  // Re-Index: nur behaltene Vertices + Faces, deren 3 Ecken alle behalten sind.
  const remap = new Map()
  const verts = []
  for (const vi of vertex_indices) {
    remap.set(vi, verts.length)
    verts.push(H.vertices[vi])
  }
  const faces = []
  for (const f of H.faces) {
    if (keep.has(f[0]) && keep.has(f[1]) && keep.has(f[2])) {
      faces.push([remap.get(f[0]), remap.get(f[1]), remap.get(f[2])])
    }
  }
  if (faces.length === 0) {
    throw new Error(`build: ${slug} hat 0 Faces nach Carve — Vertex-Set zu duenn/unzusammenhaengend`)
  }

  const pos = new Float32Array(verts.flat())
  const idx = new Uint32Array(faces.flat())
  const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
  const iac = doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buf)
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setIndices(iac)
  const mesh = doc.createMesh(slug).addPrimitive(prim)
  const node = doc.createNode(slug).setMesh(mesh)
  scene.addChild(node)
  console.log('carved', slug, verts.length, 'verts', faces.length, 'faces')

  // Bounding-Box + Centroid + Sphere fuer structure-coords.json berechnen
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  let sumX = 0, sumY = 0, sumZ = 0
  for (const [x, y, z] of verts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    sumX += x; sumY += y; sumZ += z
  }
  const n = verts.length
  const centroid = [+(sumX / n).toFixed(3), +(sumY / n).toFixed(3), +(sumZ / n).toFixed(3)]
  const bbox = [[+minX.toFixed(3), +minY.toFixed(3), +minZ.toFixed(3)],
                [+maxX.toFixed(3), +maxY.toFixed(3), +maxZ.toFixed(3)]]
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
  let maxR = 0
  for (const [x, y, z] of verts) {
    const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2)
    if (r > maxR) maxR = r
  }
  const sphereRadius = +maxR.toFixed(3)
  coordEntries[slug] = {
    centroid,
    bbox: { min: bbox[0], max: bbox[1] },
    sphere: sphereRadius,
  }
}

const glbOut = resolve(here, '../../apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb')
await new NodeIO().write(glbOut, doc)
console.log('wrote', glbOut)

// structure-coords.json um Sub-Patch-Eintraege ergaenzen (nur wenn noch nicht vorhanden)
const coordsPath = resolve(here, '../../apps/brain-app/public/scenes/structure-coords.json')
const coords = JSON.parse(readFileSync(coordsPath))
let added = 0
for (const [slug, entry] of Object.entries(coordEntries)) {
  if (!coords[slug]) {
    coords[slug] = entry
    added++
  }
}
writeFileSync(coordsPath, JSON.stringify(coords))
console.log(`structure-coords.json: ${added} Sub-Patch-Eintraege hinzugefuegt`)
