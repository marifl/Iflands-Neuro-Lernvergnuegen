import { describe, expect, it } from 'vitest'
import { resolveResumeIndex } from './ResumeLauncher'
import type { LoadedScene } from '../scene/scenes'

const scene = (configName: string): LoadedScene =>
  ({ configName } as unknown as LoadedScene)

describe('resolveResumeIndex', () => {
  const scenes = [scene('a'), scene('b'), scene('c')]

  it('ohne Fortschritt am Pfad-Anfang', () => {
    expect(resolveResumeIndex(scenes, undefined)).toBe(0)
  })

  it('bei Fortschritt am zuletzt aktiven Schritt', () => {
    expect(resolveResumeIndex(scenes, 'b')).toBe(1)
  })

  it('unbekannter Schritt faellt ehrlich auf den Anfang zurueck', () => {
    expect(resolveResumeIndex(scenes, 'zzz')).toBe(0)
  })

  it('leere Sequenz bleibt 0', () => {
    expect(resolveResumeIndex([], 'b')).toBe(0)
  })
})
