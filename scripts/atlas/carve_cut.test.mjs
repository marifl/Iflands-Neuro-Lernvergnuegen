import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitTri, triArea, resolvePos } from './carve_cut.mjs'

const A = [0, 0, 0], B = [2, 0, 0], C = [0, 2, 0]
const area = (subs) => subs.reduce((s, t) => {
  const [p, q, r] = t.verts.map((v) => resolvePos(v, A, B, C))
  return s + triArea(p, q, r)
}, 0)
const base = triArea(A, B, C)

test('einheitliches Dreieck bleibt ungeschnitten', () => {
  const subs = splitTri(A, B, C, 5, 5, 5)
  assert.equal(subs.length, 1)
  assert.deepEqual(subs[0].verts.map((v) => v.tag), ['A', 'B', 'C'])
  assert.equal(subs[0].label, 5)
})

test('2-1-Schnitt: 3 Sub-Dreiecke, je ein Label, Flaeche erhalten', () => {
  const subs = splitTri(A, B, C, 1, 1, 2) // C ist odd
  assert.equal(subs.length, 3)
  // genau ein Sub-Tri traegt das odd-Label 2, zwei tragen 1.
  assert.equal(subs.filter((s) => s.label === 2).length, 1)
  assert.equal(subs.filter((s) => s.label === 1).length, 2)
  // jedes Sub-Tri ist einfarbig (per Konstruktion) + Flaeche bleibt erhalten.
  assert.ok(Math.abs(area(subs) - base) < 1e-9, 'Flaechen-Summe == Original')
})

test('2-1-Schnitt deckt alle drei odd-Positionen ab', () => {
  for (const [la, lb, lc, odd] of [[1, 1, 2, 2], [2, 1, 1, 2], [1, 2, 1, 2]]) {
    const subs = splitTri(A, B, C, la, lb, lc)
    assert.equal(subs.length, 3)
    assert.equal(subs.filter((s) => s.label === odd).length, 1)
    assert.ok(Math.abs(area(subs) - base) < 1e-9)
  }
})

test('Y-Knoten (drei Labels): 6 Sub-Dreiecke, je Label zwei, Flaeche erhalten', () => {
  const subs = splitTri(A, B, C, 1, 2, 3)
  assert.equal(subs.length, 6)
  for (const lab of [1, 2, 3]) assert.equal(subs.filter((s) => s.label === lab).length, 2)
  assert.ok(Math.abs(area(subs) - base) < 1e-9, 'Flaechen-Summe == Original')
})

test('neue Grenzpunkte liegen auf den Kanten-Mittelpunkten', () => {
  const subs = splitTri(A, B, C, 1, 1, 2)
  const oddTri = subs.find((s) => s.label === 2)
  const pts = oddTri.verts.filter((v) => v.pos).map((v) => v.pos)
  // Kanten A-C Mittelpunkt [0,1,0], B-C Mittelpunkt [1,1,0].
  const has = (p) => pts.some((q) => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9)
  assert.ok(has([0, 1, 0]) && has([1, 1, 0]), 'Mittelpunkte A-C und B-C vorhanden')
})

import { laplacianSmooth } from './carve_cut.mjs'

test('laplacianSmooth begradigt eine Zickzack-Polylinie (Pfad wird kuerzer)', () => {
  // 5 Knoten auf einer Linie, der mittlere ausgelenkt -> Glaettung zieht ihn zur Linie.
  const pos = [[0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0], [4, 0, 0]]
  const nbr = [[1], [0, 2], [1, 3], [2, 4], [3]]
  const pathLen = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]), 0)
  const before = pathLen(pos)
  const after = pathLen(laplacianSmooth(pos, nbr, 3, 0.5))
  assert.ok(after < before, `Pfad kuerzer: ${after} < ${before}`)
})

test('laplacianSmooth: gepinnte Endpunkte (leere Nachbarn) bleiben fix, Mitte glaettet', () => {
  const pos = [[0, 0, 0], [1, 1, 0], [2, 0, 0], [3, 1, 0], [4, 0, 0]]
  const nbr = [[], [0, 2], [1, 3], [2, 4], []] // Enden gepinnt
  const out = laplacianSmooth(pos, nbr, 5, 0.5)
  assert.deepEqual(out[0], [0, 0, 0])
  assert.deepEqual(out[4], [4, 0, 0])
  assert.ok(Math.abs(out[1][1]) < 1, 'Mitte zur Linie gezogen (y < Ausgangs-1)')
})
