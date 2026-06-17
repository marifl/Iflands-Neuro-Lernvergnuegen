import { describe, expect, it } from 'vitest'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, Plane, Raycaster, Vector3 } from 'three'
import type { Intersection } from 'three'
import { ATLAS_SURFACE_FLAG } from './atlasParcels'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { isClippedRaycastHit, pickAtActiveCutPlanes, pickFirstSurfaceHit } from './cutPick'
import { sequenceTargetUserData } from './targetPicking'

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

  it('akzeptiert pickbare SequenceTargetRef-Meshes ohne zweiten Pickpfad', () => {
    const part = new Mesh(testGeom, new MeshBasicMaterial())
    part.visible = true
    part.userData = sequenceTargetUserData({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    })

    expect(pickFirstSurfaceHit([hit(part, new Vector3(0, 0, 0))])?.object).toBe(part)
  })
})

describe('pickAtActiveCutPlanes', () => {
  it('liefert fuer Atlas-Carve-Caps einen Treffer mit Face fuer Vertex-Label-Picking', () => {
    const geom = new BufferGeometry()
    geom.setAttribute('position', new Float32BufferAttribute([
      0, -1, -1,
      0, 1, -1,
      0, 0, 1,
    ], 3))
    geom.computeBoundingBox()
    const atlas = new Mesh(geom, new MeshBasicMaterial({
      side: DoubleSide,
      clippingPlanes: [new Plane(new Vector3(1, 0, 0), 0)],
    }))
    atlas.visible = true
    atlas.userData[ATLAS_SURFACE_FLAG] = true

    const raycaster = new Raycaster(new Vector3(1, 0, 0), new Vector3(-1, 0, 0))
    const picked = pickAtActiveCutPlanes(
      raycaster,
      [new Plane(new Vector3(1, 0, 0), 0)],
      [atlas],
    )

    expect(picked?.object).toBe(atlas)
    expect(picked?.face).not.toBeNull()
  })
})
