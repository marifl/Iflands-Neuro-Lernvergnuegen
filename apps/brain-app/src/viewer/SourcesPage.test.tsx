import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SourcesPage from './SourcesPage'

describe('SourcesPage', () => {
  it('zeigt die BodyParts3D-Attribution', () => {
    render(<SourcesPage onClose={() => {}} />)
    expect(screen.getAllByText(/BodyParts3D/).length).toBeGreaterThan(0)
    expect(screen.getByText(/CC Attribution-Share Alike 2\.1 Japan/)).toBeInTheDocument()
  })

  it('schliesst bei Klick auf Schliessen', () => {
    const onClose = vi.fn()
    render(<SourcesPage onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Schliessen/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('schliesst bei Escape', () => {
    const onClose = vi.fn()
    render(<SourcesPage onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
