import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { REGULAR_APP_MODE_DEFINITIONS } from './appModeDefinitions'
import ModeLauncher from './ModeLauncher'

describe('ModeLauncher', () => {
  it('rendert die regulären Modi aus der gemeinsamen Definition', () => {
    render(<ModeLauncher onPick={() => {}} />)

    for (const definition of REGULAR_APP_MODE_DEFINITIONS) {
      expect(screen.getByRole('button', { name: new RegExp(definition.label) })).toBeInTheDocument()
      expect(screen.getByText(definition.description)).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /Atlas/ })).not.toBeInTheDocument()
  })

  it('meldet den gewählten Modus zurück', () => {
    const onPick = vi.fn()
    render(<ModeLauncher onPick={onPick} />)

    fireEvent.click(screen.getByRole('button', { name: /Explorer/ }))
    expect(onPick).toHaveBeenCalledWith('explore')
  })
})
