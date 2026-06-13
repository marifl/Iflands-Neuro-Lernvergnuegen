/** Label des ersten Vertex eines Faces (faceIndex -> Vertex faces[3*faceIndex] -> labelArray). */
export function faceToLabel(faces: Uint32Array, labels: Int16Array, faceIndex: number): number {
  const v0 = faces[faceIndex * 3]
  return labels[v0]
}
