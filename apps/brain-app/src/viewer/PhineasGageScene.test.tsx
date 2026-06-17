import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PhineasGageScene from './PhineasGageScene'
import { PHINEAS_GAGE } from './phineasGage'
import { useViewerStore } from './viewerStore'

describe('PhineasGageScene', () => {
  afterEach(() => {
    cleanup()
  })

  it('spiegelt den Schritt in Highlight, Schädel, Stange und Rod-Phase', () => {
    useViewerStore.setState({
      highlight: [],
      showSkull: false,
      rodVisible: false,
      rodPhase: 0,
    })

    render(<PhineasGageScene asMode />)

    expect(screen.getByText(/Standalone-Gage-GLBs aus \/assets\/phineas/)).toBeInTheDocument()
    expect(screen.getByText(/generierte Eisenstangen-GLB/)).toBeInTheDocument()
    expect(useViewerStore.getState().showSkull).toBe(true)
    expect(useViewerStore.getState().rodVisible).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '▶' }))

    expect(useViewerStore.getState().showSkull).toBe(true)
    expect(useViewerStore.getState().rodVisible).toBe(true)
    expect(useViewerStore.getState().rodPhase).toBe(PHINEAS_GAGE.steps[1].rodPhase)
  })
})
