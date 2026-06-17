import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import IsolationBar from './IsolationBar'
import { useViewerStore, type IsolationCrumb } from './viewerStore'

const crumbs: IsolationCrumb[] = [
  { id: 'frontal-lobe', labels: { de: 'Frontallappen', la: 'Lobus frontalis', en: 'Frontal lobe' } },
  { id: 'dlpfc', labels: { de: 'DLPFC', la: 'Cortex praefrontalis dorsolateralis', en: 'DLPFC' } },
]

describe('IsolationBar', () => {
  beforeEach(() => {
    useViewerStore.setState({
      isolated: 'dlpfc',
      isolatedSlugs: new Set(['dlpfc']),
      isolationPath: crumbs,
      lang: 'de',
    })
  })

  it('rendert ohne Isolationspfad nichts', () => {
    useViewerStore.setState({ isolated: null, isolatedSlugs: new Set(), isolationPath: [] })

    render(<IsolationBar />)

    expect(screen.queryByRole('navigation', { name: 'Isolation' })).not.toBeInTheDocument()
  })

  it('rendert Breadcrumb-Aktionen als Buttons', () => {
    render(<IsolationBar />)

    expect(screen.getByRole('navigation', { name: 'Isolation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Frontallappen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DLPFC' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Isolation verlassen' })).toBeInTheDocument()
  })

  it('setzt Isolation ueber eine Breadcrumb-Stufe neu', () => {
    render(<IsolationBar />)

    fireEvent.click(screen.getByRole('button', { name: 'Frontallappen' }))
    expect(useViewerStore.getState().isolated).toBe('frontal-lobe')
  })

  it('setzt Isolation ueber Alle zurueck', () => {
    render(<IsolationBar />)

    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    expect(useViewerStore.getState().isolated).toBeNull()
  })

  it('setzt Isolation ueber den Schliessen-Button zurueck', () => {
    render(<IsolationBar />)

    fireEvent.click(screen.getByRole('button', { name: 'Isolation verlassen' }))
    expect(useViewerStore.getState().isolated).toBeNull()
  })
})
