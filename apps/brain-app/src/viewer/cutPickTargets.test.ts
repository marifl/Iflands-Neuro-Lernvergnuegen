import { describe, expect, it } from 'vitest'
import { BufferGeometry, Group, Mesh, MeshBasicMaterial, Plane, Vector3 } from 'three'
import { CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'
import { ATLAS_SURFACE_FLAG } from './atlasParcels'
import { createCutPickTargetCache, isCutCapSource } from './cutPickTargets'
import { sequenceTargetUserData } from './targetPicking'

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

  it('nimmt Atlas-Carve-Meshes nur mit aktiver Clipping-Plane als Cap-Source auf', () => {
    const root = new Group()
    const unclipped = mesh('atlas-unclipped')
    unclipped.userData[ATLAS_SURFACE_FLAG] = true
    const clipped = mesh('atlas-clipped')
    clipped.userData[ATLAS_SURFACE_FLAG] = true
    clipped.material = new MeshBasicMaterial({ clippingPlanes: [new Plane(new Vector3(1, 0, 0), 0)] })
    root.add(unclipped, clipped)

    const targets = createCutPickTargetCache(root).get()

    expect(targets.raycastTargets).toEqual([unclipped, clipped])
    expect(targets.cutSources).toEqual([clipped])
  })

  it('nutzt Atlas-Cap-Proxies nur fuer Render-Caps und behaelt das Original als Pick-Quelle', () => {
    const original = mesh('atlas-original')
    original.userData[ATLAS_SURFACE_FLAG] = true
    original.userData.atlasCapProxyOwner = true
    original.material = new MeshBasicMaterial({ clippingPlanes: [new Plane(new Vector3(1, 0, 0), 0)] })

    const proxy = mesh('atlas-area-proxy')
    proxy.userData.atlasCapSource = true
    proxy.material = new MeshBasicMaterial({ clippingPlanes: [new Plane(new Vector3(1, 0, 0), 0)] })

    const root = new Group()
    root.add(original, proxy)

    expect(isCutCapSource(original)).toBe(false)
    expect(isCutCapSource(proxy)).toBe(true)
    expect(createCutPickTargetCache(root).get()).toEqual({
      raycastTargets: [original],
      cutSources: [original],
    })
  })

  it('nimmt pickbare SequenceTargetRef-Meshes in denselben Raycast-Pfad auf', () => {
    const root = new Group()
    const part = mesh('target:asset-part:device-eeg-10-20:eeg-cap-01:electrode-fz')
    part.userData = sequenceTargetUserData({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'electrode-fz',
    })
    const helper = mesh('target:asset-part:device-eeg-10-20:eeg-cap-01:alignment-helper-ring')
    helper.userData = sequenceTargetUserData({
      targetKind: 'asset-part',
      collectionId: 'device-eeg-10-20',
      instanceId: 'eeg-cap-01',
      partId: 'alignment-helper-ring',
    }, false)
    root.add(part, helper)

    expect(createCutPickTargetCache(root).get()).toEqual({
      raycastTargets: [part],
      cutSources: [part],
    })
  })
})
