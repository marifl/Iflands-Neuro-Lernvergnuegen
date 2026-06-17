import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShellControlButton, ShellStateBlock } from './ShellStatePrimitives'

describe('ShellStatePrimitives', () => {
  it('stellt Loading, Empty und Error als wiederverwendbare State-Bloecke bereit', () => {
    render(
      <>
        <ShellStateBlock state="loading" title="Atlas wird geladen" detail="Parzellen werden vorbereitet." />
        <ShellStateBlock state="empty" title="Keine Treffer" detail="Passe die Suche an." />
        <ShellStateBlock state="error" title="Atlas nicht ladbar" detail="HTTP 500" />
      </>,
    )

    expect(screen.getByRole('status', { name: 'Atlas wird geladen' })).toHaveTextContent('Parzellen werden vorbereitet.')
    expect(screen.getByRole('note', { name: 'Keine Treffer' })).toHaveTextContent('Passe die Suche an.')
    expect(screen.getByRole('alert', { name: 'Atlas nicht ladbar' })).toHaveTextContent('HTTP 500')
  })

  it('erklaert deaktivierte Controls sichtbar und screenreader-tauglich', () => {
    const onClick = vi.fn()

    render(
      <ShellControlButton disabledReason="Erst eine Struktur auswählen" onClick={onClick}>
        Auswahl isolieren
      </ShellControlButton>,
    )

    const button = screen.getByRole('button', { name: /Auswahl isolieren/ })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button).toHaveAccessibleDescription('Erst eine Struktur auswählen')
    expect(screen.getByText('Erst eine Struktur auswählen')).toBeVisible()

    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('laesst aktive Controls normal ausloesen', () => {
    const onClick = vi.fn()

    render(<ShellControlButton onClick={onClick}>Alles zeigen</ShellControlButton>)

    fireEvent.click(screen.getByRole('button', { name: 'Alles zeigen' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
