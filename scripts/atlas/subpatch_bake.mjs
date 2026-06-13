// Geteilte Sub-Patch-Geometrie fuer build_subparcels.mjs + bake_julich_runtime.mjs.
// Zwei Qualitaets-Bausteine, damit die Patches wie die TARO-Gyri aussehen (gleiche Dichte,
// glatt, lueckenlos) statt facettiert + ausgefranst:
//   1. computeVertexNormals — glatte, flaechen-gewichtete Vertex-Normalen auf dem VOLLEN Host-Mesh.
//      Jeder Patch-Vertex erbt die Host-Normale -> identisches Shading wie der Gyrus, keine Naht.
//   2. assignFacesByOwner — weist jede Host-Face GENAU einer Parzelle zu (Mehrheit der Eck-Owner).
//      Partition-Hosts (Owner deckt ~alle Host-Vertices) werden so lueckenlos gekachelt; der fruehere
//      strikte "alle 3 Ecken gleich"-Filter verwarf ~19% der Grenz-Faces -> schwarze Risse.
//      Absolute-Hosts (duenner Threshold-Subset, z.B. sma/accumbens) behalten den strikten Filter,
//      damit ihr Extent unveraendert bleibt.

/** Flaechen-gewichtete glatte Vertex-Normalen (wie THREE.computeVertexNormals). */
export function computeVertexNormals(vertices, faces) {
  const nrm = Array.from({ length: vertices.length }, () => [0, 0, 0])
  for (const f of faces) {
    const a = vertices[f[0]], b = vertices[f[1]], c = vertices[f[2]]
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
    // Kreuzprodukt = 2*Flaeche * Flaechennormale -> automatisch flaechen-gewichtet.
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx
    for (const vi of f) { nrm[vi][0] += cx; nrm[vi][1] += cy; nrm[vi][2] += cz }
  }
  for (const v of nrm) {
    const L = Math.hypot(v[0], v[1], v[2]) || 1
    v[0] /= L; v[1] /= L; v[2] /= L
  }
  return nrm
}

/**
 * Owner-Map vertexIndex -> slug aus den vertex_indices aller Slugs eines Hosts.
 * Bei Within-Host-Partition sind die Sets disjunkt; bei absolute-Slugs nur der Threshold-Subset.
 */
export function ownerMap(slugLabels) {
  const owner = new Map()
  for (const [slug, indices] of slugLabels) for (const vi of indices) owner.set(vi, slug)
  return owner
}

/**
 * Kachelt eine Partition-Gruppe: weist jede Host-Face dem Slug zu, der die MEHRHEIT (>=2) ihrer
 * Ecken besitzt. Faces ohne >=2-Mehrheit (duenner Aussenrand gegen NICHT-Gruppen-Areale, seltene
 * Tripelpunkte) werden gedroppt. Liefert Map slug -> Faces (Host-Indizes).
 * - Voll deckende Gruppe (rostral/caudal ACC, pars*, OFC, GPi/GPe): ~100% gekachelt, nur
 *   Tripelpunkt-Faces fallen weg (vernachlaessigbar).
 * - Teil-Gruppe (DLPFC ohne Praemotor 6d3): Innen-Grenzen gekachelt, gegen ausgeschlossene Areale
 *   bleibt ein duenner gedimmter Rand (korrekt — Praemotor wird nicht gefaerbt).
 */
export function assignFacesByOwner(faces, owner, slugs) {
  const out = new Map(slugs.map((s) => [s, []]))
  for (const f of faces) {
    const o0 = owner.get(f[0]), o1 = owner.get(f[1]), o2 = owner.get(f[2])
    let w
    if (o0 && (o0 === o1 || o0 === o2)) w = o0
    else if (o1 && o1 === o2) w = o1
    if (w) out.get(w).push(f)
  }
  return out
}

/** Patch aus Host-Faces: behaltene Vertices + Normalen re-indizieren. */
export function buildPatch(hostVerts, hostNormals, faces) {
  const remap = new Map()
  const verts = [], norms = []
  for (const f of faces) for (const vi of f) {
    if (!remap.has(vi)) { remap.set(vi, verts.length); verts.push(hostVerts[vi]); norms.push(hostNormals[vi]) }
  }
  const idx = faces.map((f) => [remap.get(f[0]), remap.get(f[1]), remap.get(f[2])])
  return { verts, norms, faces: idx }
}

/** Centroid/BBox/Sphere im build_subparcels-Format (fuer structure-coords.json). */
export function patchCoords(verts) {
  let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity
  let sx = 0, sy = 0, sz = 0
  for (const [x, y, z] of verts) {
    if (x < mnx) mnx = x; if (x > mxx) mxx = x
    if (y < mny) mny = y; if (y > mxy) mxy = y
    if (z < mnz) mnz = z; if (z > mxz) mxz = z
    sx += x; sy += y; sz += z
  }
  const n = verts.length
  const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2, cz = (mnz + mxz) / 2
  let maxR = 0
  for (const [x, y, z] of verts) {
    const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2)
    if (r > maxR) maxR = r
  }
  return {
    centroid: [+(sx / n).toFixed(3), +(sy / n).toFixed(3), +(sz / n).toFixed(3)],
    bbox: { min: [+mnx.toFixed(3), +mny.toFixed(3), +mnz.toFixed(3)], max: [+mxx.toFixed(3), +mxy.toFixed(3), +mxz.toFixed(3)] },
    sphere: +maxR.toFixed(3),
  }
}
