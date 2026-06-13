// SPIKE-Vereinfachung: nimmt den ersten Face-Vertex. An Arealgrenzen koennen die 3 Ecken
// verschiedene Labels haben -> Phase 2: getroffene Ecke per Baryzentrik (intersection.face a/b/c) waehlen.
/** Label des ersten Vertex eines Faces (faceIndex -> Vertex faces[3*faceIndex] -> labelArray). */
export function faceToLabel(faces: Uint32Array, labels: Int16Array, faceIndex: number): number {
  const v0 = faces[faceIndex * 3]
  return labels[v0]
}

/** Index der dem Punkt naechsten der drei Face-Ecken (a/b/c) — quadratische Distanz. */
export function nearestCornerVertex(
  positions: Float32Array, a: number, b: number, c: number, point: [number, number, number],
): number {
  let best = a, bestD = Infinity
  for (const v of [a, b, c]) {
    const dx = positions[v * 3] - point[0], dy = positions[v * 3 + 1] - point[1], dz = positions[v * 3 + 2] - point[2]
    const d = dx * dx + dy * dy + dz * dz
    if (d < bestD) { bestD = d; best = v }
  }
  return best
}
