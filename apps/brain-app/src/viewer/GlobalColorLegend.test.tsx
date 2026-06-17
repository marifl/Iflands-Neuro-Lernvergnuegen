import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { hueToHex } from './colorPresets'
import GlobalColorLegend, { CORE_COLOR_ROLE_SWATCHES } from './GlobalColorLegend'
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

  it('zeigt standardmaessig die kompakte Rollen-Legende im Viewport', () => {
    render(<GlobalColorLegend />)

    expect(screen.getByRole('button', { name: 'Färbungsdetails öffnen' })).toBeInTheDocument()
    expect(screen.getByText('Färbung')).toBeInTheDocument()
    expect(screen.getByText('Kognition')).toBeInTheDocument()
    expect(screen.getByText('Emotion')).toBeInTheDocument()
    expect(screen.getByText('Motivation')).toBeInTheDocument()
    expect(screen.queryByText('Top-Level-Regionen der TARO-Ontologie; Gefäße und Nerven sind eigene Gruppen.')).not.toBeInTheDocument()
  })

  it('nutzt die drei didaktischen Rollenfarben aus der vorhandenen Hue-Pipeline', () => {
    expect(CORE_COLOR_ROLE_SWATCHES.map((row) => [row.role, row.label, row.color])).toEqual([
      ['cognition', 'Kognition', hueToHex(210)],
      ['emotion', 'Emotion', hueToHex(30)],
      ['motivation', 'Motivation', hueToHex(150)],
    ])
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
