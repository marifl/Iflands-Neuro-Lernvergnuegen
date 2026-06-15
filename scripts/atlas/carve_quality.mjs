// Misst die Carve-Boundary-Qualitaet eines atlas-surface-<src>.glb + -pick.json:
//  - boundaryEdgeFrac: Anteil der Mesh-Kanten, deren Endpunkte verschiedene Labels tragen (Rauheit).
//  - isolatedSpecks:   Label-Zusammenhangskomponenten der Groesse 1 (Konfetti-Einzelvertices).
//  - emptyAreas:       Parzellen ohne einen einzigen Vertex.
// Rein lesend, keine Mutation. Aufruf: node carve_quality.mjs <julich|dkt|brodmann>
import { NodeIO } from '@gltf-transform/core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = process.argv[2]
if (!['julich', 'dkt', 'brodmann'].includes(src)) throw new Error('Aufruf: node carve_quality.mjs <julich|dkt|brodmann>')

const glbPath = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/atlas-surface-${src}.glb`)
const pickPath = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/atlas-surface-${src}-pick.json`)

const pick = JSON.parse(readFileSync(pickPath, 'utf8'))
const vlab = Int16Array.from(pick.vlabels)
const N = vlab.length

const doc = await new NodeIO().read(glbPath)
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0]
const idx = prim.getIndices().getArray()

/** Berechnet die Qualitaets-Metriken aus Faces (idx) + Per-Vertex-Labels (vlab). */
export function carveQuality(idx, vlab, nAreas) {
  const N = vlab.length
  // Adjazenz + Kanten (eindeutig) aus Faces.
  const adj = Array.from({ length: N }, () => new Set())
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f], b = idx[f + 1], c = idx[f + 2]
    adj[a].add(b); adj[b].add(a); adj[b].add(c); adj[c].add(b); adj[a].add(c); adj[c].add(a)
  }
  let totalEdges = 0, boundaryEdges = 0
  for (let v = 0; v < N; v++) for (const w of adj[v]) if (w > v) {
    totalEdges++
    if (vlab[v] !== vlab[w]) boundaryEdges++
  }
  // Isolierte Specks: Vertex, dessen ALLE Nachbarn ein anderes Label tragen (Insel der Groesse 1).
  let isolatedSpecks = 0
  for (let v = 0; v < N; v++) {
    let same = false
    for (const w of adj[v]) if (vlab[w] === vlab[v]) { same = true; break }
    if (!same) isolatedSpecks++
  }
  const present = new Set()
  for (let v = 0; v < N; v++) if (vlab[v] >= 0) present.add(vlab[v])
  const emptyAreas = nAreas - present.size
  return {
    nVerts: N, totalEdges, boundaryEdges,
    boundaryEdgeFrac: +(boundaryEdges / totalEdges).toFixed(4),
    isolatedSpecks, nAreas, emptyAreas,
  }
}

const m = carveQuality(idx, vlab, pick.slugs.length)
console.log(`${src}:`, JSON.stringify(m))
