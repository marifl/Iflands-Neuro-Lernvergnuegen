import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResumeLauncher from './ResumeLauncher'
import { loadScenes, type LoadedScene } from '../scene/scenes'
import { useStudentProgressStore, createStudentProgressState, markStudentStepSeen } from './studentProgress'

vi.mock('../scene/scenes', () => ({ loadScenes: vi.fn() }))
const loadScenesMock = vi.mocked(loadScenes)

function fakeScene(over: Partial<LoadedScene> = {}): LoadedScene {
  return {
    id: 'basalganglienschleifen',
    section: '11.3.3 · Basalganglienschleifen',
    author: 'a',
    order: 0,
    title: 'Drei Basalganglien-Schleifen',
    figure: '11-04',
    brain: { regions: [], camera: 'anterior' },
    overlay: { kind: 'prose', position: 'right', size: 'md' },
    companion: { summary: 'Kernbotschaft des Lernschritts.', sources: [] },
    configName: 'basalganglienschleifen',
    configCameraTargetMeshes: [],
    sequence: { kind: 'learning', name: 'kapitel11-pfad', label: 'Lernpfad', stepIndex: 0, stepCount: 1 },
    ...over,
  } as LoadedScene
}

async function renderLauncher() {
  await act(async () => {
    render(<ResumeLauncher onEnter={vi.fn()} />)
    await Promise.resolve()
  })
}

describe('ResumeLauncher', () => {
  beforeEach(() => {
    loadScenesMock.mockReset()
    useStudentProgressStore.getState().resetStudentProgress()
    window.history.replaceState(null, '', '/')
  })
  afterEach(() => {
    useStudentProgressStore.getState().resetStudentProgress()
  })

  it('zeigt den Lade-Status solange Szenen ausstehen', async () => {
    loadScenesMock.mockReturnValue(new Promise(() => {}))
    await renderLauncher()
    expect(screen.getByRole('status')).toHaveTextContent('Lernpfad wird geladen')
  })

  it('meldet einen Ladefehler laut als Alert', async () => {
    loadScenesMock.mockRejectedValue(new Error('scenes kaputt'))
    await renderLauncher()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht geladen'))
    expect(screen.getByRole('alert')).toHaveTextContent('scenes kaputt')
  })

  it('zeigt einen sichtbaren Fehler statt Dauer-Laden bei leerer Sequenz', async () => {
    loadScenesMock.mockResolvedValue([])
    await renderLauncher()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Kein Lernschritt verfügbar'))
  })

  it('verankert auf dem aktiven Lernschritt und startet ohne Fortschritt', async () => {
    loadScenesMock.mockResolvedValue([fakeScene()])
    await renderLauncher()
    await waitFor(() => expect(screen.getByText('Drei Basalganglien-Schleifen')).toBeInTheDocument())
    expect(screen.getByText('Lernpfad starten')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Lernfortschritt' })).toBeInTheDocument()
  })

  it('zeigt Fortsetzen sobald ein Schritt gesehen wurde', async () => {
    loadScenesMock.mockResolvedValue([fakeScene()])
    const base = createStudentProgressState('kapitel11-pfad', [
      { configName: 'basalganglienschleifen', sceneId: 'basalganglienschleifen', title: 'Drei Basalganglien-Schleifen' },
    ])
    useStudentProgressStore.getState().setStudentProgress(
      markStudentStepSeen(base, 'basalganglienschleifen', '2026-06-29T10:00:00.000Z'),
    )
    await renderLauncher()
    await waitFor(() => expect(screen.getByText('Fortsetzen')).toBeInTheDocument())
  })
})
