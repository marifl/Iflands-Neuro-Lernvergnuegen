import { describe, expect, it } from 'vitest'
import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three'
import { parcelColor } from './atlasParcels'
import { buildAtlasCapProxyBundle } from './atlasCapProxies'

describe('buildAtlasCapProxyBundle', () => {
  it('splittet ein gelabeltes Atlas-Mesh in farbige Cap-Proxies pro Areal', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      2, 0, 0,
      3, 0, 0,
      2, 1, 0,
    ], 3))
    geometry.setIndex([0, 1, 2, 3, 4, 5])
    const source = new Mesh(geometry, new MeshBasicMaterial())

    const bundle = buildAtlasCapProxyBundle(source, {
      slugs: ['area-44-l', 'area-45-l'],
      vlabels: Int16Array.from([0, 0, 0, 1, 1, 1]),
    })

    expect(source.userData.atlasCapProxyOwner).toBe(true)
    expect(bundle.meshes.map((m) => m.name)).toEqual(['area-44-l', 'area-45-l'])
    expect(bundle.meshes.every((m) => m.userData.atlasCapSource === true)).toBe(true)
    expect(bundle.meshes.map((m) => (m.geometry.getAttribute('position') as Float32BufferAttribute).count)).toEqual([3, 3])
    expect(bundle.materials.map((m) => (m as MeshBasicMaterial).color.getHexString())).toEqual([
      new Color(parcelColor('area-44-l')).getHexString(),
      new Color(parcelColor('area-45-l')).getHexString(),
    ])

    bundle.dispose()
    expect(source.userData.atlasCapProxyOwner).toBeUndefined()
  })
})
