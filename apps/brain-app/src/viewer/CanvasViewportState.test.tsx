import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CanvasContentErrorBoundary, CanvasStatePanel } from './CanvasViewportState'

function BrokenCanvasChild() {
  throw new Error('brain.glb konnte nicht geladen werden')
  return null
}

describe('CanvasViewportState', () => {
  it('rendert den Canvas-Ladezustand als sichtbaren Status', () => {
    render(
      <CanvasStatePanel
        state="loading"
        title="3D-Hirn wird geladen"
        detail="BrainModel und Atlas-Layer werden vorbereitet."
      />,
    )

    expect(screen.getByRole('status', { name: '3D-Hirn wird geladen' })).toHaveTextContent(
      'BrainModel und Atlas-Layer werden vorbereitet.',
    )
  })

  it('faengt Canvas-Kindfehler viewport-lokal mit Grund ab', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <CanvasContentErrorBoundary
        resetKey="taro"
        renderFallback={(error) => (
          <CanvasStatePanel state="error" title="3D-Ansicht nicht ladbar" detail={error.message} />
        )}
      >
        <BrokenCanvasChild />
      </CanvasContentErrorBoundary>,
    )

    expect(screen.getByRole('alert', { name: '3D-Ansicht nicht ladbar' })).toHaveTextContent(
      'brain.glb konnte nicht geladen werden',
    )
    consoleError.mockRestore()
  })
})
