import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LearnSidebar from './LearnSidebar'
import { useSceneStore } from './sceneStore'
import { useViewerStore } from '../viewer/viewerStore'

vi.mock('./brainBridge', () => ({
  regionsToMeshes: vi.fn(() => ['mesh-a']),
}))

vi.mock('./overlays/OverlayPanel', () => ({
  default: ({ scene }: { scene: { title: string } }) => <aside data-testid="overlay-panel">{scene.title}</aside>,
}))

const scene = (id: string, order: number) => ({
  id,
  section: '11.4',
  author: 'ifland',
  order,
  title: id,
  brain: { regions: ['acc-cingulum'], camera: 'medial-midline' },
  overlay: { kind: 'prose', position: 'right', size: 'md' },
  companion: { summary: 'x', sources: [] },
})

const configNode = (sceneId: string) => ({
  label_de: sceneId,
  camera: { shot: 'lateral-left', fit: 'bounds', margin: 2, fov: 35 },
  overlay: { scene: sceneId },
  scopes: {},
})

function mockFetch(routes: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (!(url in routes)) return new Response('', { status: 404 })
      return new Response(JSON.stringify(routes[url]), { status: 200 })
    }),
  )
}

beforeEach(() => {
  useSceneStore.setState({ scenes: [], index: 0, step: 0, cameraShot: null, cameraConfig: null })
  useViewerStore.setState({ highlight: [], mode: 'full', appMode: 'explore' })
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('LearnSidebar', () => {
  it('erhaelt den initialen Deep-Link-Step in der kanonischen Scene-URL', async () => {
    mockFetch({
      '/assets/atlas-canonical/atlas-config.json': {
        preset: 'kapitel11',
        presets: { kapitel11: { label_de: 'Kapitel 11', scopes: {} } },
        configurations: { vcpt: configNode('vcpt') },
        presentation: {},
        learning: {
          'kapitel11-pfad': {
            label_de: 'Lernpfad Kapitel 11',
            steps: ['vcpt'],
          },
        },
      },
      '/scenes/vcpt.json': scene('vcpt', 10),
    })
    window.history.replaceState(null, '', '/?scene=vcpt&step=2')

    render(<LearnSidebar />)

    await screen.findByTestId('overlay-panel')
    await waitFor(() => expect(window.location.search).toBe('?config=vcpt&scene=vcpt&step=2'))
    expect(useSceneStore.getState().step).toBe(2)
  })
})
