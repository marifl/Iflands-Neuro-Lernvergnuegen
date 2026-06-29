import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import ColorLegend from './ColorLegend'
import { BASE_COLOR_MODE_DEFINITIONS, COLOR_MODE_LABEL } from './colorModeDefinitions'
import { useViewerStore } from './viewerStore'

describe('ColorLegend', () => {
  beforeEach(() => {
    useViewerStore.setState({
      activePreset: null,
      colorMode: 'region',
      colorLegend: { visible: true, minimized: true },
      showCarveBrodmann: false,
      showCarveDkt: false,
      showCarveJulich: false,
    })
  })

  it('zeigt eingeklappt die Einträge des aktiven Färbungsmodus', () => {
    render(<ColorLegend />)

    expect(screen.getByRole('button', { name: 'Färbungsdetails öffnen' })).toBeInTheDocument()
    expect(screen.getByText('Färbung')).toBeInTheDocument()
    expect(screen.getByText('Region')).toBeInTheDocument()
    expect(screen.getByText('aktiver Färbungsmodus')).toBeInTheDocument()
    expect(screen.getByText('Großhirn')).toBeInTheDocument()
    expect(screen.getByText('Zwischenhirn')).toBeInTheDocument()
    expect(screen.queryByText('Top-Level-Regionen der TARO-Ontologie; Gefäße und Nerven sind eigene Gruppen.')).not.toBeInTheDocument()
  })

  it('zeigt jeden Basis-Färbungsmodus in der kompakten Legende an', () => {
    for (const definition of BASE_COLOR_MODE_DEFINITIONS) {
      useViewerStore.setState({ colorMode: definition.mode, colorLegend: { visible: true, minimized: true } })
      const { unmount } = render(<ColorLegend />)

      expect(screen.getByText(COLOR_MODE_LABEL[definition.mode])).toBeInTheDocument()
      expect(screen.getByText('aktiver Färbungsmodus')).toBeInTheDocument()

      unmount()
    }
  })

  it('oeffnet per Tap die volle Färbungs-Erklärung', () => {
    render(<ColorLegend />)

    fireEvent.click(screen.getByRole('button', { name: 'Färbungsdetails öffnen' }))

    expect(useViewerStore.getState().colorLegend).toEqual({ visible: true, minimized: false })
    expect(screen.getByText('Regionen')).toBeInTheDocument()
    expect(screen.getByText('Top-Level-Regionen der TARO-Ontologie; Gefäße und Nerven sind eigene Gruppen.')).toBeInTheDocument()
  })

  it('rendert nichts bei Preset-Modus ohne aktives Preset', () => {
    useViewerStore.setState({ colorMode: 'preset' })

    const { container } = render(<ColorLegend />)

    expect(container.innerHTML).toBe('')
  })
})
