// P4 — Runtime-Integration einzelner Julich-Parzellen in k11-subparcels.glb.
// REPRODUZIERBAR + IDEMPOTENT: carvt das vollstaendige "verwaltete" Julich-Set immer frisch aus der
// stabilen register.py-Basis (work/k11-base-28.glb = build_subparcels-Output: 24 DKT/geom-Patches
// + GPi/GPe-Split) und schreibt das App-Asset neu. So ist jeder Re-Run deterministisch (keine
// Akkumulation/Orphans). Bei Aenderung der register.py-Basis: neu bauen + diesen Snapshot updaten.
// Quelle der Geometrie: work/atlas_labels_julich.json (auf TARO transformiert) + taro_cortex_hosts.json
// (combined-Host-Rekonstruktion wie atlas_bake.mjs / register_atlas.py).
// KEINE stillen Fehler-Ersatzpfade: fehlende Slugs, Namens-Kollision oder 0 baubare Faces werfen laut.
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeVertexNormals, ownerMap, assignFacesByOwner, buildPatch, patchCoords } from './subpatch_bake.mjs'

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

// Runtime-Slugs nach Host gruppieren — fuer glatte Host-Normalen + lueckenloses Face-Tiling
// (subpatch_bake.mjs). DLPFC-Subareale tilen MFG/SFG (Partition); fp1/fp2 bewohnen nur die
// Pol-Kappe der frontal-pole-combined (absolute -> strikt, Extent unveraendert).
const byHost = new Map()
for (const [atlasSlug, runtimeSlug] of Object.entries(SLUG_MAP)) {
  const label = labels[atlasSlug]
  if (!label) throw new Error(`bake_julich_runtime: Slug ${atlasSlug} fehlt in atlas_labels_julich.json`)
  if (!byHost.has(label.host)) byHost.set(label.host, [])
  byHost.get(label.host).push([runtimeSlug, label.vertex_indices])
}

for (const [host, members] of byHost) {
  const H = hostGeom(host)
  const normals = computeVertexNormals(H.vertices, H.faces)
  const owner = ownerMap(members)
  const slugs = members.map(([s]) => s)
  // Alle Julich-Gruppen sind Within-Host-Partitionen -> lueckenlos kacheln (>=2-Mehrheit).
  const facesBySlug = assignFacesByOwner(H.faces, owner, slugs)

  for (const slug of slugs) {
    const faces = facesBySlug.get(slug)
    if (faces.length === 0) {
      throw new Error(`bake_julich_runtime: ${slug} hat 0 baubare Faces (host ${host})`)
    }
    const { verts, norms, faces: idx } = buildPatch(H.vertices, normals, faces)

    const pos = new Float32Array(verts.flat())
    const nor = new Float32Array(norms.flat())
    const ind = new Uint32Array(idx.flat())
    const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)
    const nac = doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf)
    const iac = doc.createAccessor().setType('SCALAR').setArray(ind).setBuffer(buf)
    const prim = doc.createPrimitive().setAttribute('POSITION', acc).setAttribute('NORMAL', nac).setIndices(iac)
    scene.addChild(doc.createNode(slug).setMesh(doc.createMesh(slug).addPrimitive(prim)))
    console.log('carved', slug.padEnd(32), verts.length, 'verts', idx.length, 'faces', '[tiled]')
    coordEntries[slug] = patchCoords(verts)
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
