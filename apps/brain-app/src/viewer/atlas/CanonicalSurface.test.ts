import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { pickCanonicalSurfaceVertex } from './CanonicalSurface'

describe('pickCanonicalSurfaceVertex', () => {
  it('picks the nearest face corner in local mesh coordinates', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0,
      4, 0, 0,
      0, 4, 0,
    ]), 3))
    const mesh = new THREE.Mesh(geometry)
    mesh.position.set(5, 0, 0)
    mesh.updateMatrixWorld(true)

    expect(pickCanonicalSurfaceVertex(mesh, new THREE.Vector3(8.8, 0.1, 0), { a: 0, b: 1, c: 2 })).toBe(1)
  })

  it('ignores pointer events without a face', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry())

    expect(pickCanonicalSurfaceVertex(mesh, new THREE.Vector3(), null)).toBeNull()
  })
})
