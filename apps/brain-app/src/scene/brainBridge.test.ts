import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { configRegionsToMeshes, regionsToMeshes } from './brainBridge'
import { REGION_MAPPINGS } from './regions'
import { BUCKET_MAPPINGS } from '../viewer/bucketMeshes'

const here = dirname(fileURLToPath(import.meta.url))
const STRUCTURE_COORDS_PATH = resolve(here, '../../public/scenes/structure-coords.json')

describe('regionsToMeshes', () => {
  it('vereinigt die Mesh-Sets mehrerer Regionen ohne Duplikate', () => {
    const regions = Object.keys(REGION_MAPPINGS).slice(0, 2)
    const meshes = regionsToMeshes(regions)
    const expected = new Set(regions.flatMap((region) => REGION_MAPPINGS[region].meshes))
    expect(new Set(meshes)).toEqual(expected)
    expect(new Set(meshes).size).toBe(meshes.length) // dedupe
  })
  it('wirft laut bei unbekannter Region (kein stiller Fallback)', () => {
    expect(() => regionsToMeshes(['gibtsnicht'])).toThrow(/unbekannte Region: gibtsnicht/)
  })
  it('alle generierten Scene-Region-Meshes existieren in structure-coords.json', () => {
    const structureIds = new Set(Object.keys(JSON.parse(readFileSync(STRUCTURE_COORDS_PATH, 'utf8'))))
    const issues = Object.entries(REGION_MAPPINGS).flatMap(([region, mapping]) =>
      mapping.meshes.filter((mesh) => !structureIds.has(mesh)).map((mesh) => `${region}: ${mesh}`),
    )
    expect(issues).toEqual([])
  })
})

describe('configRegionsToMeshes', () => {
  it('vereinigt direkte Meshes, Bucket-Meshes und Scene-Region-Meshes', () => {
    const bucket = Object.entries(BUCKET_MAPPINGS).find(([, mapping]) => mapping.meshes.length > 0)
    if (!bucket) throw new Error('Test-Setup: kein Bucket mit Geometrie gefunden')
    const [bucketName, bucketMapping] = bucket
    const region = Object.keys(REGION_MAPPINGS)[0]
    const directMesh = 'direct-test-mesh'
    const meshes = configRegionsToMeshes({
      meshes: [directMesh],
      buckets: [bucketName],
      scene_regions: [region],
      areas: ['dkt:lateralorbitofrontal:l'],
    })
    const expected = new Set([
      directMesh,
      ...bucketMapping.meshes,
      ...REGION_MAPPINGS[region].meshes,
    ])
    expect(new Set(meshes)).toEqual(expected)
  })
})
