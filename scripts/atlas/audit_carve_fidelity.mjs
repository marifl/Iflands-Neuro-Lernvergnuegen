// Audit: Gibt die Carve-Bake (Nearest+Relax auf clean-Mesh) die REGISTRIERTEN atlas_labels treu wieder?
// Vergleicht pro Parzelle: registrierte Host-Positionen (register_atlas.py ground truth) vs. die Carve-
// Vertices, die mein Bake dieser Parzelle zugewiesen hat. Findet: fehlende/erodierte Areale, Zentroid-
// Drift (Verschiebung), Ballooning. Aufruf: node work/audit_carve_fidelity.mjs <julich|dkt|brodmann>
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2] || 'julich'

const labels = JSON.parse(readFileSync(resolve(here, `work/atlas_labels_${source}.json`)))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))
const hostMap = JSON.parse(readFileSync(resolve(here, 'host_map.json')))
const COMBINED = hostMap.combined_hosts
function hostGeom(hostKey) {
  const m = hostKey.match(/^(left|right)-(.+)$/); const side = m[1], stem = m[2]
  if (COMBINED[stem]) { const verts = []; for (const c of COMBINED[stem]) { const k = `${side}-${c}`; if (hosts[k]) verts.push(...hosts[k].vertices) } return { vertices: verts } }
  return hosts[hostKey]
}
const cen = (pts) => { const c=[0,0,0]; for (const p of pts){c[0]+=p[0];c[1]+=p[1];c[2]+=p[2]} const n=pts.length||1; return [c[0]/n,c[1]/n,c[2]/n] }
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])

// registrierte Positionen je Parzelle
const slugs = Object.keys(labels)
const regPts = {}
for (const slug of slugs) {
  const H = hostGeom(labels[slug].host); const pts = []
  for (const li of labels[slug].vertex_indices) { const p = H.vertices[li]; if (p) pts.push(p) }
  regPts[slug] = pts
}

// Carve-Vertices je Parzelle: vlab auf dem clean-Mesh SELBST berechnen (identische Zuweisung wie
// bake_carve: exakt-Match + Nearest-Centroid-Overlap + Seed + Nearest-Fill) — self-contained, unabhaengig
// vom Cut/pick.json (das nach dem splitTri-Cut pro Cut-Vertex, nicht pro clean-Vertex zaehlt).
const obj = readFileSync(resolve(here, 'work/taro_cortex_clean.obj'), 'utf8')
const V = []
for (const l of obj.split('\n')) if (l[0]==='v'&&l[1]===' ') { const p=l.slice(2).trim().split(/\s+/).map(Number); V.push([p[0],p[1],p[2]]) }
const N = V.length
const SCALE = 64, pk = (p) => `${Math.round(p[0]*SCALE)},${Math.round(p[1]*SCALE)},${Math.round(p[2]*SCALE)}`
const posMap = new Map(); for (let i=0;i<N;i++){ const k=pk(V[i]); if(!posMap.has(k)) posMap.set(k,i) }
const vlab = new Int16Array(N).fill(-1)
const ctrOf = slugs.map((s)=>{ const c=cen(regPts[s]); return regPts[s].length?c:null })
const bestD = new Float64Array(N).fill(Infinity)
slugs.forEach((slug,pi)=>{ const ctr=ctrOf[pi]; if(!ctr)return; const H=hostGeom(labels[slug].host); for(const li of labels[slug].vertex_indices){ const p=H.vertices[li]; if(!p)continue; const gi=posMap.get(pk(p)); if(gi===undefined)continue; const d=(p[0]-ctr[0])**2+(p[1]-ctr[1])**2+(p[2]-ctr[2])**2; if(d<bestD[gi]){bestD[gi]=d;vlab[gi]=pi} } })
const present=new Set(); for(let i=0;i<N;i++) if(vlab[i]>=0) present.add(vlab[i])
const claimed=new Uint8Array(N)
slugs.forEach((slug,pi)=>{ if(present.has(pi))return; const H=hostGeom(labels[slug].host); for(const li of labels[slug].vertex_indices){ const p=H.vertices[li]; if(!p)continue; const gi=posMap.get(pk(p)); if(gi===undefined||claimed[gi])continue; vlab[gi]=pi;claimed[gi]=1;break } })
const CELL=6, grid=new Map(), gk=(x,y,z)=>`${Math.floor(x/CELL)},${Math.floor(y/CELL)},${Math.floor(z/CELL)}`
for(let i=0;i<N;i++){ if(vlab[i]<0)continue; const p=V[i]; const k=gk(p[0],p[1],p[2]); if(!grid.has(k))grid.set(k,[]); grid.get(k).push(i) }
function nearest(p){ let best=-1,bd=Infinity; for(let r=1;r<=14;r++){ const cx=Math.floor(p[0]/CELL),cy=Math.floor(p[1]/CELL),cz=Math.floor(p[2]/CELL); for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)for(let dz=-r;dz<=r;dz++){ if(r>1&&Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))!==r)continue; const cell=grid.get(`${cx+dx},${cy+dy},${cz+dz}`); if(!cell)continue; for(const j of cell){ const q=V[j]; const d=(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2; if(d<bd){bd=d;best=vlab[j]} } } if(best!==-1&&r>=2)break } return best }
for(let i=0;i<N;i++) if(vlab[i]<0) vlab[i]=nearest(V[i])
const carvePts = {}; for (const s of slugs) carvePts[s] = []
for (let i=0;i<N;i++){ const pi=vlab[i]; if(pi>=0) carvePts[slugs[pi]].push(V[i]) }

// Vergleich
let missing=[], drift=[], eroded=[], ok=0
for (const slug of slugs) {
  const reg = regPts[slug], cv = carvePts[slug] || []
  if (reg.length === 0) continue // registriert leer -> nicht meine Schuld
  if (cv.length === 0) { missing.push({slug, regN: reg.length}); continue }
  const d = dist(cen(reg), cen(cv))
  const ratio = cv.length / reg.length
  if (d > 8) drift.push({slug, drift_mm: +d.toFixed(1), regN: reg.length, carveN: cv.length})
  if (ratio < 0.25) eroded.push({slug, ratio: +ratio.toFixed(2), regN: reg.length, carveN: cv.length})
  if (d <= 8 && ratio >= 0.25) ok++
}
console.log(`=== ${source}: ${slugs.length} Parzellen ===`)
console.log(`OK (Drift<=8mm & nicht erodiert): ${ok}`)
console.log(`\nFEHLEND im Carve (registriert, aber 0 Carve-Vertices): ${missing.length}`)
for (const m of missing.slice(0,30)) console.log("  ", m.slug, "regN", m.regN)
console.log(`\nZENTROID-DRIFT >8mm (verschoben): ${drift.length}`)
for (const d of drift.sort((a,b)=>b.drift_mm-a.drift_mm).slice(0,20)) console.log("  ", d.slug, d.drift_mm+"mm", `reg${d.regN}/carve${d.carveN}`)
console.log(`\nErodiert (Carve < 25% der reg-Groesse): ${eroded.length}`)
for (const e of eroded.sort((a,b)=>a.ratio-b.ratio).slice(0,20)) console.log("  ", e.slug, e.ratio, `reg${e.regN}/carve${e.carveN}`)
