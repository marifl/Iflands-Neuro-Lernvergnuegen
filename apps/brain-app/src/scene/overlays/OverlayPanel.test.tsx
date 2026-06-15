import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OverlayPanel, { deepeningIdsForScene } from './OverlayPanel'
import type { Scene } from '../types'

vi.mock('../../useMediaQuery', () => ({
  useIsNarrow: () => false,
}))

vi.mock('../../viewer/AnimationPlayer', () => ({
  default: () => <div data-testid="animation-player" />,
}))

vi.mock('../../viewer/PhineasGageScene', () => ({
  default: () => <div data-testid="phineas-scene" />,
}))

function scene(id: string): Scene {
  return {
    id,
    section: '11.5',
    author: 'ifland',
    order: 70,
    title: id,
    brain: { regions: [], camera: 'lateral-left' },
    overlay: { kind: 'prose', position: 'right', size: 'md' },
    companion: { summary: 'Szenentext', sources: [] },
  }
}

describe('OverlayPanel Vertiefungen', () => {
  it('verortet kapitelweite Vertiefungen im Zusammenfassungs-Step', () => {
    expect(deepeningIdsForScene(scene('zusammenfassung'))).toEqual(['basalganglia', 'phineas'])

    render(<OverlayPanel scene={scene('zusammenfassung')} />)

    expect(screen.getByText('Kapitelweite Vertiefung')).toBeInTheDocument()
    expect(screen.getByTestId('animation-player')).toBeInTheDocument()
    expect(screen.getByTestId('phineas-scene')).toBeInTheDocument()
  })

  it('haelt fachliche Einzelszenen frei von kapitelweiten Vertiefungen', () => {
    expect(deepeningIdsForScene(scene('p3a-konfliktmonitoring'))).toEqual([])

    render(<OverlayPanel scene={scene('p3a-konfliktmonitoring')} />)

    expect(screen.queryByText('Kapitelweite Vertiefung')).not.toBeInTheDocument()
    expect(screen.queryByTestId('animation-player')).not.toBeInTheDocument()
    expect(screen.queryByTestId('phineas-scene')).not.toBeInTheDocument()
  })
})
