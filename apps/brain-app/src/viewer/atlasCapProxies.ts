import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  type BufferAttribute,
  type Material,
} from 'three'
import { parcelColor } from './atlasParcels'

export const ATLAS_CAP_SOURCE_FLAG = 'atlasCapSource'
export const ATLAS_CAP_PROXY_OWNER_FLAG = 'atlasCapProxyOwner'

export interface AtlasPickData {
  slugs: string[]
  vlabels: Int16Array
}

export interface AtlasCapProxyBundle {
  meshes: Mesh[]
  materials: Material[]
  dispose: () => void
}

const noopRaycast = () => {}

function emptyBundle(source: Mesh): AtlasCapProxyBundle {
  source.userData[ATLAS_CAP_PROXY_OWNER_FLAG] = true
  return {
    meshes: [],
    materials: [],
    dispose: () => {
      delete source.userData[ATLAS_CAP_PROXY_OWNER_FLAG]
    },
  }
}

function vertexIndex(index: BufferAttribute | null, offset: number): number {
  return index ? index.getX(offset) : offset
}

function pushVertex(out: number[], position: BufferAttribute, index: number): void {
  out.push(position.getX(index), position.getY(index), position.getZ(index))
}

export function buildAtlasCapProxyBundle(source: Mesh, pick: AtlasPickData): AtlasCapProxyBundle {
  const position = source.geometry.getAttribute('position') as BufferAttribute | undefined
  if (!position) return emptyBundle(source)
  if (pick.vlabels.length !== position.count) {
    throw new Error(`atlas cap proxy: ${position.count} Vertices != ${pick.vlabels.length} Labels`)
  }

  const index = source.geometry.getIndex()
  const faceIndexCount = index?.count ?? position.count
  const verticesByLabel = new Map<number, number[]>()

  for (let i = 0; i + 2 < faceIndexCount; i += 3) {
    const a = vertexIndex(index, i)
    const b = vertexIndex(index, i + 1)
    const c = vertexIndex(index, i + 2)
    const label = pick.vlabels[a]
    if (label < 0 || pick.vlabels[b] !== label || pick.vlabels[c] !== label) continue
    let vertices = verticesByLabel.get(label)
    if (!vertices) {
      vertices = []
      verticesByLabel.set(label, vertices)
    }
    pushVertex(vertices, position, a)
    pushVertex(vertices, position, b)
    pushVertex(vertices, position, c)
  }

  source.userData[ATLAS_CAP_PROXY_OWNER_FLAG] = true
  const meshes: Mesh[] = []
  const materials: Material[] = []
  const labels = [...verticesByLabel.keys()].sort((a, b) => a - b)
  for (const label of labels) {
    const slug = pick.slugs[label]
    const vertices = verticesByLabel.get(label)
    if (!slug || !vertices?.length) continue

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    geometry.computeBoundingBox()

    const material = new MeshBasicMaterial({ color: parcelColor(slug), side: DoubleSide })
    material.colorWrite = false
    material.depthWrite = false
    material.depthTest = false

    const proxy = new Mesh(geometry, material)
    proxy.name = slug
    proxy.visible = true
    proxy.frustumCulled = false
    proxy.raycast = noopRaycast
    proxy.userData[ATLAS_CAP_SOURCE_FLAG] = true

    source.add(proxy)
    meshes.push(proxy)
    materials.push(material)
  }

  return {
    meshes,
    materials,
    dispose: () => {
      for (const mesh of meshes) {
        mesh.parent?.remove(mesh)
        mesh.geometry.dispose()
      }
      for (const material of materials) material.dispose()
      delete source.userData[ATLAS_CAP_PROXY_OWNER_FLAG]
    },
  }
}
