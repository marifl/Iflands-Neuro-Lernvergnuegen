import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeatmapColorbar } from './HeatmapColorbar'
import type { ContinuousScale } from './overlayContract'

const scale: ContinuousScale = { min: -3, max: 3, unit: 'z-score', colormap: 'diverging', clamp: true }

describe('HeatmapColorbar', () => {
  it('zeigt Min, Max und Einheit', () => {
    render(<HeatmapColorbar scale={scale} />)
    expect(screen.getByText('-3')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('z-score')).toBeTruthy()
  })

  it('rendert die Skala als beschriftetes Gradient-Bild', () => {
    render(<HeatmapColorbar scale={scale} />)
    const bar = screen.getByRole('img')
    expect(bar.getAttribute('aria-label')).toContain('diverging')
    expect(bar.style.background).toContain('linear-gradient')
  })

  it('zeigt eine Threshold-Markierung nur wenn threshold gesetzt ist', () => {
    const { container, rerender } = render(<HeatmapColorbar scale={scale} />)
    expect(container.querySelector('.heatmap-colorbar__threshold')).toBeNull()
    rerender(<HeatmapColorbar scale={{ ...scale, threshold: 1.5 }} />)
    expect(container.querySelector('.heatmap-colorbar__threshold')).not.toBeNull()
  })
})
