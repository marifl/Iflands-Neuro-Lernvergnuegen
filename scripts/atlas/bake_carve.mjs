// Baeckt die Carve-Atlas-Oberflaeche (atlas-surface-<src>.glb) — die figur-genaue Areal-Einfaerbung
// auf dem GEFURCHTEN TARO-Kortex. Kernprinzipien (teuer erkaempft, NICHT zurueckdrehen):
//   1. GRENZ-KONFORMER Cut (splitTri) fuer GERADE, scharfe Arealgrenzen — T-JUNCTION-FREI per
//      Konstruktion (geteilte Kanten beidseitig identisch am Mittelpunkt). ABER: KEIN laplacianSmooth
//      (schob Grenzknoten off-surface -> Spikes) und KEINE Normal-Inflation (riss Grenz-Duplikate auf
//      -> Shards). Beides war die Artefakt-Quelle, NICHT der Cut selbst. Basis = gefurchtes clean-Mesh.
//   2. Harte Farbkante: Grenz-Mittelpunkte werden pro Sub-Dreieck mit dessen Label dupliziert (indexed)
//      -> keine Farb-Interpolation ueber die Grenze -> kein Batik.
//   3. WISSENSCHAFTLICH TREUE Labels: exakter Positions-Match der registrierten atlas_labels (register_
//      atlas.py) + NEAREST-CENTROID-Aufloesung der Combined-Host-Overlaps (= Within-Host-Partition;
//      verhindert dass z.B. inferiorparietal das supramarginal verschluckt) + Nearest-Fill nur fuer Luecken.
//   4. WINDING-Korrektur (entscheidend!): splitTri emittiert manche Sub-Dreiecke gegenlaeufig und die
//      TARO-Gyri haben gemischte Wicklung -> falsch orientierte Normalen = GRUENE Shards (im NormalMaterial
//      sichtbar). Jedes Sub-Dreieck wird an der Eltern-Face-Normale ausgerichtet (flip wenn dot<0).
//      Danach gibt weldedNormalsDirectional korrekte Normalen (verify_topology: <0.02% falsch).
// Verworfen (NICHT erneut versuchen): Voxel-Remesh (ballonte Furchen weg), Label-Textur (Cortex hat
// keine gute UV -> zersplittert), flat-vColor-Shader (vColor nicht im assemblierten Shader -> wirkungslos),
// laplacianSmooth/Normal-Inflation (Spikes/Shards). Kein Blender noetig. Aufruf:
//   node bake_carve.mjs <julich|dkt|brodmann> [obj=work/taro_cortex_clean.obj]
import { Document, NodeIO } from '@gltf-transform/core'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { splitTri, weldedNormalsDirectional } from './carve_cut.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]
if (!['julich', 'dkt', 'brodmann'].includes(source)) throw new Error('Aufruf: node bake_remeshed_surface.mjs <julich|dkt|brodmann>')

// --- Gefurchtes clean-Mesh laden (Pfad via arg3 ueberschreibbar) ---
const objRel = process.argv[3] || 'work/taro_cortex_clean.obj'
const obj = readFileSync(resolve(here, objRel), 'utf8')
const V = [], F = []
for (const line of obj.split('\n')) {
  if (line[0] === 'v' && line[1] === ' ') { const p = line.slice(2).trim().split(/\s+/).map(Number); V.push([p[0], p[1], p[2]]) }
  else if (line[0] === 'f' && line[1] === ' ') {
    const idx = line.slice(2).trim().split(/\s+/).map((t) => parseInt(t.split('/')[0], 10) - 1)
    for (let i = 1; i + 1 < idx.length; i++) F.push([idx[0], idx[i], idx[i + 1]]) // fan-triangulate falls noetig
  }
}
const N = V.length

// --- Label-Punktwolke aus Original-atlas_labels (host + vertex_indices) ---
const labels = JSON.parse(readFileSync(resolve(here, `work/atlas_labels_${source}.json`)))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))
const hostMap = JSON.parse(readFileSync(resolve(here, 'host_map.json')))
const COMBINED = hostMap.combined_hosts
function hostGeom(hostKey) {
  const m = hostKey.match(/^(left|right)-(.+)$/); const side = m[1], stem = m[2]
  if (COMBINED[stem]) {
    const verts = []
    for (const c of COMBINED[stem]) { const k = `${side}-${c}`; if (hosts[k]) verts.push(...hosts[k].vertices) }
    return { vertices: verts }
  }
  if (!hosts[hostKey]) throw new Error(`hostGeom: Host ${hostKey} fehlt`)
  return hosts[hostKey]
}
const slugs = Object.keys(labels)

// --- TREUE Label-Uebernahme (wissenschaftliche Korrektheit > Glaettung). Jeder registrierte Host-
// Vertex (register_atlas.py) wird per EXAKTEM Positions-Match (×64) auf denselben clean-Mesh-Vertex
// gelegt -> die registrierte Parzellengrenze bleibt 1:1 erhalten. KEINE Pure-Nearest-Zuweisung (die
// ueberstimmte kleine Parzellen -> verschwundene Areale) und KEINE erodierende Relaxation.
const SCALE = 64
const pkey = (p) => `${Math.round(p[0]*SCALE)},${Math.round(p[1]*SCALE)},${Math.round(p[2]*SCALE)}`
const posMap = new Map()
for (let i = 0; i < N; i++) { const k = pkey(V[i]); if (!posMap.has(k)) posMap.set(k, i) }

const vlab = new Int16Array(N).fill(-1)
// 1. Exakter Match mit NEAREST-CENTROID-Aufloesung der Overlaps. Combined-Hosts (ipl/ofc/frontal-pole/
// insula/heschl) speichern in atlas_labels den GANZEN kombinierten Host pro Parzelle -> mehrere Parzellen
// referenzieren dieselben Vertices. First-wins (Slug-Reihenfolge) wuerde dann ganze Sub-Gyri stehlen
// (z.B. inferiorparietal verschluckt supramarginal). Stattdessen: jeder Vertex geht an die Parzelle mit
// dem NAECHSTEN Schwerpunkt = die Within-Host-Partition (register_atlas.py-Methode), zentroid-aligned.
const centroid = slugs.map((slug) => {
  const H = hostGeom(labels[slug].host); const c = [0, 0, 0]; let n = 0
  for (const li of labels[slug].vertex_indices) { const p = H.vertices[li]; if (!p) continue; c[0]+=p[0]; c[1]+=p[1]; c[2]+=p[2]; n++ }
  return n ? [c[0]/n, c[1]/n, c[2]/n] : null
})
const bestDist = new Float64Array(N).fill(Infinity)
slugs.forEach((slug, pi) => {
  const ctr = centroid[pi]; if (!ctr) return
  const H = hostGeom(labels[slug].host)
  for (const li of labels[slug].vertex_indices) {
    const p = H.vertices[li]; if (!p) continue
    const gi = posMap.get(pkey(p)); if (gi === undefined) continue
    const d = (p[0]-ctr[0])**2 + (p[1]-ctr[1])**2 + (p[2]-ctr[2])**2
    if (d < bestDist[gi]) { bestDist[gi] = d; vlab[gi] = pi }
  }
})
// 2. Seed-Garantie: jede registrierte Parzelle MUSS >=1 Vertex behalten (kein Areal verloren).
const present = new Set(); for (let i = 0; i < N; i++) if (vlab[i] >= 0) present.add(vlab[i])
const claimed = new Uint8Array(N)
let seeded = 0
slugs.forEach((slug, pi) => {
  if (present.has(pi)) return
  const H = hostGeom(labels[slug].host)
  for (const li of labels[slug].vertex_indices) {
    const p = H.vertices[li]; if (!p) continue
    const gi = posMap.get(pkey(p)); if (gi === undefined || claimed[gi]) continue
    vlab[gi] = pi; claimed[gi] = 1; seeded++; break
  }
})
// 3. Nearest-Fill NUR fuer unzugeordnete Vertices (echte Luecken) — aus den bereits gelabelten.
const CELL = 6
const grid = new Map()
const gkey = (x, y, z) => `${Math.floor(x/CELL)},${Math.floor(y/CELL)},${Math.floor(z/CELL)}`
for (let i = 0; i < N; i++) { if (vlab[i] < 0) continue; const p = V[i]; const k = gkey(p[0],p[1],p[2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i) }
function nearestLabel(p) {
  let best = -1, bd = Infinity
  for (let r = 1; r <= 14; r++) {
    const cx = Math.floor(p[0]/CELL), cy = Math.floor(p[1]/CELL), cz = Math.floor(p[2]/CELL)
    for (let dx=-r;dx<=r;dx++) for (let dy=-r;dy<=r;dy++) for (let dz=-r;dz<=r;dz++) {
      if (r > 1 && Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz)) !== r) continue
      const cell = grid.get(`${cx+dx},${cy+dy},${cz+dz}`); if (!cell) continue
      for (const j of cell) { const q = V[j]; const d=(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2; if (d<bd){bd=d;best=vlab[j]} }
    }
    if (best !== -1 && r >= 2) break
  }
  return best
}
let filled = 0
for (let i = 0; i < N; i++) if (vlab[i] < 0) { vlab[i] = nearestLabel(V[i]); filled++ }

// --- GRENZ-KONFORMER CUT (splitTri): jedes Mehr-Label-Dreieck wird entlang der Label-Grenze an den
// Kanten-MITTELPUNKTEN in einfarbige Sub-Dreiecke geteilt -> die Arealgrenze wird eine echte, GERADE
// Mesh-Kante (keine Dreiecks-Treppe). T-JUNCTION-FREI per Konstruktion: eine geteilte Kante (P,Q) wird
// von BEIDEN Nachbardreiecken identisch am selben Mittelpunkt geteilt (gleiche per-Vertex-Labels).
// KEIN laplacianSmooth -> Mittelpunkte liegen auf den Original-Kanten = ON-SURFACE (keine Spikes).
// Neue Grenzpunkte werden pro Sub-Dreieck mit dessen Label dupliziert -> harte Farbkante (indexed!).
const outV = V.map((p) => p)
const outLab = Array.from(vlab)
const outF = []
let cutTris = 0, flipped = 0
const crossN = (p, q, r) => { const ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2],vx=r[0]-p[0],vy=r[1]-p[1],vz=r[2]-p[2]; return [uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx] }
for (const [a, b, c] of F) {
  const subs = splitTri(V[a], V[b], V[c], vlab[a], vlab[b], vlab[c])
  if (subs.length === 1) { outF.push([a, b, c]); continue }
  cutTris++
  const corner = { A: a, B: b, C: c }
  // Eltern-Normale (auf dem winding-konsistenten Mesh = nach aussen) als Referenz fuer die Sub-Dreiecke:
  const pn = crossN(V[a], V[b], V[c])
  for (const sub of subs) {
    const tri = sub.verts.map((v) => {
      if (v.tag) return corner[v.tag]
      const gi = outV.length; outV.push(v.pos); outLab.push(sub.label); return gi
    })
    // WINDING-Korrektur: splitTri emittiert manche Sub-Dreiecke gegenlaeufig -> Face-Normale gegen die
    // Eltern-Normale pruefen, ggf. zwei Indizes tauschen (sonst nach innen zeigende Normalen = Shards).
    const sn = crossN(outV[tri[0]], outV[tri[1]], outV[tri[2]])
    if (sn[0]*pn[0] + sn[1]*pn[1] + sn[2]*pn[2] < 0) { const t = tri[1]; tri[1] = tri[2]; tri[2] = t; flipped++ }
    outF.push(tri)
  }
}
const M = outV.length

// --- Normalen: positions-verschweisst, area-gewichtet (auf dem WINDING-konsistenten Mesh via fix_winding.py
// -> alle Faces gleich orientiert -> korrekte, glatte Aussen-Normalen; Cut-Duplikate teilen die Normale). ---
const nrm = weldedNormalsDirectional(outV, outF)

// --- Per-Vertex-Farbe; Grenz-Duplikate tragen je ihr Sub-Dreieck-Label -> harte Kante, keine Interpolation ---
function baseName(s) { return s.replace(/-(l|r)$/, '') }
function hslToRgb(h, s, l) { const k=(n)=>(n+h*12)%12; const a=s*Math.min(l,1-l); const f=(n)=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))); return [f(0),f(8),f(4)] }
const colCache = slugs.map((slug) => { const b=baseName(slug); let hh=0; for (let i=0;i<b.length;i++) hh=(hh*31+b.charCodeAt(i))>>>0; return hslToRgb((hh%360)/360, 0.52, 0.56) })
const vcol = new Float32Array(M * 3)
for (let i = 0; i < M; i++) { const c = outLab[i] >= 0 ? colCache[outLab[i]] : [0.12,0.12,0.12]; vcol[i*3]=c[0]; vcol[i*3+1]=c[1]; vcol[i*3+2]=c[2] }

// --- GLB (indexed, T-junction-frei) + Pick-Sidecar ---
const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene()
const acc = doc.createAccessor().setType('VEC3').setArray(new Float32Array(outV.flat())).setBuffer(buf)
const nac = doc.createAccessor().setType('VEC3').setArray(new Float32Array(nrm.flat())).setBuffer(buf)
const cac = doc.createAccessor().setType('VEC3').setArray(vcol).setBuffer(buf)
const iac = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(outF.flat())).setBuffer(buf)
const prim = doc.createPrimitive().setAttribute('POSITION', acc).setAttribute('NORMAL', nac).setAttribute('COLOR_0', cac).setIndices(iac)
const name = `atlas-surface-${source}`
scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
const outGlb = resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/${name}.glb`)
await new NodeIO().write(outGlb, doc)
writeFileSync(resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/${name}-pick.json`), JSON.stringify({ slugs, vlabels: outLab }))
console.log(`${name}: ${N}->${M} V / ${outF.length} F (${cutTris} Grenz-Dreiecke geschnitten), ${slugs.length} Parzellen (${seeded} seed, ${filled} fill) -> ${outGlb}`)
