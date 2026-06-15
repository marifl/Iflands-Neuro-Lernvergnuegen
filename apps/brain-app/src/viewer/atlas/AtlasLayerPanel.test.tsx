import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AtlasLayerPanel } from './AtlasLayerPanel'
import type { AtlasLayer } from './atlasAssets'

const layers: AtlasLayer[] = [
  { id: 'dkt', axis: 'macro', label_de: 'DKT' },
]

const baseProps = {
  layers,
  active: 'dkt',
  onSelect: vi.fn(),
  surface: 'pial' as const,
  onSurface: vi.fn(),
  onToggleSub: vi.fn(),
}

describe('AtlasLayerPanel', () => {
  it('shows the hovered area before the persistent pick', () => {
    render(<AtlasLayerPanel {...baseProps} picked="Gyrus frontalis" hovered="Sulcus centralis" />)

    expect(screen.getByText('Sulcus centralis')).toBeInTheDocument()
    expect(screen.getByText('unter Cursor')).toBeInTheDocument()
    expect(screen.queryByText('Gyrus frontalis')).not.toBeInTheDocument()
  })

  it('falls back to the picked area when nothing is hovered', () => {
    render(<AtlasLayerPanel {...baseProps} picked="Gyrus frontalis" hovered="—" />)

    expect(screen.getByText('Gyrus frontalis')).toBeInTheDocument()
    expect(screen.getByText('ausgewählt')).toBeInTheDocument()
  })
})
