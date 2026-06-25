import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { hueToHex } from './colorPresets'
import GlobalColorLegend, { CORE_COLOR_ROLE_SWATCHES } from './GlobalColorLegend'
import { BASE_COLOR_MODE_DEFINITIONS, COLOR_MODE_LABEL } from './colorModeDefinitions'
import { useViewerStore } from './viewerStore'

describe('GlobalColorLegend', () => {
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
    render(<GlobalColorLegend />)

    expect(screen.getByRole('button', { name: 'Färbungsdetails öffnen' })).toBeInTheDocument()
    expect(screen.getByText('Färbung')).toBeInTheDocument()
    expect(screen.getByText('Region')).toBeInTheDocument()
    expect(screen.getByText('aktiver Färbungsmodus')).toBeInTheDocument()
    // Region-Modus -> die Region-Zeilen, nicht die 3 Lernpfad-Rollen.
    expect(screen.getByText('Großhirn')).toBeInTheDocument()
    expect(screen.getByText('Zwischenhirn')).toBeInTheDocument()
    expect(screen.queryByText('Kognition')).not.toBeInTheDocument()
    expect(screen.queryByText('Top-Level-Regionen der TARO-Ontologie; Gefäße und Nerven sind eigene Gruppen.')).not.toBeInTheDocument()
  })

  it('nutzt die drei didaktischen Rollenfarben aus der vorhandenen Hue-Pipeline', () => {
    expect(CORE_COLOR_ROLE_SWATCHES.map((row) => [row.role, row.label, row.color])).toEqual([
      ['cognition', 'Kognition', hueToHex(210)],
      ['emotion', 'Emotion', hueToHex(30)],
      ['motivation', 'Motivation', hueToHex(150)],
    ])
  })

  it('zeigt jeden Basis-Färbungsmodus in der kompakten Legende an', () => {
    for (const definition of BASE_COLOR_MODE_DEFINITIONS) {
      useViewerStore.setState({ colorMode: definition.mode, colorLegend: { visible: true, minimized: true } })
      const { unmount } = render(<GlobalColorLegend />)

      expect(screen.getByText(COLOR_MODE_LABEL[definition.mode])).toBeInTheDocument()
      expect(screen.getByText('aktiver Färbungsmodus')).toBeInTheDocument()

      unmount()
    }
  })

  it('oeffnet per Tap die volle Färbungs-Erklärung', () => {
    render(<GlobalColorLegend />)

    fireEvent.click(screen.getByRole('button', { name: 'Färbungsdetails öffnen' }))

    expect(useViewerStore.getState().colorLegend).toEqual({ visible: true, minimized: false })
    expect(screen.getByText('Regionen')).toBeInTheDocument()
    expect(screen.getByText('Top-Level-Regionen der TARO-Ontologie; Gefäße und Nerven sind eigene Gruppen.')).toBeInTheDocument()
  })

  it('ueberlaesst Preset-Faerbungen der Figur-Legende', () => {
    useViewerStore.setState({ colorMode: 'preset' })

    render(<GlobalColorLegend />)

    expect(screen.queryByRole('button', { name: 'Färbungsdetails öffnen' })).not.toBeInTheDocument()
  })
})
