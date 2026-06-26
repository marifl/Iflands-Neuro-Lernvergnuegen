import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Component, act, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FooterBar from './FooterBar'
import { fetchColorPresets, fetchPresentationColorItems } from './colorPresets'
import { useSettingsStore } from './settingsStore'
import { useViewerStore } from './viewerStore'
import { VIEWER_STATE_SNAPSHOT_VERSION } from './viewerStateSnapshot'

vi.mock('./colorPresets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./colorPresets')>()
  return {
    ...actual,
    fetchColorPresets: vi.fn().mockResolvedValue([]),
    fetchPresentationColorItems: vi.fn().mockResolvedValue([]),
  }
})

const fetchColorPresetsMock = vi.mocked(fetchColorPresets)
const fetchPresentationColorItemsMock = vi.mocked(fetchPresentationColorItems)

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
    window.history.replaceState(null, '', '/')
    fetchColorPresetsMock.mockReset()
    fetchColorPresetsMock.mockResolvedValue([])
    fetchPresentationColorItemsMock.mockReset()
    fetchPresentationColorItemsMock.mockResolvedValue([])
    useSettingsStore.getState().resetSettings()
    useViewerStore.setState({
      appMode: 'explore',
      activePreset: null,
      colorMode: 'region',
      hidden: new Set(),
      isolated: null,
      isolationPath: [],
      isolatedSlugs: new Set(),
      presetViewOptions: { hideUncolored: true, focusColored: false },
      selected: null,
      selectedSlugs: new Set(),
      selectedLabels: null,
      selectMode: 'group',
      authoringEditMode: false,
      authoringTransformMode: 'translate',
      authoringTransformSpace: 'world',
      authoringTransformSnap: false,
      authoringTransformFrozen: false,
    })
  })

  it('zeigt die Werkzeug-Box im Explorer', async () => {
    await renderFooterBar()
    expect(screen.getByText('Werkzeug')).toBeInTheDocument()
  })

  it('zeigt die Werkzeug-Box auch ausserhalb des Explorers fuer Asset-Edit', async () => {
    useViewerStore.setState({ appMode: 'learn' })
    await renderFooterBar()
    expect(screen.getByText('Werkzeug')).toBeInTheDocument()
  })

  it('schaltet Asset-Edit und Welt-/Objekt-Koordinaten im Werkzeug-Flyout', async () => {
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    expect(screen.getByRole('button', { name: 'Lokal' })).toHaveAccessibleDescription('Asset-Edit einschalten')
    fireEvent.click(screen.getByRole('button', { name: 'Asset-Edit aus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lokal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Drehen' }))

    expect(useViewerStore.getState().authoringEditMode).toBe(true)
    expect(useViewerStore.getState().authoringTransformSpace).toBe('local')
    expect(useViewerStore.getState().authoringTransformMode).toBe('rotate')
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

  it('erklaert deaktivierte Werkzeug-Aktionen im Footer sichtbar', async () => {
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    const isolate = screen.getByRole('button', { name: 'Auswahl isolieren' })

    expect(isolate).toHaveAttribute('aria-disabled', 'true')
    expect(isolate).not.toBeDisabled()
    expect(isolate).toHaveAccessibleDescription('Erst eine Struktur auswählen')

    fireEvent.click(isolate)
    expect(useViewerStore.getState().isolated).toBeNull()
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

  it('zeigt die Figur-Ansicht als strikt relevante Preset-Regionen', async () => {
    fetchColorPresetsMock.mockResolvedValue([{
      id: 'test-figure',
      label: 'Test-Figur',
      intent: 'Testet die Preset-Ansichtsoptionen.',
      coverage: 'full',
      dimOthers: true,
      groups: [
        { label: 'Kognition', role: 'cognition', meaning: 'DLPFC/dorsales Striatum', hue: 210, buckets: ['dlpfc'] },
        { label: 'Emotion', role: 'emotion', meaning: 'OFC/VMPFC/Amygdala', hue: 30, buckets: ['ofc'] },
        { label: 'Motivation', role: 'motivation', meaning: 'dACC/Nc. accumbens', hue: 150, buckets: ['dacc'] },
      ],
    }])
    fetchPresentationColorItemsMock.mockResolvedValue([{
      id: 'test-figure',
      label: 'Test-Figur',
      scene: 'test-figure',
      colorScheme: 'preset',
      colorPresetId: 'test-figure',
      dimOthers: true,
    }])
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Färbung/ }))
    // ColorFlyoutContent laedt Presets asynchron beim Mount — warten.
    fireEvent.click(await screen.findByRole('button', { name: 'Test-Figur' }))
    expect(useViewerStore.getState().activePreset?.id).toBe('test-figure')

    fireEvent.click(screen.getByRole('button', { name: /Test-Figur/ }))
    // ColorFlyoutContent remountet — async Preset-Laden abwarten.
    expect(await screen.findByText('Bedeutungen')).toBeInTheDocument()
    expect(screen.getByText('Kognition')).toBeInTheDocument()
    expect(screen.getByText('DLPFC/dorsales Striatum')).toBeInTheDocument()
    expect(screen.getByText('Emotion')).toBeInTheDocument()
    expect(screen.getByText('OFC/VMPFC/Amygdala')).toBeInTheDocument()
    expect(screen.getByText('Motivation')).toBeInTheDocument()
    expect(screen.getByText('dACC/Nc. accumbens')).toBeInTheDocument()
    expect(screen.getByText('Nur relevante Regionen')).toBeInTheDocument()
    expect(screen.getByText('An')).toBeInTheDocument()
    expect(screen.queryByLabelText('Andere ausblenden')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Eingefärbte fokussieren')).not.toBeInTheDocument()
    expect(screen.queryByText('Andere dimmen')).not.toBeInTheDocument()
    expect(useViewerStore.getState().presetViewOptions).toEqual({ hideUncolored: true, focusColored: false })
  })

  it('bietet alle Basis-Färbungsmodi und Vortrags-Färbungen an', async () => {
    fetchColorPresetsMock.mockResolvedValue([{
      id: 'test-figure',
      label: 'Test-Figur',
      intent: 'Testet die Preset-Auswahl.',
      coverage: 'full',
      dimOthers: true,
      groups: [{ label: 'DLPFC', role: 'cognition', meaning: 'Testgruppe', hue: 210, buckets: ['dlpfc'] }],
    }])
    fetchPresentationColorItemsMock.mockResolvedValue([{
      id: 'test-figure',
      label: 'Test-Figur',
      scene: 'test-figure',
      colorScheme: 'preset',
      colorPresetId: 'test-figure',
      dimOthers: true,
    }])
    await renderFooterBar()

    fireEvent.click(screen.getByRole('button', { name: /Färbung/ }))
    // Warten bis ColorFlyoutContent die Presets geladen hat.
    await screen.findByRole('button', { name: 'Test-Figur' })
    for (const label of ['Anatomisch', 'Funktionssystem', 'Lateralität', 'Region']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Funktionssystem' }))
    expect(useViewerStore.getState().colorMode).toBe('function')

    fireEvent.click(screen.getByRole('button', { name: /Funktionssystem/ }))
    // Flyout remountet ColorFlyoutContent — erneut auf async Daten warten.
    fireEvent.click(await screen.findByRole('button', { name: 'Test-Figur' }))
    expect(useViewerStore.getState().colorMode).toBe('preset')
    expect(window.location.search).toBe('?sequence=presentation.kapitel11-vorlesung&config=test-figure&scene=test-figure&step=0')
    expect(useViewerStore.getState().appMode).toBe('learn')
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
    fireEvent.change(screen.getByLabelText('Standard-Färbung'), { target: { value: 'function' } })
    fireEvent.change(screen.getByLabelText('Dim-Stärke'), { target: { value: '0.5' } })

    expect(useSettingsStore.getState().coloring.defaultColorMode).toBe('function')
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
        },
      }),
    ], 'unterricht.json', { type: 'application/json' })

    fireEvent.change(screen.getByLabelText('Unterrichts-Snapshot-Datei'), { target: { files: [file] } })

    await waitFor(() => expect(useViewerStore.getState().appMode).toBe('explore'))
    expect(useViewerStore.getState().hidden.has('left-insula')).toBe(true)
  })

  it('meldet Preset-Ladefehler an die naechste Error Boundary', async () => {
    fetchColorPresetsMock.mockRejectedValueOnce(new Error('preset load failed'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await act(async () => {
        render(
          <TestErrorBoundary>
            <FooterBar />
          </TestErrorBoundary>,
        )
        await Promise.resolve()
      })
      // Faerbung-Flyout oeffnen, damit ColorFlyoutContent mountet und den Fehler wirft.
      fireEvent.click(screen.getByRole('button', { name: /Färbung/ }))
      expect(await screen.findByRole('alert')).toHaveTextContent('preset load failed')
    } finally {
      consoleError.mockRestore()
    }
  })
})
