import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Flyout from './Flyout'

describe('Flyout', () => {
  it('zeigt das Trigger-Label und blendet den Inhalt bei open=false aus', () => {
    render(
      <Flyout eyebrow="Modus" label="Lernen" open={false} onToggle={() => {}} onClose={() => {}}>
        <div>Panel-Inhalt</div>
      </Flyout>,
    )
    expect(screen.getByText('Lernen')).toBeInTheDocument()
    expect(screen.queryByText('Panel-Inhalt')).not.toBeInTheDocument()
  })

  it('zeigt den Inhalt bei open=true', () => {
    render(
      <Flyout eyebrow="Modus" label="Lernen" open onToggle={() => {}} onClose={() => {}}>
        <div>Panel-Inhalt</div>
      </Flyout>,
    )
    expect(screen.getByText('Panel-Inhalt')).toBeInTheDocument()
  })

  it('ruft onToggle beim Klick auf den Trigger', () => {
    const onToggle = vi.fn()
    render(
      <Flyout eyebrow="Modus" label="Lernen" open={false} onToggle={onToggle} onClose={() => {}}>
        <div>x</div>
      </Flyout>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Lernen/ }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('ruft onClose bei Escape, wenn offen', () => {
    const onClose = vi.fn()
    render(
      <Flyout eyebrow="Modus" label="Lernen" open onToggle={() => {}} onClose={onClose}>
        <div>x</div>
      </Flyout>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
