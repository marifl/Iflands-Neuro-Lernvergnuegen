import * as THREE from 'three'

/** Blickrichtung (Kamera -> Ziel) je benanntem Shot. Viewer-Raum: +X links, +Y superior, +Z anterior. */
export const CAMERA_DIRECTIONS: Record<string, [number, number, number]> = {
  'lateral-left': [1, 0, 0],
  'lateral-right': [-1, 0, 0],
  anterior: [0, 0, 1],
  'medial-midline': [1, 0, 0.15],
  superior: [0, 1, 0.001],
}

export function directionVec(name: string): THREE.Vector3 {
  const d = CAMERA_DIRECTIONS[name]
  if (!d) throw new Error(`cameraPresets: unbekannter Shot: ${name}`)
  return new THREE.Vector3(...d).normalize()
}
