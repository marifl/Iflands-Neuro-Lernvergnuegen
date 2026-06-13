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
