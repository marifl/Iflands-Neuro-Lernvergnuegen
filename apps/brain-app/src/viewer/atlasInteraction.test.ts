import { describe, expect, it } from 'vitest'
import { BufferGeometry, Mesh, MeshBasicMaterial, Plane, Vector3 } from 'three'
import type { Intersection } from 'three'
import { ATLAS_SURFACE_FLAG } from './atlasParcels'
import { pickFirstAtlasHit } from './atlasInteraction'

const geom = new BufferGeometry()

function atlasHit(point: Vector3, material?: MeshBasicMaterial): Intersection {
  const mesh = new Mesh(geom, material ?? new MeshBasicMaterial())
  mesh.visible = true
  mesh.userData[ATLAS_SURFACE_FLAG] = true
  return { object: mesh, point, distance: 0, face: null, faceIndex: 0 } as Intersection
}

function plainHit(point: Vector3): Intersection {
  const mesh = new Mesh(geom, new MeshBasicMaterial())
  mesh.visible = true
  return { object: mesh, point, distance: 0, face: null, faceIndex: 0 } as Intersection
}

describe('pickFirstAtlasHit', () => {
  it('nimmt den ersten sichtbaren Atlas-Treffer', () => {
    const firstAtlas = atlasHit(new Vector3(0, 0, 0))
    expect(pickFirstAtlasHit([plainHit(new Vector3(0, 0, 0)), firstAtlas])?.object).toBe(firstAtlas.object)
  })

  it('ueberspringt Atlas-Treffer auf der geclippten Seite', () => {
    const plane = new Plane(new Vector3(-1, 0, 0), 10)
    const clipped = atlasHit(new Vector3(20, 0, 0), new MeshBasicMaterial({ clippingPlanes: [plane] }))
    const visible = atlasHit(new Vector3(5, 0, 0), new MeshBasicMaterial({ clippingPlanes: [plane] }))
    expect(pickFirstAtlasHit([clipped, visible])?.object).toBe(visible.object)
  })
})
