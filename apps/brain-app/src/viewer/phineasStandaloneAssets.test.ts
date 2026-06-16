import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseAssetManifestDocument } from './assetManifest'

const appRoot = process.cwd()
const repoRoot = resolve(appRoot, '../..')
const publicRoot = resolve(appRoot, 'public')
const phineasAssetsRoot = resolve(publicRoot, 'assets/phineas')
const phineasSourcesRoot = resolve(repoRoot, 'raw_protected/phineas-gage')

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function publicFileForUri(uri: string): string {
  return resolve(publicRoot, uri.replace(/^\//, ''))
}

function expectVec3(value: unknown): asserts value is [number, number, number] {
  expect(Array.isArray(value)).toBe(true)
  expect(value).toHaveLength(3)
  for (const component of value as unknown[]) {
    expect(typeof component).toBe('number')
    expect(Number.isFinite(component)).toBe(true)
  }
}

describe('Phineas-Gage-Standalone-Assets', () => {
  it('liefert ein valides Runtime-Manifest mit echten GLB-Dateien und Hashes', () => {
    const manifest = parseAssetManifestDocument(readJsonFile(resolve(phineasAssetsRoot, 'asset-manifest.json')))

    expect(manifest.manifestId).toBe('phineas-gage-standalone-assets-v1')
    expect(manifest.assets.map((asset) => asset.assetId)).toEqual([
      'phineas-gage-skull-lod',
      'phineas-gage-skull-calvarium-cut-lod',
      'phineas-gage-iron-rod',
    ])

    for (const asset of manifest.assets) {
      const assetFile = publicFileForUri(asset.uri)
      expect(existsSync(assetFile)).toBe(true)
      expect(asset.collectionId).toBe('case-phineas-gage')
      expect(asset.source.hash).toBe(`sha256:${sha256(assetFile)}`)
      expect(asset.source.provenance).not.toContain('/Users/')
      expect(asset.parts).toHaveLength(1)
    }
  })

  it('haelt die drei wissenschaftlichen Rekonstruktionspfade lokal im Standalone', () => {
    const reconstructions = readJsonFile(resolve(phineasAssetsRoot, 'gage-reconstructions.json')) as Record<string, {
      entry: unknown
      exit: unknown
      doi: unknown
      affectedParcels: unknown
    }>

    expect(Object.keys(reconstructions).sort()).toEqual(['damasio1994', 'ratiu2004', 'vanhorn2012'])
    expect(reconstructions.damasio1994?.doi).toBe('10.1126/science.8178168')
    expect(reconstructions.ratiu2004?.doi).toBe('10.1089/089771504774129964')
    expect(reconstructions.vanhorn2012?.doi).toBe('10.1371/journal.pone.0037454')

    for (const reconstruction of Object.values(reconstructions)) {
      expectVec3(reconstruction.entry)
      expectVec3(reconstruction.exit)
      expect(reconstruction.doi).toMatch(/^10\./)
      expect(Array.isArray(reconstruction.affectedParcels)).toBe(true)
    }
  })

  it('versioniert die wissenschaftlichen Gage-Unterlagen im Repo', () => {
    const expectedHashes: Record<string, string> = {
      'sources/damasio-1994-return-of-phineas-gage.pdf': 'b71d48931ff3d6b58622851e2116c10fba2337c1160fcba3dadb09f8b95abb83',
      'sources/harlow-1848-passage-of-an-iron-rod.pdf': '7c2640929e8db4d1623dd0dca142af58e1ec9e041cc62eaa232214830209a978',
      'sources/ratiu-2004-phineas-gage-digitally-remastered.pdf': 'eecd6d91078c585eeb127a187c909191de51c5133489359f96448e2d93e8199c',
      'sources/van-horn-2012-mapping-connectivity-damage.pdf': '0edce133e4514cff60e65c0eaf081e0e67cf27df958d0eb1d044482b9c326f70',
      'ocr/ratiu-2004-content-list.json': 'e144a70518093fd91d9b4f9f789e8bdd4afcce64ea103c31c9aae30562b84854',
      'ocr/ratiu-2004-phineas-gage-digitally-remastered.md': '2d939432da08a54ae4e35ece65777295b14b4487ecf3f3ca96742a2dda2dcd44',
    }

    for (const [relativePath, expectedHash] of Object.entries(expectedHashes)) {
      const file = resolve(phineasSourcesRoot, relativePath)
      expect(existsSync(file)).toBe(true)
      expect(statSync(file).size).toBeGreaterThan(1000)
      expect(sha256(file)).toBe(expectedHash)
    }
  })
})
