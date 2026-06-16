import { describe, expect, it } from 'vitest'
import { BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { ATLAS_SURFACE_FLAG } from './atlasParcels'
import { createCutPickTargetCache } from './cutPickTargets'

const geometry = new BufferGeometry()

function mesh(name: string): Mesh {
  const m = new Mesh(geometry, new MeshBasicMaterial())
  m.name = name
  return m
}

describe('createCutPickTargetCache', () => {
  it('traversiert die Szene nur wenn der Cache dirty ist', () => {
    const root = new Group()
    const source = mesh('source')
    source.userData[CUT_SOURCE_FLAG] = true
    const atlas = mesh('atlas')
    atlas.userData[ATLAS_SURFACE_FLAG] = true
    const helper = mesh('helper')
    helper.userData[CUT_CAP_HELPER_FLAG] = true
    root.add(source, atlas, helper)

    let traversals = 0
    const traverse = root.traverse.bind(root)
    root.traverse = (callback) => {
      traversals += 1
      traverse(callback)
    }

    const cache = createCutPickTargetCache(root)
    const first = cache.get()
    const second = cache.get()

    expect(traversals).toBe(1)
    expect(second).toBe(first)
    expect(first.raycastTargets).toEqual([source, atlas])
    expect(first.cutSources).toEqual([source])

    cache.markDirty()
    expect(cache.get()).not.toBe(first)
    expect(traversals).toBe(2)
  })
})
