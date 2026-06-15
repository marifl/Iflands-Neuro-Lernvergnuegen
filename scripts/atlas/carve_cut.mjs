// Grenz-konformes Re-Meshing: schneidet jedes Dreieck, dessen Vertices verschiedene Atlas-Labels
// tragen, entlang der Label-Grenze (Kanten-Mittelpunkte) in Sub-Dreiecke auf, die JE EIN Label
// tragen. Damit folgt die Arealgrenze echten Mesh-Kanten statt der Dreieck-Treppe -> keine Fransen,
// unabhaengig von der Grundaufloesung. Body bleibt grob, nur die Grenzbaender werden verfeinert.
//
// splitTri ist rein (testbar): gibt Sub-Dreiecke zurueck, deren Ecken entweder eine Original-Ecke
// ('A'|'B'|'C') ODER ein neuer Punkt ({ pos }) sind, plus das Label des Sub-Dreiecks.

function mid(u, v) { return [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2, (u[2] + v[2]) / 2] }
function centroid(a, b, c) { return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3] }

/** Zwei Ecken teilen sich `Ls`, die dritte (`odd`) traegt `Lo`. u,v = geteilte Ecken-Tags, w = odd-Tag. */
function twoOne(uTag, vTag, wTag, uPos, vPos, wPos, Ls, Lo) {
  const mu = mid(uPos, wPos)  // Grenze auf Kante u-w
  const mv = mid(vPos, wPos)  // Grenze auf Kante v-w
  return [
    { verts: [{ tag: wTag }, { pos: mu }, { pos: mv }], label: Lo },     // odd-Spitze
    { verts: [{ tag: uTag }, { tag: vTag }, { pos: mv }], label: Ls },   // geteiltes Quad -> 2 Tris
    { verts: [{ tag: uTag }, { pos: mv }, { pos: mu }], label: Ls },
  ]
}

/**
 * Zerlegt ein Dreieck (Ecken A,B,C mit Labels la,lb,lc) grenz-konform.
 * @returns Array<{ verts: ({tag:'A'|'B'|'C'} | {pos:[x,y,z]})[3], label:number }>
 */
export function splitTri(A, B, C, la, lb, lc) {
  if (la === lb && lb === lc) return [{ verts: [{ tag: 'A' }, { tag: 'B' }, { tag: 'C' }], label: la }]
  if (la === lb) return twoOne('A', 'B', 'C', A, B, C, la, lc) // C odd
  if (lb === lc) return twoOne('B', 'C', 'A', B, C, A, lb, la) // A odd
  if (la === lc) return twoOne('A', 'C', 'B', A, C, B, la, lb) // B odd
  // Drei verschiedene Labels: Y-Knoten -> Mittelpunkte + Zentroid, je Ecke ein Keil.
  const g = centroid(A, B, C)
  const mab = mid(A, B), mbc = mid(B, C), mca = mid(C, A)
  return [
    { verts: [{ tag: 'A' }, { pos: mab }, { pos: g }], label: la },
    { verts: [{ tag: 'A' }, { pos: g }, { pos: mca }], label: la },
    { verts: [{ tag: 'B' }, { pos: mbc }, { pos: g }], label: lb },
    { verts: [{ tag: 'B' }, { pos: g }, { pos: mab }], label: lb },
    { verts: [{ tag: 'C' }, { pos: mca }, { pos: g }], label: lc },
    { verts: [{ tag: 'C' }, { pos: g }, { pos: mbc }], label: lc },
  ]
}

/** Flaeche eines Dreiecks (zum Test der Flaechen-Erhaltung). */
export function triArea(p, q, r) {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2]
  const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2]
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx
  return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz)
}

/** Loest ein Sub-Dreieck-Vertex zu einer konkreten Position auf (Original-Ecke oder neuer Punkt). */
export function resolvePos(v, A, B, C) {
  if (v.pos) return v.pos
  return v.tag === 'A' ? A : v.tag === 'B' ? B : C
}
