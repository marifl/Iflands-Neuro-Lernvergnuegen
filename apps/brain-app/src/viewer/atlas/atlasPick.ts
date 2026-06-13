// SPIKE-Vereinfachung: nimmt den ersten Face-Vertex. An Arealgrenzen koennen die 3 Ecken
// verschiedene Labels haben -> Phase 2: getroffene Ecke per Baryzentrik (intersection.face a/b/c) waehlen.
/** Label des ersten Vertex eines Faces (faceIndex -> Vertex faces[3*faceIndex] -> labelArray). */
export function faceToLabel(faces: Uint32Array, labels: Int16Array, faceIndex: number): number {
  const v0 = faces[faceIndex * 3]
  return labels[v0]
}
