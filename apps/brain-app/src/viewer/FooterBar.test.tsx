import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import FooterBar from './FooterBar'
import { useViewerStore } from './viewerStore'

describe('FooterBar', () => {
  beforeEach(() => {
    useViewerStore.setState({
      appMode: 'explore',
      hidden: new Set(),
      isolated: null,
      isolationPath: [],
      isolatedSlugs: new Set(),
      selected: null,
      selectedSlugs: new Set(),
      selectedLabels: null,
      selectMode: 'group',
    })
  })

  it('zeigt die Werkzeug-Box im Explorer', () => {
    render(<FooterBar />)
    expect(screen.getByText('Werkzeug')).toBeInTheDocument()
  })

  it('blendet die Werkzeug-Box ausserhalb des Explorers aus', () => {
    useViewerStore.setState({ appMode: 'learn' })
    render(<FooterBar />)
    expect(screen.queryByText('Werkzeug')).not.toBeInTheDocument()
  })

  it('wechselt den appMode ueber das Modus-Flyout', () => {
    render(<FooterBar />)
    fireEvent.click(screen.getByRole('button', { name: /Explorer/ })) // Modus-Box-Trigger oeffnen
    fireEvent.click(screen.getByRole('button', { name: /^Lernen$/ })) // Eintrag im Flyout
    expect(useViewerStore.getState().appMode).toBe('learn')
  })

  it('oeffnet die Quellen-Page ueber das Atlas-Menue', () => {
    render(<FooterBar />)
    fireEvent.click(screen.getByRole('button', { name: /Atlas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Quellen/ }))
    expect(screen.getByText(/CC Attribution-Share Alike 2\.1 Japan/)).toBeInTheDocument()
  })

  it('macht Auswahl-Shortcuts im Werkzeug-Flyout mobil erreichbar', () => {
    useViewerStore.setState({ selected: 'area-a', selectedSlugs: new Set(['area-a']) })
    render(<FooterBar />)

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl ausblenden' }))
    expect(useViewerStore.getState().hidden.has('area-a')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Werkzeug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl einblenden' }))
    expect(useViewerStore.getState().hidden.has('area-a')).toBe(false)
  })

  it('macht Isolation und Reset ohne Tastatur erreichbar', () => {
    useViewerStore.setState({ selected: 'area-a', selectedSlugs: new Set(['area-a']), hidden: new Set(['area-b']) })
    render(<FooterBar />)

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
})
