import type { ConfigCamera, EffectiveConfig } from '../viewer/atlas/atlasConfig'

export type CameraConfigSource = 'figure' | 'scene'
export const EMPTY_TARGET_MESHES: string[] = []

export interface CameraRigConfigSelection {
  activeConfiguration: string | null
  figureCameraConfig: ConfigCamera | null
  figureTargetMeshes: string[]
  cameraConfig: ConfigCamera | null
  cameraConfigSource: CameraConfigSource | null
  targetMeshes: string[]
}

export function selectCameraRigConfig(input: {
  effectiveConfig: EffectiveConfig | null
  sceneCameraConfig: ConfigCamera | null
  sceneTargetMeshes: string[]
}): CameraRigConfigSelection {
  const activeConfiguration = input.effectiveConfig?.hasUrlConfig ? input.effectiveConfig.activeConfiguration : null
  const figureCameraConfig = input.effectiveConfig && activeConfiguration ? input.effectiveConfig.camera : null
  const figureTargetMeshes = input.effectiveConfig && activeConfiguration
    ? input.effectiveConfig.cameraTargetMeshes
    : EMPTY_TARGET_MESHES
  const cameraConfig = figureCameraConfig ?? input.sceneCameraConfig
  const cameraConfigSource: CameraConfigSource | null = figureCameraConfig ? 'figure' : input.sceneCameraConfig ? 'scene' : null
  const targetMeshes = figureCameraConfig
    ? figureTargetMeshes
    : input.sceneCameraConfig
      ? input.sceneTargetMeshes
      : EMPTY_TARGET_MESHES

  return {
    activeConfiguration,
    figureCameraConfig,
    figureTargetMeshes,
    cameraConfig,
    cameraConfigSource,
    targetMeshes,
  }
}
