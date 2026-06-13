// Baut aus TARO-Host-Geometrie (work/taro_hosts.json) + Vertex-Labels (work/labels.json)
// die Sub-Patch-Meshes und schreibt sie als unkomprimiertes GLB in Viewer-Raum.
// Schreibt ausserdem Centroid/BBox/Sphere-Eintraege in structure-coords.json
// damit CameraRig die Sub-Patches per unionBounds framen kann.
// Qualitaet: glatte Host-Normalen + lueckenloses Face-Tiling (subpatch_bake.mjs), damit die
// Patches wie die TARO-Gyri shaden (nicht facettiert) und keine schwarzen Grenz-Risse zeigen.
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeVertexNormals, ownerMap, assignFacesByOwner, buildPatch, patchCoords } from './subpatch_bake.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_hosts.json')))
const labels = JSON.parse(readFileSync(resolve(here, 'work/labels.json')))
// Modus je Slug (absolute|partition|geometric_pole) aus register.py-Residuen. Bestimmt, ob ein
// Slug am Host mit-gekachelt wird (partition) oder als eigenstaendiger Threshold-Patch strikt
// gecarvt wird (absolute/geometric_pole). Hosts koennen gemischt sein (z.B. cingulate-gyrus:
// anterior-cingulate absolute = ERP-Quelle + rostral/caudal partition = Preset).
const residuals = JSON.parse(readFileSync(resolve(here, 'work/residuals.json')))
const modeOf = (slug) => residuals.subparcels?.[slug]?.mode ?? 'absolute'

// Additive Erweiterung: neue TARO-Hosts (IFG, orbital-Gyri, caudate) aus taro_hosts_extra.json.
const hostsExtraPath = resolve(here, 'work/taro_hosts_extra.json')
if (existsSync(hostsExtraPath)) {
  const hx = JSON.parse(readFileSync(hostsExtraPath))
  for (const [k, v] of Object.entries(hx)) if (!hosts[k]) hosts[k] = v
}
// Synthetische kombinierte Hosts (z.B. Frontalpol = SFG+MFG) aus dem geometric_pole-Modus.
const combinedHostsPath = resolve(here, 'work/combined_hosts.json')
if (existsSync(combinedHostsPath)) {
  const ch = JSON.parse(readFileSync(combinedHostsPath))
  for (const [k, v] of Object.entries(ch)) if (!hosts[k]) hosts[k] = v
}

const doc = new Document()
const buf = doc.createBuffer()
const scene = doc.createScene()
const coordEntries = {}

// Labels nach Host gruppieren (fuer lueckenloses Tiling pro Host).
const byHost = new Map()
for (const [slug, { host, vertex_indices }] of Object.entries(labels)) {
  if (!byHost.has(host)) byHost.set(host, [])
  byHost.get(host).push([slug, vertex_indices])
}

function emit(slug, H, normals, faces, tag) {
  if (faces.length === 0) throw new Error(`build: ${slug} hat 0 Faces nach Carve (${tag})`)
  const { verts, norms, faces: idx } = buildPatch(H.vertices, normals, faces)
  const pos = new Float32Array(verts.flat())
  const nor = new Float32Array(norms.flat())
  const ind = new Uint32Array(idx.flat())
  const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
  const nac = doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf)
  const iac = doc.createAccessor().setType('SCALAR').setArray(ind).setBuffer(buf)
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setAttribute('NORMAL', nac).setIndices(iac)
  scene.addChild(doc.createNode(slug).setMesh(doc.createMesh(slug).addPrimitive(prim)))
  console.log('carved', slug.padEnd(32), verts.length, 'verts', idx.length, 'faces', tag)
  coordEntries[slug] = patchCoords(verts)
}

for (const [host, members] of byHost) {
  const H = hosts[host]
  if (!H) throw new Error(`build: Host ${host} fehlt in taro_hosts(+extra/combined)`)
  const normals = computeVertexNormals(H.vertices, H.faces)

  // Partition-Slugs kacheln den Host lueckenlos (Mehrheits-Zuweisung). Absolute/geometric_pole
  // bleiben eigenstaendige strikte Threshold-Patches (Extent unveraendert, duerfen ueberlappen).
  const part = members.filter(([s]) => modeOf(s) === 'partition')
  const other = members.filter(([s]) => modeOf(s) !== 'partition')

  if (part.length) {
    const owner = ownerMap(part)
    const slugs = part.map(([s]) => s)
    const facesBySlug = assignFacesByOwner(H.faces, owner, slugs)
    for (const slug of slugs) emit(slug, H, normals, facesBySlug.get(slug), '[tiled]')
  }
  for (const [slug, vidx] of other) {
    const keep = new Set(vidx)
    const faces = H.faces.filter((f) => keep.has(f[0]) && keep.has(f[1]) && keep.has(f[2]))
    emit(slug, H, normals, faces, '[strict]')
  }
}

const glbOut = resolve(here, '../../apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb')
await new NodeIO().write(glbOut, doc)
console.log('wrote', glbOut)

// structure-coords.json um Sub-Patch-Eintraege ergaenzen/aktualisieren (upsert).
const coordsPath = resolve(here, '../../apps/brain-app/public/scenes/structure-coords.json')
const coords = JSON.parse(readFileSync(coordsPath))
let n = 0
for (const [slug, entry] of Object.entries(coordEntries)) { coords[slug] = entry; n++ }
writeFileSync(coordsPath, JSON.stringify(coords))
console.log(`structure-coords.json: ${n} Sub-Patch-Eintraege upserted`)
