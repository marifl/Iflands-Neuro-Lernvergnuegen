import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import { useSceneStore } from './sceneStore'
import { useViewerStore } from '../viewer/viewerStore'

const testState = vi.hoisted(() => ({
  camera: null as THREE.PerspectiveCamera | null,
  controls: null as {
    target: THREE.Vector3
    update: ReturnType<typeof vi.fn>
    addEventListener: (event: string, listener: () => void) => void
    removeEventListener: ReturnType<typeof vi.fn>
  } | null,
  effectiveConfig: null as unknown,
  frame: null as ((state: unknown, delta: number) => void) | null,
  loadCoords: vi.fn(() => new Promise(() => {})),
  unionBounds: vi.fn(() => ({ center: [0, 0, 0], radius: 1 })),
}))

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: (state: unknown, delta: number) => void) => {
    testState.frame = callback
  },
  useThree: () => ({
    camera: testState.camera,
    controls: testState.controls,
  }),
}))

vi.mock('./structureCoords', () => ({
  loadCoords: testState.loadCoords,
  unionBounds: testState.unionBounds,
}))

vi.mock('../viewer/atlas/atlasConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../viewer/atlas/atlasConfig')>()
  return {
    ...actual,
    useEffectiveConfig: () => testState.effectiveConfig,
  }
})

function effectiveCamera(camera: Record<string, unknown>) {
  return {
    preset: 'kapitel11',
    hasUrlConfig: true,
    activeConfiguration: 'pose-config',
    configuration: null,
    facets: {},
    view: {},
    camera,
    cameraTargetMeshes: [],
    scopes: {},
    isAreaEnabled: () => false,
  }
}

describe('CameraRig', () => {
  let controlListeners: Record<string, () => void>

  beforeEach(() => {
    controlListeners = {}
    testState.camera = new THREE.PerspectiveCamera(40)
    testState.camera.position.set(0, 0, 0)
    testState.controls = {
      target: new THREE.Vector3(0, 0, 0),
      update: vi.fn(),
      addEventListener: vi.fn((event: string, listener: () => void) => {
        controlListeners[event] = listener
      }),
      removeEventListener: vi.fn(),
    }
    testState.effectiveConfig = null
    testState.frame = null
    testState.loadCoords.mockClear()
    testState.unionBounds.mockClear()
    useSceneStore.setState({ scenes: [], index: 0, step: 0, cameraShot: null, cameraConfig: null })
    useViewerStore.setState({ highlight: [], cameraView: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('wendet explizite URL-camera.pose ohne Highlight oder geladene Bounds an', async () => {
    testState.effectiveConfig = effectiveCamera({
      fov: 55,
      pose: { position: [10, 20, 30], look_at: [1, 2, 3] },
    })

    render(<CameraRig />)

    await waitFor(() => expect(testState.camera?.fov).toBe(55))
    expect(testState.unionBounds).not.toHaveBeenCalled()
    expect(testState.frame).toBeTypeOf('function')

    testState.frame?.({}, 1 / 60)

    expect(testState.camera?.position.x).toBeGreaterThan(0)
    expect(testState.controls?.target.x).toBeGreaterThan(0)
    expect(testState.controls?.update).toHaveBeenCalled()
  })

  it('laesst non-pose-Kameras ohne Highlight inaktiv', async () => {
    testState.effectiveConfig = effectiveCamera({ shot: 'lateral-left', fit: 'bounds', fov: 55 })

    render(<CameraRig />)

    await waitFor(() => expect(testState.loadCoords).toHaveBeenCalled())
    expect(testState.camera?.fov).toBe(40)
    expect(testState.unionBounds).not.toHaveBeenCalled()

    testState.frame?.({}, 1 / 60)

    expect(testState.camera?.position.toArray()).toEqual([0, 0, 0])
    expect(testState.controls?.target.toArray()).toEqual([0, 0, 0])
    expect(testState.controls?.update).not.toHaveBeenCalled()
  })

  it('wendet importierte freie Viewer-Kamera-Pose direkt an', async () => {
    useViewerStore.setState({
      cameraPose: {
        position: [10, 20, 30],
        target: [1, 2, 3],
        fov: 45,
      },
    })

    render(<CameraRig />)

    await waitFor(() => expect(testState.camera?.fov).toBe(45))
    expect(testState.camera?.position.toArray()).toEqual([10, 20, 30])
    expect(testState.controls?.target.toArray()).toEqual([1, 2, 3])
    expect(testState.controls?.update).toHaveBeenCalled()
  })

  it('speichert die freie Kamera-Pose nach OrbitControls-Ende', async () => {
    render(<CameraRig />)

    testState.camera?.position.set(11, 22, 33)
    if (testState.camera) testState.camera.fov = 47
    testState.controls?.target.set(4, 5, 6)
    act(() => {
      controlListeners.end()
    })

    expect(useViewerStore.getState().cameraPose).toEqual({
      position: [11, 22, 33],
      target: [4, 5, 6],
      fov: 47,
    })
  })
})
