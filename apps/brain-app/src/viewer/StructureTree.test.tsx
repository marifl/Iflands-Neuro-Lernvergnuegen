import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StructureTree from './StructureTree'
import { useViewerStore } from './viewerStore'
import type { Ontology } from './ontology'

const labels = (value: string) => ({ de: value, la: value, en: value })

const ontology: Ontology = {
  version: 'test',
  space: 'test',
  structureCount: 2,
  tree: {
    id: 'brain',
    labels: labels('Brain'),
    children: [
      {
        id: 'frontal',
        labels: labels('Frontal'),
        children: [
          { id: 'area-a', slug: 'area-a', fma: 'area-a', side: 'left', labels: labels('Area A') },
          { id: 'area-b', slug: 'area-b', fma: 'area-b', side: 'right', labels: labels('Area B') },
        ],
      },
    ],
  },
}

describe('StructureTree Gruppenknoten', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    useViewerStore.setState({
      ontology,
      context: null,
      julich: null,
      atlas3d: { dkt: null, brodmann: null, destrieux: null },
      hidden: new Set(),
      selected: null,
      selectedSlugs: new Set(),
      selectedLabels: null,
      search: '',
      expanded: { taro: true },
      mode: 'full',
      lang: 'de',
    })
  })

  it('trennt Expand-Chevron von gesammelter Gruppenauswahl', () => {
    render(<StructureTree />)

    fireEvent.click(screen.getByRole('button', { name: 'Aufklappen Frontal' }))
    expect(screen.getByRole('button', { name: 'Area A' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Area A' }))
    expect(useViewerStore.getState().selectedSlugs).toEqual(new Set(['area-a']))
    expect(screen.getAllByText('teilweise').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /^Frontal/ }))
    expect(useViewerStore.getState().selected).toBe('frontal')
    expect(useViewerStore.getState().selectedSlugs).toEqual(new Set(['area-a', 'area-b']))
    expect(screen.getAllByText('aktiv').length).toBeGreaterThan(0)
  })

  it('aktiviert Atlas-Gruppen ohne fremde Atlanten mitzuschalten', () => {
    useViewerStore.setState({
      julich: {
        id: 'julich',
        labels: labels('Jülich'),
        children: [
          { id: 'julich-area-a-l', slug: 'julich-area-a-l', fma: 'julich-area-a-l', side: 'left', labels: labels('Area A') },
          { id: 'julich-area-b-l', slug: 'julich-area-b-l', fma: 'julich-area-b-l', side: 'left', labels: labels('Area B') },
        ],
      },
      atlas3d: {
        dkt: {
          id: 'dkt',
          labels: labels('DKT'),
          children: [
            { id: 'dkt-area-a-l', slug: 'dkt-area-a-l', fma: 'dkt-area-a-l', side: 'left', labels: labels('DKT A') },
          ],
        },
        brodmann: null,
        destrieux: null,
      },
      expanded: { taro: true },
    })

    render(<StructureTree />)

    fireEvent.click(screen.getByRole('button', { name: /^Jülich/ }))

    expect(useViewerStore.getState().selected).toBe('julich')
    expect(useViewerStore.getState().selectedSlugs).toEqual(new Set(['julich-area-a-l', 'julich-area-b-l']))
  })

  it('rendert keine kapitelweite Vertiefung im Explorer-Baum', () => {
    render(<StructureTree />)

    expect(screen.queryByText('Vertiefung')).not.toBeInTheDocument()
    expect(screen.queryByText('Kapitelweite Vertiefung')).not.toBeInTheDocument()
  })
})
