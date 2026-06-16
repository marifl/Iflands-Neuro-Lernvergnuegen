import { describe, expect, it } from 'vitest'
import {
  ASSET_MANIFEST_SCHEMA_VERSION,
  parseAssetManifestDocument,
  resolveAssetManifestSlot,
  toAssetManifestJson,
  type AssetManifestDocument,
} from './assetManifest'

const SHA_256 = `sha256:${'a'.repeat(64)}`

const eegAssetManifest: AssetManifestDocument = {
  schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
  manifestId: 'tech-board-v2-assets',
  assets: [
    {
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      slotId: 'eeg-device-model',
      label: 'EEG cap device',
      uri: '/assets/devices/eeg/eeg-cap-v1.glb',
      previewUri: '/assets/devices/eeg/eeg-cap-v1.webp',
      format: 'glb',
      optional: true,
      version: '1.0.0',
      source: {
        kind: 'curated',
        provenance: 'synthetic EEG cap fixture for authoring contract tests',
        license: 'internal-test-fixture',
        hash: SHA_256,
        attribution: 'ATTACHMENT test fixture',
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 0.001,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'asset-origin' },
        rootTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
      materialPolicy: {
        materials: 'source-materials',
        transparency: 'alpha-blend',
        shareMaterials: true,
      },
      nodeNaming: {
        requireStableNodeNames: true,
        nodeNamePattern: '^[A-Za-z0-9_.:-]+$',
        partIdPattern: '^[a-z0-9][a-z0-9-]*$',
      },
      parts: [
        {
          partId: 'electrode-fz',
          label: 'Fz electrode',
          nodeName: 'EEG_Fz',
          pickable: true,
          role: 'selectable',
        },
        {
          partId: 'cap-helper-ring',
          label: 'Cap helper ring',
          nodeName: 'EEG_Helper_Ring',
          pickable: false,
          role: 'helper',
        },
      ],
    },
    {
      assetId: 'asset:bodyparts3d-skull-context',
      collectionId: 'context-full',
      slotId: 'skull-context-model',
      label: 'BodyParts3D skull context',
      uri: '/assets/context/skull.glb',
      format: 'glb',
      optional: false,
      version: '1.0.0',
      source: {
        kind: 'bodyparts3d',
        provenance: 'BodyParts3D TARO context conversion, recentered and rotated to Y-up',
        license: 'CC BY-SA 2.1 JP',
        hash: `sha256:${'b'.repeat(64)}`,
        attribution: 'BodyParts3D, Copyright Database Center for Life Science',
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 1,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'bounds-center' },
        rootTransform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
      materialPolicy: {
        materials: 'source-materials',
        transparency: 'opaque',
        shareMaterials: true,
      },
      nodeNaming: {
        requireStableNodeNames: true,
        nodeNamePattern: '^[A-Za-z0-9_.:-]+$',
        partIdPattern: '^[a-z0-9][a-z0-9-]*$',
      },
      parts: [
        {
          partId: 'frontal-bone',
          label: 'Frontal bone',
          nodeName: 'frontal-bone',
          pickable: true,
          role: 'selectable',
        },
      ],
    },
  ],
}

describe('AssetManifest contract', () => {
  it('roundtript ein GLB-Asset-Manifest fuer ein optionales EEG-Device stabil', () => {
    const parsed = parseAssetManifestDocument(eegAssetManifest)
    const json = toAssetManifestJson(parsed)

    expect(parseAssetManifestDocument(JSON.parse(json))).toEqual(parsed)
    expect(JSON.parse(json)).toEqual(eegAssetManifest)
  })

  it('erhaelt Pipeline-Metadaten, Normalisierung und Materialpolitik exakt', () => {
    const asset = parseAssetManifestDocument(eegAssetManifest).assets[0]

    expect(asset).toMatchObject({
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'device-eeg-10-20',
      slotId: 'eeg-device-model',
      uri: '/assets/devices/eeg/eeg-cap-v1.glb',
      format: 'glb',
      version: '1.0.0',
      source: {
        kind: 'curated',
        hash: SHA_256,
        provenance: 'synthetic EEG cap fixture for authoring contract tests',
        license: 'internal-test-fixture',
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 0.001,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'asset-origin' },
      },
      materialPolicy: {
        materials: 'source-materials',
        transparency: 'alpha-blend',
        shareMaterials: true,
      },
    })
  })

  it('modelliert vorhandene BodyParts3D-GLBs ohne implizite Runtime-Skalierung', () => {
    const asset = parseAssetManifestDocument(eegAssetManifest).assets[1]

    expect(asset).toMatchObject({
      assetId: 'asset:bodyparts3d-skull-context',
      collectionId: 'context-full',
      uri: '/assets/context/skull.glb',
      optional: false,
      source: {
        kind: 'bodyparts3d',
        license: 'CC BY-SA 2.1 JP',
      },
      normalization: {
        unit: 'millimeter',
        upAxis: 'y-up',
        scale: 1,
        spaceId: 'bodyparts3d-taro',
        defaultPivot: { policy: 'bounds-center' },
      },
      parts: [
        {
          partId: 'frontal-bone',
          nodeName: 'frontal-bone',
          pickable: true,
          role: 'selectable',
        },
      ],
    })
  })

  it('trennt vorhandene, optionale fehlende und required fehlende Slots', () => {
    expect(resolveAssetManifestSlot(eegAssetManifest, {
      collectionId: 'device-eeg-10-20',
      slotId: 'eeg-device-model',
      assetId: 'asset:eeg-cap-v1',
      optional: true,
    })).toMatchObject({
      status: 'available',
      assetId: 'asset:eeg-cap-v1',
    })

    expect(resolveAssetManifestSlot(eegAssetManifest, {
      collectionId: 'device-eeg-10-20',
      slotId: 'optional-device-model',
      assetId: 'asset:optional-missing',
      optional: true,
    })).toMatchObject({
      status: 'missing-optional',
      assetId: 'asset:optional-missing',
    })

    expect(resolveAssetManifestSlot(eegAssetManifest, {
      collectionId: 'device-eeg-10-20',
      slotId: 'required-device-model',
      assetId: 'asset:required-missing',
      optional: false,
    })).toMatchObject({
      status: 'missing-required',
      assetId: 'asset:required-missing',
    })
  })

  it('lehnt ungueltige Versionen, Formate, Duplikate und nicht-finite Werte laut ab', () => {
    expect(() => parseAssetManifestDocument({ ...eegAssetManifest, schemaVersion: 999 })).toThrow(/schemaVersion/)
    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{ ...eegAssetManifest.assets[0], format: 'fbx' }],
    })).toThrow(/format/)
    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{ ...eegAssetManifest.assets[0], uri: '/assets/devices/eeg/eeg-cap-v1.gltf' }],
    })).toThrow(/uri/)
    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [eegAssetManifest.assets[0], { ...eegAssetManifest.assets[0] }],
    })).toThrow(/doppelte ID/)
    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{
        ...eegAssetManifest.assets[0],
        normalization: { ...eegAssetManifest.assets[0].normalization, scale: Number.NaN },
      }],
    })).toThrow(/scale/)
    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{
        ...eegAssetManifest.assets[0],
        normalization: {
          ...eegAssetManifest.assets[0].normalization,
          rootTransform: {
            ...eegAssetManifest.assets[0].normalization.rootTransform,
            position: [0, Number.POSITIVE_INFINITY, 0],
          },
        },
      }],
    })).toThrow(/position/)
  })

  it('lehnt instabile Part-IDs, Node-Namen und pickbare Helper laut ab', () => {
    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{
        ...eegAssetManifest.assets[0],
        parts: [{ ...eegAssetManifest.assets[0].parts[0], partId: 'Electrode Fz' }],
      }],
    })).toThrow(/partId/)

    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{
        ...eegAssetManifest.assets[0],
        parts: [{ ...eegAssetManifest.assets[0].parts[0], nodeName: 'EEG/Fz' }],
      }],
    })).toThrow(/nodeName/)

    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{
        ...eegAssetManifest.assets[0],
        parts: [{ ...eegAssetManifest.assets[0].parts[1], pickable: true }],
      }],
    })).toThrow(/pickable/)

    expect(() => parseAssetManifestDocument({
      ...eegAssetManifest,
      assets: [{
        ...eegAssetManifest.assets[0],
        parts: [eegAssetManifest.assets[0].parts[0], { ...eegAssetManifest.assets[0].parts[0] }],
      }],
    })).toThrow(/doppelte ID/)
  })
})
