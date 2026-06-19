import type { ConfigCamera } from '../viewer/atlas/atlasConfig'
import { directionVec } from './cameraPresets'

export type Vec3 = [number, number, number]

export interface CameraBounds {
  center: Vec3
  radius: number
}

export interface CameraResolveInput {
  config: ConfigCamera | null
  bounds: CameraBounds
  targetBounds?: CameraBounds | null
  fallbackFov: number
}

export interface ResolvedCameraTarget {
  position: Vec3
  target: Vec3
  fov: number
  fit: 'bounds' | 'target' | 'pose'
  margin: number
}

export const DEFAULT_CAMERA_MARGIN = 1.4
export const DEFAULT_GLOBAL_CAMERA_BOUNDS: CameraBounds = {
  center: [0, 12, 0],
  radius: 85,
}

export function globalCameraBoundsForConfig(config: ConfigCamera | null): CameraBounds {
  return config?.bounds ?? DEFAULT_GLOBAL_CAMERA_BOUNDS
}

export function resolveGlobalCameraViewTarget(input: {
  config: ConfigCamera | null
  shot: string
  fallbackFov: number
}): ResolvedCameraTarget {
  return resolveCameraTarget({
    config: { shot: input.shot },
    bounds: globalCameraBoundsForConfig(input.config),
    fallbackFov: input.fallbackFov,
  })
}

function assertCameraFov(fov: number): void {
  if (!Number.isFinite(fov) || fov <= 0 || fov >= 180) {
    throw new Error(`resolveCameraTarget: fov muss zwischen 0 und 180 Grad liegen, erhalten ${fov}`)
  }
}

function assertMargin(margin: number): void {
  if (!Number.isFinite(margin) || margin <= 0) {
    throw new Error(`resolveCameraTarget: margin muss groesser 0 sein, erhalten ${margin}`)
  }
}

function assertFit(fit: string | undefined): asserts fit is 'bounds' | 'target' | undefined {
  if (fit !== undefined && fit !== 'bounds' && fit !== 'target') {
    throw new Error(`resolveCameraTarget: camera.fit "${fit}" ungueltig`)
  }
}

export function resolveCameraTarget(input: CameraResolveInput): ResolvedCameraTarget {
  const config = input.config ?? {}
  const fov = config.fov ?? input.fallbackFov
  const margin = config.margin ?? DEFAULT_CAMERA_MARGIN
  assertCameraFov(fov)
  assertMargin(margin)

  if (config.pose) {
    return {
      position: config.pose.position,
      target: config.pose.look_at,
      fov,
      fit: 'pose',
      margin,
    }
  }

  assertFit(config.fit)
  const shot = config.shot
  if (!shot) throw new Error('resolveCameraTarget: camera.shot fehlt')

  const fit = config.fit ?? 'bounds'
  const bounds = fit === 'target' ? input.targetBounds : input.bounds
  if (!bounds) throw new Error('resolveCameraTarget: fit="target" braucht targetBounds')
  const dir = directionVec(shot)
  const dist = (bounds.radius / Math.sin((fov * Math.PI) / 360)) * margin
  const target = bounds.center
  return {
    position: [
      target[0] + dir.x * dist,
      target[1] + dir.y * dist,
      target[2] + dir.z * dist,
    ],
    target,
    fov,
    fit,
    margin,
  }
}
