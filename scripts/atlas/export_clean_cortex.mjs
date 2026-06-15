// Wave 1: Merged TARO-Kortex als sauberes, positions-verschweisstes Manifold -> OBJ.
// Quelle: work/taro_cortex_hosts.json (alle Host-Gyri). Faces werden ueber posMap auf je EINEN
// Repraesentanten pro ×64-Position remappt (Naht-Duplikate kollabieren) -> Eingang fuer Blender-Remesh.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const hosts = JSON.parse(readFileSync(resolve(here, 'work/taro_cortex_hosts.json')))

const SCALE = 64
const pkey = (p) => `${Math.round(p[0] * SCALE)},${Math.round(p[1] * SCALE)},${Math.round(p[2] * SCALE)}`

// 1. roh mergen
const rawV = [], rawF = []
for (const hk of Object.keys(hosts)) {
  const H = hosts[hk]; const off = rawV.length
  for (const v of H.vertices) rawV.push(v)
  for (const f of H.faces) rawF.push([f[0] + off, f[1] + off, f[2] + off])
}

// 2. Positions-Weld: je Position ein Repraesentant; Faces remappen; degenerierte (kollabierte) Faces droppen
const rep = new Map(), repPos = []
const remap = new Int32Array(rawV.length)
for (let i = 0; i < rawV.length; i++) {
  const k = pkey(rawV[i]); let id = rep.get(k)
  if (id === undefined) { id = repPos.length; rep.set(k, id); repPos.push(rawV[i]) }
  remap[i] = id
}
const outF = []
let dropped = 0
for (const [a, b, c] of rawF) {
  const A = remap[a], B = remap[b], C = remap[c]
  if (A === B || B === C || A === C) { dropped++; continue }
  outF.push([A, B, C])
}

// 3. Manifold-Verify (offene + non-manifold Kanten)
const ek = (a, b) => a < b ? `${a},${b}` : `${b},${a}`
const ec = new Map()
for (const [a, b, c] of outF) for (const [x, y] of [[a, b], [b, c], [c, a]]) ec.set(ek(x, y), (ec.get(ek(x, y)) || 0) + 1)
let open = 0, nonman = 0
for (const [, n] of ec) { if (n === 1) open++; if (n > 2) nonman++ }

// 4. OBJ schreiben (1-indexed)
const lines = [`# clean merged TARO cortex: ${repPos.length} verts, ${outF.length} tris`]
for (const p of repPos) lines.push(`v ${p[0]} ${p[1]} ${p[2]}`)
for (const f of outF) lines.push(`f ${f[0] + 1} ${f[1] + 1} ${f[2] + 1}`)
const outPath = resolve(here, 'work/taro_cortex_clean.obj')
writeFileSync(outPath, lines.join('\n'))

console.log(`roh: ${rawV.length} V / ${rawF.length} F`)
console.log(`clean: ${repPos.length} V / ${outF.length} F  (${dropped} degenerierte Faces gedroppt)`)
console.log(`offene Kanten: ${open}, non-manifold (>2 Tris): ${nonman}`)
console.log(`-> ${outPath}`)
