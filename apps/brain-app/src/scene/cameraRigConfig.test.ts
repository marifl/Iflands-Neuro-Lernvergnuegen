import { describe, expect, it } from 'vitest'
import { selectCameraRigConfig } from './cameraRigConfig'
import type { EffectiveConfig } from '../viewer/atlas/atlasConfig'
import type { AtlasCatalog } from '../viewer/atlas/atlasCatalog'

const CATALOG: AtlasCatalog = {
  version: '1',
  space_note: '',
  axes: [],
  atlases: [],
}

const effectiveConfig = (hasUrlConfig: boolean): EffectiveConfig => ({
  catalog: CATALOG,
  preset: 'kapitel11',
  hasUrlConfig,
  activeConfiguration: 'local-or-url-config',
  configuration: null,
  facets: {},
  view: {},
  camera: { target: 'julich:area-44:l', shot: 'lateral-left', fit: 'target' },
  cameraTargetMeshes: ['left-inferior-frontal-gyrus'],
  scopes: {},
  isAreaEnabled: () => false,
})

describe('selectCameraRigConfig', () => {
  it('nutzt URL-Config-Kameras als Figure-Source', () => {
    const selected = selectCameraRigConfig({
      effectiveConfig: effectiveConfig(true),
      sceneCameraConfig: { shot: 'superior', fit: 'bounds' },
      sceneTargetMeshes: ['scene-mesh'],
      legacyCameraConfig: { shot: 'inferior' },
    })

    expect(selected.cameraConfigSource).toBe('figure')
    expect(selected.activeConfiguration).toBe('local-or-url-config')
    expect(selected.cameraConfig).toEqual({ target: 'julich:area-44:l', shot: 'lateral-left', fit: 'target' })
    expect(selected.targetMeshes).toEqual(['left-inferior-frontal-gyrus'])
  })

  it('laesst lokale activeConfiguration nicht vor Scene-Kameras pinnen', () => {
    const selected = selectCameraRigConfig({
      effectiveConfig: effectiveConfig(false),
      sceneCameraConfig: { target: 'dkt:rostralanteriorcingulate:l', shot: 'medial-midline', fit: 'target' },
      sceneTargetMeshes: ['left-anterior-cingulate'],
      legacyCameraConfig: { shot: 'inferior' },
    })

    expect(selected.cameraConfigSource).toBe('scene')
    expect(selected.activeConfiguration).toBeNull()
    expect(selected.cameraConfig).toEqual({
      target: 'dkt:rostralanteriorcingulate:l',
      shot: 'medial-midline',
      fit: 'target',
    })
    expect(selected.targetMeshes).toEqual(['left-anterior-cingulate'])
  })
})
