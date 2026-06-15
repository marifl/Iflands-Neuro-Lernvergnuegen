import { create } from 'zustand'
import type { ConfigCamera } from '../viewer/atlas/atlasConfig'
import type { LoadedScene } from './scenes'

interface SceneState {
  scenes: LoadedScene[]
  index: number // Index in scenes (nach order)
  step: number // Schritt innerhalb einer Szene (fuer mehrstufige Szenen)
  cameraShot: string | null
  cameraConfig: ConfigCamera | null
  setScenes: (s: LoadedScene[]) => void
  goto: (index: number, step?: number) => void
  setCameraShot: (shot: string | null) => void
  setCameraConfig: (config: ConfigCamera | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  index: 0,
  step: 0,
  cameraShot: null,
  cameraConfig: null,
  setScenes: (scenes) => set({ scenes }),
  goto: (index, step = 0) => set({ index, step }),
  setCameraShot: (cameraShot) => set({ cameraShot }),
  setCameraConfig: (cameraConfig) => set({ cameraConfig }),
}))
