// P4 — Runtime-Integration einzelner Julich-Parzellen in k11-subparcels.glb.
// REPRODUZIERBAR + IDEMPOTENT: carvt das vollstaendige "verwaltete" Julich-Set immer frisch aus der
// stabilen register.py-Basis (work/k11-base-28.glb = build_subparcels-Output: 24 DKT/geom-Patches
// + GPi/GPe-Split) und schreibt das App-Asset neu. So ist jeder Re-Run deterministisch (keine
// Akkumulation/Orphans). Bei Aenderung der register.py-Basis: neu bauen + diesen Snapshot updaten.
// Quelle der Geometrie: work/atlas_labels_julich.json (auf TARO transformiert) + taro_cortex_hosts.json
// (combined-Host-Rekonstruktion wie atlas_bake.mjs / register_atlas.py).
// KEINE stillen Fehler-Fallbacks: fehlende Slugs, Namens-Kollision oder 0 baubare Faces werfen laut.
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// Verwaltetes Set: [Atlas-Slug-Basis (ohne -l/-r), Runtime-Name (ohne Seite)]. Wird zu
// left-/right-<Runtime-Name> expandiert. EINE Namensquelle fuer Bake + bucketMeshes.ts.
const MANAGED = [
  // Frontopolar (BA10): echtes Julich-Areal fp1/fp2 statt geometrischem Pol-Carve.
  ['julich3-area-fp1-fpole', 'julich-fp1'],
  ['julich3-area-fp2-fpole', 'julich-fp2'],
  // DLPFC (voll lateral+superior): MFG-Host (lateraler PFC, BA46/9-46/8v) ...
  ['julich3-area-mfg1-mfg', 'julich-mfg1'],
  ['julich3-area-mfg2-mfg', 'julich-mfg2'],
  ['julich3-area-mfg4-mfg', 'julich-mfg4'],
  ['julich3-area-8v1-mfg', 'julich-8v1'],
  ['julich3-area-8v2-mfg', 'julich-8v2'],
  ['julich3-area-sfs1-sfs', 'julich-sfs1'],
  ['julich3-area-sfs2-sfs', 'julich-sfs2'],
  ['julich3-frontal-ii-gapmap', 'julich-frontal-ii-gapmap'],
  // ... SFG-Host (superiorer PFC, BA9/8d).
  ['julich3-area-sfg2-sfg', 'julich-sfg2'],
  ['julich3-area-sfg3-sfg', 'julich-sfg3'],
  ['julich3-area-sfg4-sfg', 'julich-sfg4'],
  ['julich3-area-8d1-sfg', 'julich-8d1'],
  ['julich3-area-8d2-sfg', 'julich-8d2'],
  ['julich3-frontal-i-2-gapmap', 'julich-frontal-i-2-gapmap'],
]

// Atlas-Slug -> Runtime-Mesh-Name, beide Seiten.
const SLUG_MAP = {}
for (const [atlasBase, runtimeName] of MANAGED) {
  SLUG_MAP[`${atlasBase}-l`] = `left-${runtimeName}`
  SLUG_MAP[`${atlasBase}-r`] = `right-${runtimeName}`
}

const labels = JSON.parse(readFileSync(resolve(here, 'work/atlas_labels_julich.json')))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))
const hostMap = JSON.parse(readFileSync(resolve(here, 'host_map.json')))
const COMBINED = hostMap.combined_hosts

// Host-Geometrie je "<side>-<stem>" — combined-Hosts konkateniert (Faces offset), identisch
// zur Reihenfolge in register_atlas.host_vertices() / atlas_bake.hostGeom().
function hostGeom(hostKey) {
  const m = hostKey.match(/^(left|right)-(.+)$/)
  const side = m[1]
  const stem = m[2]
  if (COMBINED[stem]) {
    const verts = []
    const faces = []
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
  if (!hosts[hostKey]) throw new Error(`bake_julich_runtime: Host ${hostKey} fehlt in taro_cortex_hosts`)
  return hosts[hostKey]
}

// Stabile register.py-Basis laden (NICHT das ggf. schon erweiterte App-Asset).
const basePath = resolve(here, 'work/k11-base-28.glb')
const glbPath = resolve(here, '../../apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb')
const io = new NodeIO()
const doc = await io.read(basePath)
const buf = doc.getRoot().listBuffers()[0]
const scene = doc.getRoot().listScenes()[0]

// Kollisions-Guard: Runtime-Slugs duerfen nicht mit den Basis-Patches kollidieren.
const baseNames = new Set(doc.getRoot().listMeshes().map((mesh) => mesh.getName()))
for (const runtimeSlug of Object.values(SLUG_MAP)) {
  if (baseNames.has(runtimeSlug)) {
    throw new Error(`bake_julich_runtime: Slug ${runtimeSlug} kollidiert mit Basis-Patch`)
  }
}

const coordEntries = {}

for (const [atlasSlug, runtimeSlug] of Object.entries(SLUG_MAP)) {
  const label = labels[atlasSlug]
  if (!label) throw new Error(`bake_julich_runtime: Slug ${atlasSlug} fehlt in atlas_labels_julich.json`)
  const H = hostGeom(label.host)
  let keep = new Set(label.vertex_indices)
  // Strikt: nur Faces, deren 3 Ecken alle behalten sind.
  let kf = H.faces.filter((f) => keep.has(f[0]) && keep.has(f[1]) && keep.has(f[2]))
  // Backfill-Fallback (wie atlas_bake.mjs): winzige Crowding-Opfer (z.B. sfg4-r, 12 Vertices)
  // haben keine Faces mit 3 behaltenen Ecken -> Faces nehmen, die >=1 behaltenen Vertex beruehren.
  // Loggt laut, damit es keine stille Naeherung ist.
  if (kf.length === 0) {
    kf = H.faces.filter((f) => keep.has(f[0]) || keep.has(f[1]) || keep.has(f[2]))
    keep = new Set(kf.flat())
    console.log(`  [backfill-fallback] ${runtimeSlug}: 0 strikte Faces -> ${kf.length} inzidente Faces`)
  }
  if (kf.length === 0) {
    throw new Error(`bake_julich_runtime: ${runtimeSlug} hat 0 baubare Faces — Vertex-Set ohne inzidente Geometrie`)
  }
  const remap = new Map()
  const verts = []
  for (const vi of keep) {
    remap.set(vi, verts.length)
    verts.push(H.vertices[vi])
  }
  const faces = kf.map((f) => [remap.get(f[0]), remap.get(f[1]), remap.get(f[2])])

  const pos = new Float32Array(verts.flat())
  const idx = new Uint32Array(faces.flat())
  const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
  const iac = doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buf)
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setIndices(iac)
  const mesh = doc.createMesh(runtimeSlug).addPrimitive(prim)
  scene.addChild(doc.createNode(runtimeSlug).setMesh(mesh))
  console.log('carved', runtimeSlug.padEnd(28), verts.length, 'verts', faces.length, 'faces')

  // Centroid/BBox/Sphere fuer structure-coords.json (Format wie build_subparcels.mjs).
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
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
  let maxR = 0
  for (const [x, y, z] of verts) {
    const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2)
    if (r > maxR) maxR = r
  }
  coordEntries[runtimeSlug] = {
    centroid: [+(sumX / n).toFixed(3), +(sumY / n).toFixed(3), +(sumZ / n).toFixed(3)],
    bbox: { min: [+minX.toFixed(3), +minY.toFixed(3), +minZ.toFixed(3)], max: [+maxX.toFixed(3), +maxY.toFixed(3), +maxZ.toFixed(3)] },
    sphere: +maxR.toFixed(3),
  }
}

await io.write(glbPath, doc)
console.log('wrote', glbPath, '(', doc.getRoot().listMeshes().length, 'meshes total )')

// structure-coords.json um die verwalteten Sub-Patches ergaenzen/aktualisieren (upsert).
const coordsPath = resolve(here, '../../apps/brain-app/public/scenes/structure-coords.json')
const coords = JSON.parse(readFileSync(coordsPath))
let upserted = 0
for (const [slug, entry] of Object.entries(coordEntries)) {
  coords[slug] = entry
  upserted++
}
writeFileSync(coordsPath, JSON.stringify(coords))
console.log(`structure-coords.json: ${upserted} Sub-Patch-Eintraege upserted`)
