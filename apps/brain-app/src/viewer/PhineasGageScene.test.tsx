import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PhineasGageScene from './PhineasGageScene'
import { PHINEAS_GAGE, useCaseStudyViewStore } from './phineasGage'
import { useViewerStore } from './viewerStore'

describe('PhineasGageScene', () => {
  afterEach(() => {
    cleanup()
    useCaseStudyViewStore.getState().reset()
  })

  it('spiegelt den Schritt in Highlight, Schädel, Stange und Rod-Phase', () => {
    useViewerStore.setState({ highlight: [] })
    useCaseStudyViewStore.getState().reset()

    render(<PhineasGageScene asMode />)

    expect(screen.getByText(/Standalone-Gage-GLBs aus \/assets\/phineas/)).toBeInTheDocument()
    expect(screen.getByText(/generierte Eisenstangen-GLB/)).toBeInTheDocument()
    expect(useCaseStudyViewStore.getState().showSkull).toBe(true)
    expect(useCaseStudyViewStore.getState().rodVisible).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '▶' }))

    expect(useCaseStudyViewStore.getState().showSkull).toBe(true)
    expect(useCaseStudyViewStore.getState().rodVisible).toBe(true)
    expect(useCaseStudyViewStore.getState().rodPhase).toBe(PHINEAS_GAGE.steps[1].rodPhase)
  })
})
