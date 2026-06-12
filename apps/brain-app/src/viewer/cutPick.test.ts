import { describe, expect, it } from 'vitest'
import { BufferGeometry, Mesh, MeshBasicMaterial, Plane, Vector3 } from 'three'
import type { Intersection } from 'three'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { isClippedRaycastHit, pickFirstSurfaceHit } from './cutPick'

const testGeom = new BufferGeometry()

function hit(mesh: Mesh, point: Vector3): Intersection {
  return { object: mesh, point, distance: 0, face: null, faceIndex: 0 } as Intersection
}

function source(material?: MeshBasicMaterial): Mesh {
  const mesh = new Mesh(testGeom, material ?? new MeshBasicMaterial())
  mesh.visible = true
  mesh.userData[CUT_SOURCE_FLAG] = true
  return mesh
}

describe('isClippedRaycastHit', () => {
  it('akzeptiert Treffer ohne clippingPlanes', () => {
    expect(isClippedRaycastHit(hit(source(), new Vector3(0, 0, 0)))).toBe(true)
  })

  it('verwirft Treffer auf der geclippten Seite, akzeptiert die sichtbare Seite', () => {
    const plane = new Plane(new Vector3(-1, 0, 0), 10)
    const mesh = source(new MeshBasicMaterial({ clippingPlanes: [plane] }))
    expect(isClippedRaycastHit(hit(mesh, new Vector3(20, 0, 0)))).toBe(false)
    expect(isClippedRaycastHit(hit(mesh, new Vector3(5, 0, 0)))).toBe(true)
  })

  it('verwirft unsichtbare Meshes und Cap-Helfer', () => {
    const invisible = source()
    invisible.visible = false
    expect(isClippedRaycastHit(hit(invisible, new Vector3(0, 0, 0)))).toBe(false)

    const cap = source()
    cap.userData[CUT_CAP_HELPER_FLAG] = true
    expect(isClippedRaycastHit(hit(cap, new Vector3(0, 0, 0)))).toBe(false)
  })
})

describe('pickFirstSurfaceHit', () => {
  it('ueberspringt geclippte Treffer und nimmt den naechsten gueltigen', () => {
    const plane = new Plane(new Vector3(-1, 0, 0), 10)
    const outer = source(new MeshBasicMaterial({ clippingPlanes: [plane] }))
    const inner = source()
    const picked = pickFirstSurfaceHit([
      hit(outer, new Vector3(20, 0, 0)),
      hit(inner, new Vector3(0, 0, 0)),
    ])
    expect(picked?.object).toBe(inner)
  })

  it('ueberspringt Meshes ohne CUT_SOURCE_FLAG (z.B. TampingIron/SubParcels)', () => {
    const nonSource = new Mesh(testGeom, new MeshBasicMaterial())
    nonSource.visible = true
    const validSource = source()
    const picked = pickFirstSurfaceHit([
      hit(nonSource, new Vector3(0, 0, 0)),
      hit(validSource, new Vector3(1, 0, 0)),
    ])
    expect(picked?.object).toBe(validSource)
  })

  it('liefert null wenn kein gueltiger Treffer existiert', () => {
    const nonSource = new Mesh(testGeom, new MeshBasicMaterial())
    nonSource.visible = true
    expect(pickFirstSurfaceHit([hit(nonSource, new Vector3(0, 0, 0))])).toBeNull()
  })
})
