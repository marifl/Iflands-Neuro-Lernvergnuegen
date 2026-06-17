import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPanel from './SettingsPanel'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from './settingsStore'
import {
  createStudentProgressState,
  recordStudentCheck,
  useStudentProgressStore,
} from './studentProgress'
import { exportViewerStateSnapshotJson } from './viewerStateSnapshot'

function mockViewportWidth(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => {
      const maxWidth = /max-width:\s*(\d+)px/.exec(query)?.[1]
      return {
        matches: maxWidth ? width <= Number(maxWidth) : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      } as unknown as MediaQueryList
    }),
  })
}

function checkedProgress() {
  return recordStudentCheck(
    createStudentProgressState('kapitel11-pfad', [
      {
        configName: 'wcst-frontoparietal',
        sceneId: 'wcst-frontoparietal',
        title: 'WCST',
      },
    ]),
    'wcst-frontoparietal',
    'wcst-sort-rule',
    'passed',
    '2026-06-17T19:00:00.000Z',
  )
}

function renderDataAccountPanel() {
  render(<SettingsPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Daten & Konto' }))
}

beforeEach(() => {
  mockViewportWidth(1200)
  localStorage.clear()
  useSettingsStore.getState().resetSettings()
  useStudentProgressStore.getState().resetStudentProgress()
})

describe('SettingsPanel Daten & Konto', () => {
  it('zeigt nur Accessibility-Controls mit echtem Runtime-Pfad', () => {
    render(<SettingsPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Barrierefreiheit' }))

    fireEvent.click(screen.getByLabelText('Ruhemodus'))
    fireEvent.click(screen.getByRole('button', { name: 'Reduziert' }))
    fireEvent.click(screen.getByLabelText('Fokus-Ringe'))
    fireEvent.click(screen.getByLabelText('Lesefreundliche Schrift'))

    expect(useSettingsStore.getState().accessibility.quietMode).toBe(true)
    expect(useSettingsStore.getState().accessibility.motion).toBe('reduce')
    expect(useSettingsStore.getState().accessibility.focusRings).toBe(false)
    expect(useSettingsStore.getState().accessibility.readableFont).toBe(true)
    expect(screen.queryByText('Haptik')).not.toBeInTheDocument()
    expect(screen.queryByText('Vorlesen')).not.toBeInTheDocument()
  })

  it('pflegt Rollenwert und setzt Lernfortschritt zurueck', () => {
    useStudentProgressStore.getState().setStudentProgress(checkedProgress())
    renderDataAccountPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Dozent' }))
    expect(useSettingsStore.getState().dataAccount.role).toBe('dozent')
    expect(screen.getByText('1/1 Checks abgeschlossen, 1/1 Schritte gesehen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lernfortschritt zurücksetzen' }))

    expect(useStudentProgressStore.getState().progress).toBeNull()
    expect(screen.getByText('Kein Lernfortschritt gespeichert')).toBeInTheDocument()
  })

  it('importiert Unterrichts-Snapshots ueber Daten & Konto', async () => {
    const progress = checkedProgress()
    useStudentProgressStore.getState().setStudentProgress(progress)
    const snapshotJson = exportViewerStateSnapshotJson()
    useStudentProgressStore.getState().resetStudentProgress()
    renderDataAccountPanel()

    fireEvent.change(screen.getByLabelText('Unterrichts-Snapshot importieren'), {
      target: { files: [new File([snapshotJson], 'snapshot.json', { type: 'application/json' })] },
    })

    await waitFor(() => expect(useStudentProgressStore.getState().progress).toEqual(progress))
    expect(screen.getByText('1/1 Checks abgeschlossen, 1/1 Schritte gesehen')).toBeInTheDocument()
  })

  it('leert lokale Daten aus dem Daten-Konto-Panel', () => {
    useSettingsStore.getState().updateCategory('dataAccount', { role: 'developer' })
    useStudentProgressStore.getState().setStudentProgress(checkedProgress())
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeTruthy()
    renderDataAccountPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Lokale Daten leeren' }))

    expect(useSettingsStore.getState().dataAccount.role).toBe('student')
    expect(useStudentProgressStore.getState().progress).toBeNull()
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
  })
})
