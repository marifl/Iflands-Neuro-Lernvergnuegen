import { describe, expect, it } from 'vitest'
import {
  AUTHORING_SCENE_SCHEMA_VERSION,
  parseAuthoringScene,
  toAuthoringSceneJson,
  type AuthoringScene,
} from './authoringScene'

const minimalDeviceScene: AuthoringScene = {
  schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
  sceneId: 'eeg-device-demo',
  assetInstances: [
    {
      instanceId: 'device-eeg-cap-01',
      assetId: 'asset:eeg-cap-v1',
      collectionId: 'collection:eeg-devices',
      visible: true,
      transform: {
        position: [1.25, -2.5, 3.75],
        rotation: [0, 1.5708, -0.25],
        scale: [0.8, 0.8, 0.8],
      },
      origin: { policy: 'asset-origin' },
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
      clipBindings: [
        {
          bindingId: 'alpha-loop',
          clipId: 'clip:alpha-loop',
          targetPartId: 'electrode-fz',
        },
      ],
      annotations: [
        {
          annotationId: 'fz-note',
          target: { instanceId: 'device-eeg-cap-01', partId: 'electrode-fz' },
          label: 'Fz',
          body: 'Midline frontal electrode.',
        },
      ],
    },
  ],
}

describe('AuthoringScene contract', () => {
  it('roundtript ein minimales EEG-Device-Object-Set stabil', () => {
    const parsed = parseAuthoringScene(minimalDeviceScene)
    const json = toAuthoringSceneJson(parsed)

    expect(parseAuthoringScene(JSON.parse(json))).toEqual(parsed)
    expect(JSON.parse(json)).toEqual(minimalDeviceScene)
  })

  it('erhaelt Transform/TRS exakt', () => {
    const parsed = parseAuthoringScene(minimalDeviceScene)

    expect(parsed.assetInstances[0].transform).toEqual({
      position: [1.25, -2.5, 3.75],
      rotation: [0, 1.5708, -0.25],
      scale: [0.8, 0.8, 0.8],
    })
  })

  it('erhaelt Selectable-Part-IDs und Helper-Markierung stabil', () => {
    const parts = parseAuthoringScene(minimalDeviceScene).assetInstances[0].parts

    expect(parts).toEqual([
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
    ])
  })

  it('lehnt unbekannte schemaVersion laut ab', () => {
    expect(() => parseAuthoringScene({ ...minimalDeviceScene, schemaVersion: 999 })).toThrow(/schemaVersion/)
  })

  it('lehnt ungueltige Vektoren, fehlende IDs und nicht-finite Zahlen laut ab', () => {
    expect(() => parseAuthoringScene({
      ...minimalDeviceScene,
      assetInstances: [
        {
          ...minimalDeviceScene.assetInstances[0],
          instanceId: '',
        },
      ],
    })).toThrow(/instanceId/)

    expect(() => parseAuthoringScene({
      ...minimalDeviceScene,
      assetInstances: [
        {
          ...minimalDeviceScene.assetInstances[0],
          transform: {
            ...minimalDeviceScene.assetInstances[0].transform,
            position: [0, 1],
          },
        },
      ],
    })).toThrow(/position/)

    expect(() => parseAuthoringScene({
      ...minimalDeviceScene,
      assetInstances: [
        {
          ...minimalDeviceScene.assetInstances[0],
          transform: {
            ...minimalDeviceScene.assetInstances[0].transform,
            rotation: [0, Number.NaN, 0],
          },
        },
      ],
    })).toThrow(/finite Zahl/)
  })

  it('lehnt nicht aufloesbare interne Referenzen laut ab', () => {
    expect(() => parseAuthoringScene({
      ...minimalDeviceScene,
      assetInstances: [
        {
          ...minimalDeviceScene.assetInstances[0],
          parentId: 'ghost-parent',
        },
      ],
    })).toThrow(/parentId/)

    expect(() => parseAuthoringScene({
      ...minimalDeviceScene,
      assetInstances: [
        {
          ...minimalDeviceScene.assetInstances[0],
          clipBindings: [
            {
              bindingId: 'missing-part-binding',
              clipId: 'clip:alpha-loop',
              targetPartId: 'ghost-part',
            },
          ],
        },
      ],
    })).toThrow(/targetPartId/)

    expect(() => parseAuthoringScene({
      ...minimalDeviceScene,
      assetInstances: [
        {
          ...minimalDeviceScene.assetInstances[0],
          annotations: [
            {
              annotationId: 'ghost-note',
              target: { instanceId: 'ghost-instance', partId: 'electrode-fz' },
              label: 'Ghost',
            },
          ],
        },
      ],
    })).toThrow(/target.instanceId/)
  })

  it('laesst optionale Felder weg, ohne sie typunsicher zu ersetzen', () => {
    const parsed = parseAuthoringScene({
      schemaVersion: AUTHORING_SCENE_SCHEMA_VERSION,
      sceneId: 'minimal-object',
      assetInstances: [
        {
          instanceId: 'brain-model',
          assetId: 'asset:brain',
          collectionId: 'collection:bodyparts3d',
          parentId: null,
          visible: false,
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          origin: { policy: 'bounds-center', offset: [0, 2, 0] },
        },
      ],
    })

    expect(parsed.assetInstances[0]).toEqual({
      instanceId: 'brain-model',
      assetId: 'asset:brain',
      collectionId: 'collection:bodyparts3d',
      parentId: null,
      visible: false,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      origin: { policy: 'bounds-center', offset: [0, 2, 0] },
    })
    expect(parsed.assetInstances[0].parts).toBeUndefined()
    expect(parsed.assetInstances[0].clipBindings).toBeUndefined()
    expect(parsed.assetInstances[0].annotations).toBeUndefined()
  })
})
