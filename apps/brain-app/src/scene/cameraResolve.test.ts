import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CAMERA_MARGIN,
  DEFAULT_GLOBAL_CAMERA_BOUNDS,
  globalCameraBoundsForConfig,
  resolveGlobalCameraViewTarget,
  resolveCameraTarget,
  type CameraBounds,
} from './cameraResolve'

const bounds: CameraBounds = { center: [1, 2, 3], radius: 10 }

describe('resolveCameraTarget', () => {
  it('liefert globale Camera-Bounds aus Config oder den Default', () => {
    expect(globalCameraBoundsForConfig(null)).toBe(DEFAULT_GLOBAL_CAMERA_BOUNDS)
    expect(globalCameraBoundsForConfig({
      shot: 'lateral-left',
      bounds: { center: [10, 20, 30], radius: 45 },
    })).toEqual({ center: [10, 20, 30], radius: 45 })
  })

  it('richtet globale Views auf config.bounds statt Default-Bounds aus', () => {
    const target = resolveGlobalCameraViewTarget({
      config: { bounds: { center: [10, 20, 30], radius: 45 } },
      shot: 'lateral-left',
      fallbackFov: 60,
    })

    expect(target.target).toEqual([10, 20, 30])
    expect(target.position[0]).toBeCloseTo(10 + (45 / Math.sin(Math.PI / 6)) * DEFAULT_CAMERA_MARGIN)
    expect(target.target).not.toEqual(DEFAULT_GLOBAL_CAMERA_BOUNDS.center)
  })

  it('berechnet bounds-Framing aus Config-shot, margin und fov', () => {
    const target = resolveCameraTarget({
      config: { shot: 'lateral-left', fit: 'bounds', margin: 2, fov: 60 },
      bounds,
      fallbackFov: 40,
    })
    expect(target).toEqual({
      position: [41.00000000000001, 2, 3],
      target: [1, 2, 3],
      fov: 60,
      fit: 'bounds',
      margin: 2,
    })
  })

  it('nutzt unterschiedliche Shot-Richtungen deterministisch', () => {
    const target = resolveCameraTarget({
      config: { shot: 'superior', margin: 1, fov: 60 },
      bounds,
      fallbackFov: 40,
    })
    expect(target.position[0]).toBeCloseTo(1)
    expect(target.position[1]).toBeCloseTo(22)
    expect(target.position[2]).toBeCloseTo(3.02)
  })

  it('nutzt targetBounds fuer fit=target statt der Gesamt-Bounds', () => {
    const target = resolveCameraTarget({
      config: { shot: 'lateral-left', fit: 'target', target: 'julich:area-44:l', margin: 1, fov: 60 },
      bounds,
      targetBounds: { center: [20, 0, 0], radius: 5 },
      fallbackFov: 40,
    })
    expect(target.target).toEqual([20, 0, 0])
    expect(target.position[0]).toBeCloseTo(30)
    expect(target.fit).toBe('target')
  })

  it('unterscheidet fit=bounds und fit=target trotz gleicher camera.target', () => {
    const targetBounds: CameraBounds = { center: [20, 0, 0], radius: 5 }
    const boundsFit = resolveCameraTarget({
      config: { shot: 'lateral-left', fit: 'bounds', target: 'julich:area-44:l', margin: 1, fov: 60 },
      bounds,
      targetBounds,
      fallbackFov: 40,
    })
    const targetFit = resolveCameraTarget({
      config: { shot: 'lateral-left', fit: 'target', target: 'julich:area-44:l', margin: 1, fov: 60 },
      bounds,
      targetBounds,
      fallbackFov: 40,
    })

    expect(boundsFit.fit).toBe('bounds')
    expect(boundsFit.target).toEqual(bounds.center)
    expect(targetFit.fit).toBe('target')
    expect(targetFit.target).toEqual(targetBounds.center)
    expect(targetFit.position[0]).not.toBeCloseTo(boundsFit.position[0])
  })

  it('bevorzugt eine explizite Pose vor Shot- und Bounds-Framing', () => {
    const target = resolveCameraTarget({
      config: {
        shot: 'superior',
        fov: 35,
        pose: { position: [10, 20, 30], look_at: [4, 5, 6] },
      },
      bounds,
      fallbackFov: 40,
    })
    expect(target).toEqual({
      position: [10, 20, 30],
      target: [4, 5, 6],
      fov: 35,
      fit: 'pose',
      margin: DEFAULT_CAMERA_MARGIN,
    })
  })

  it('wirft laut statt einen Legacy-Shot als Fallback zu nutzen', () => {
    expect(() => resolveCameraTarget({
      config: {},
      bounds,
      fallbackFov: 40,
    })).toThrow(/camera\.shot fehlt/)
  })

  it('wirft laut bei fehlendem Shot oder ungueltiger Kamera-Geometrie', () => {
    expect(() => resolveCameraTarget({ config: {}, bounds, fallbackFov: 40 })).toThrow(/camera\.shot fehlt/)
    expect(() => resolveCameraTarget({
      config: { shot: 'lateral-left', margin: 0 },
      bounds,
      fallbackFov: 40,
    })).toThrow(/margin/)
    expect(() => resolveCameraTarget({
      config: { shot: 'lateral-left', fov: 180 },
      bounds,
      fallbackFov: 40,
    })).toThrow(/fov/)
    expect(() => resolveCameraTarget({
      config: { shot: 'lateral-left', fit: 'target', target: 'julich:area-44:l' },
      bounds,
      fallbackFov: 40,
    })).toThrow(/targetBounds/)
  })
})
