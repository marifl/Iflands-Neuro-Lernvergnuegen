import { create } from 'zustand'
import type { Scene } from './types'

interface SceneState {
  scenes: Scene[]
  index: number // Index in scenes (nach order)
  step: number // Schritt innerhalb einer Szene (fuer mehrstufige Szenen)
  cameraShot: string | null
  setScenes: (s: Scene[]) => void
  goto: (index: number, step?: number) => void
  setCameraShot: (shot: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  index: 0,
  step: 0,
  cameraShot: null,
  setScenes: (scenes) => set({ scenes }),
  goto: (index, step = 0) => set({ index, step }),
  setCameraShot: (cameraShot) => set({ cameraShot }),
}))
