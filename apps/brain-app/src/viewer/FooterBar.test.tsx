import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import FooterBar from './FooterBar'
import { useViewerStore } from './viewerStore'

describe('FooterBar', () => {
  beforeEach(() => {
    useViewerStore.setState({ appMode: 'explore', selectMode: 'group' })
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
})
