import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Component, act, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FooterBar from './FooterBar'
import { fetchColorPresets } from './colorPresets'
import { useSettingsStore } from './settingsStore'
import { useViewerStore } from './viewerStore'
import { VIEWER_STATE_SNAPSHOT_VERSION } from './viewerStateSnapshot'

vi.mock('./colorPresets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./colorPresets')>()
  return {
    ...actual,
    fetchColorPresets: vi.fn().mockResolvedValue([]),
  }
})

const fetchColorPresetsMock = vi.mocked(fetchColorPresets)

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

class TestErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message }
  }

  render() {
    if (this.state.message) return <div role="alert">{this.state.message}</div>
    return this.props.children
  }
}

async function renderFooterBar() {
  let view: ReturnType<typeof render> | null = null
  await act(async () => {
    view = render(<FooterBar />)
    await Promise.resolve()
  })
  return view!
}

describe('FooterBar', () => {
  beforeEach(() => {
    mockViewportWidth(1200)
    localStorage.clear()
    fetchColorPresetsMock.mockReset()
    fetchColorPresetsMock.mockResolvedValue([])
    useSettingsStore.getState().resetSettings()
    useViewerStore.setState({
      appMode: 'explore',
      activePreset: null,
      colorMode: 'region',
      hidden: new Set(),
      isolated: null,
      isolationPath: [],
      isolatedSlugs: new Set(),
      presetViewOptions: { hideUncolored: false, focusColored: false },
      selected: null,
      selectedSlugs: new Set(),
      selectedLabels: null,
      selectMode: 'group',
    })
  })

  it('zeigt die Werkzeug-Box im Explorer', async () => {
    await renderFooterBar()
    expect(screen.getByText('Werkzeug')).toBeInTheDocument()
  })

  it('blendet die Werkzeug-Box ausserhalb des Explorers aus', async () => {
    useViewerStore.setState({ appMode: 'learn' })
    await renderFooterBar()
    expect(screen.queryByText('Werkzeug')).not.toBeInTheDocument()
  })

  it('wechselt den appMode ueber das Modus-Flyout', async () => {
    await renderFooterBar()
    fireEvent.click(screen.getByRole('button', { name: /Explorer/ })) // Modus-Box-Trigger oeffnen
    fireEvent.click(screen.getByRole('button', { name: /^Lernen$/ })) // Eintrag im Flyout
    expect(useViewerStore.getState().appMode).toBe('learn')
  })

  it('oeffnet die Quellen-Page ueber das Atlas-Menue', async () => {
    await renderFooterBar()
    fireEvent.click(screen.getByRole('button', { name: /Atlas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Quellen/ }))
    expect(screen.getByText(/CC Attribution-Share Alike 2\.1 Japan/)).toBeInTheDocument()
  })

  it('macht Auswahl-Shortcuts im Werkzeug-Flyout mobil erreichbar', async () => {
    useViewerStore.setState({ selected: 'area-a', selectedSlugs: new Set(['area-a']) })
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl ausblenden' }))
    expect(useViewerStore.getState().hidden.has('area-a')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl einblenden' }))
    expect(useViewerStore.getState().hidden.has('area-a')).toBe(false)
  })

  it('macht Isolation und Reset ohne Tastatur erreichbar', async () => {
    useViewerStore.setState({ selected: 'area-a', selectedSlugs: new Set(['area-a']), hidden: new Set(['area-b']) })
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl isolieren' }))
    expect(useViewerStore.getState().isolated).toBe('area-a')

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Alles zeigen' }))
    expect(useViewerStore.getState().hidden.size).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Isolation aus' }))
    expect(useViewerStore.getState().isolated).toBeNull()
  })

  it('steuert die Figur-Ansicht ueber Slider statt Zusatz-Buttons', async () => {
    fetchColorPresetsMock.mockResolvedValueOnce([{
      id: 'test-figure',
      label: 'Test-Figur',
      intent: 'Testet die Preset-Ansichtsoptionen.',
      coverage: 'full',
      dimOthers: true,
      groups: [
        { label: 'Kognition', role: 'cognition', meaning: 'DLPFC/dorsales Striatum', hue: 210, buckets: ['dlpfc'] },
        { label: 'Emotion', role: 'emotion', meaning: 'OFC/vmPFC/Amygdala', hue: 30, buckets: ['ofc'] },
        { label: 'Motivation', role: 'motivation', meaning: 'dACC/Nc. accumbens', hue: 150, buckets: ['dacc'] },
      ],
    }])
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Färbung/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Test-Figur' }))
    expect(useViewerStore.getState().activePreset?.id).toBe('test-figure')

    fireEvent.click(screen.getByRole('button', { name: /Test-Figur/ }))
    expect(screen.getByText('Bedeutungen')).toBeInTheDocument()
    expect(screen.getByText('Kognition')).toBeInTheDocument()
    expect(screen.getByText('DLPFC/dorsales Striatum')).toBeInTheDocument()
    expect(screen.getByText('Emotion')).toBeInTheDocument()
    expect(screen.getByText('OFC/vmPFC/Amygdala')).toBeInTheDocument()
    expect(screen.getByText('Motivation')).toBeInTheDocument()
    expect(screen.getByText('dACC/Nc. accumbens')).toBeInTheDocument()
    expect(screen.getByText('Andere dimmen')).toBeInTheDocument()
    const hideSlider = screen.getByLabelText('Andere ausblenden')
    const focusSlider = screen.getByLabelText('Eingefärbte fokussieren')
    expect(screen.queryByRole('button', { name: 'Andere ausblenden' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eingefärbte fokussieren' })).not.toBeInTheDocument()

    fireEvent.change(hideSlider, { target: { value: '1' } })
    fireEvent.change(focusSlider, { target: { value: '1' } })

    expect(useViewerStore.getState().presetViewOptions).toEqual({ hideUncolored: true, focusColored: true })
  })

  it('bietet alle Basis-Färbungsmodi und den Preset-Modus an', async () => {
    fetchColorPresetsMock.mockResolvedValueOnce([{
      id: 'test-figure',
      label: 'Test-Figur',
      intent: 'Testet die Preset-Auswahl.',
      coverage: 'full',
      dimOthers: true,
      groups: [{ label: 'DLPFC', role: 'cognition', meaning: 'Testgruppe', hue: 210, buckets: ['dlpfc'] }],
    }])
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Färbung/ }))
    for (const label of ['Anatomisch', 'Funktionssystem', 'Lateralität', 'Region']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Funktionssystem' }))
    expect(useViewerStore.getState().colorMode).toBe('function')

    fireEvent.click(screen.getByRole('button', { name: /Funktionssystem/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Test-Figur' }))
    expect(useViewerStore.getState().colorMode).toBe('preset')
  })

  it('bietet Snapshot-Export und -Import in der Fussleiste an', async () => {
    await renderFooterBar()
    fireEvent.click(screen.getByRole('button', { name: /Zustand/ }))
    expect(screen.getByRole('button', { name: 'Exportieren' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importieren' })).toBeInTheDocument()
  })

  it('oeffnet die zentrale Settings-UI ueber Mehr und schreibt in den Settings-Store', async () => {
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Mehr/ }))
    expect(screen.getByRole('navigation', { name: 'Einstellungskategorien' })).toBeInTheDocument()
    expect(screen.getByLabelText('Einstellungen')).toHaveAttribute('data-layout', 'split')

    fireEvent.click(screen.getByRole('button', { name: 'Barrierefreiheit' }))
    fireEvent.click(screen.getByLabelText('Ruhemodus'))

    expect(useSettingsStore.getState().accessibility.quietMode).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(useSettingsStore.getState().accessibility.quietMode).toBe(false)
  })

  it('stellt Settings-Controls fuer Select, Slider und Swatches bereit', async () => {
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Mehr/ }))
    expect(screen.getByRole('button', { name: 'Orange' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Färbung' }))
    fireEvent.change(screen.getByLabelText('Standard-Färbung'), { target: { value: 'preset' } })
    fireEvent.change(screen.getByLabelText('Dim-Stärke'), { target: { value: '0.5' } })

    expect(useSettingsStore.getState().coloring.defaultColorMode).toBe('preset')
    expect(useSettingsStore.getState().coloring.dimOpacity).toBe(0.5)
  })

  it('stackt die Settings-UI auf Phone-Breite', async () => {
    mockViewportWidth(500)

    await renderFooterBar()
    fireEvent.click(screen.getByRole('button', { name: /Mehr/ }))

    expect(screen.getByLabelText('Einstellungen')).toHaveAttribute('data-layout', 'stack')
  })

  it('importiert eine Unterrichts-Snapshot-Datei', async () => {
    await renderFooterBar()
    const file = new File([
      JSON.stringify({
        version: VIEWER_STATE_SNAPSHOT_VERSION,
        state: {
          appMode: 'phineas',
          hidden: ['left-insula'],
          showSkull: true,
          skullOpacity: 0.5,
        },
      }),
    ], 'unterricht.json', { type: 'application/json' })

    fireEvent.change(screen.getByLabelText('Unterrichts-Snapshot-Datei'), { target: { files: [file] } })

    await waitFor(() => expect(useViewerStore.getState().appMode).toBe('phineas'))
    expect(useViewerStore.getState().hidden.has('left-insula')).toBe(true)
    expect(useViewerStore.getState().showSkull).toBe(true)
    expect(useViewerStore.getState().skullOpacity).toBe(0.5)
  })

  it('meldet Preset-Ladefehler an die naechste Error Boundary', async () => {
    fetchColorPresetsMock.mockRejectedValueOnce(new Error('preset load failed'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      render(
        <TestErrorBoundary>
          <FooterBar />
        </TestErrorBoundary>,
      )
      expect(await screen.findByRole('alert')).toHaveTextContent('preset load failed')
    } finally {
      consoleError.mockRestore()
    }
  })
})
