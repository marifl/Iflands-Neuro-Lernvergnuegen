import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StructureTree from './StructureTree'
import { useViewerStore } from './viewerStore'
import type { Ontology } from './ontology'

const labels = (value: string) => ({ de: value, la: value, en: value })

function mockViewportWidth(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => {
      const maxWidth = /max-width:\s*(\d+)px/.exec(query)?.[1]
      return {
        matches: maxWidth ? width <= Number(maxWidth) : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      } as unknown as MediaQueryList
    }),
  })
}

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
          {
            id: 'area-b',
            slug: 'area-b',
            fma: 'area-b',
            side: 'right',
            labels: labels('Area B'),
            searchAliases: ['ACC', 'cingullum'],
          },
        ],
      },
    ],
  },
}

describe('StructureTree Gruppenknoten', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    mockViewportWidth(1200)
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

  it('macht die mobile Expand-Zone als getrenntes 44px-Touch-Target erreichbar', () => {
    mockViewportWidth(390)
    render(<StructureTree />)

    const expandButton = screen.getByRole('button', { name: 'Aufklappen Frontal' })
    expect(expandButton).toHaveStyle({ width: '44px', minHeight: '44px' })

    fireEvent.click(expandButton)
    expect(screen.getByRole('button', { name: 'Area A' })).toBeInTheDocument()
    expect(useViewerStore.getState().selected).toBeNull()

    const groupButton = screen.getByRole('button', { name: /^Frontal/ })
    expect(groupButton).toHaveStyle({ minHeight: '44px' })
    fireEvent.click(groupButton)
    expect(useViewerStore.getState().selected).toBe('frontal')
    expect(useViewerStore.getState().selectedSlugs).toEqual(new Set(['area-a', 'area-b']))
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

  it('rendert Explorer-Roots in Registry-Reihenfolge und behaelt Atlas-Platzhalter bei', () => {
    useViewerStore.setState({
      context: {
        id: 'context',
        labels: labels('Kontext (Vollausbau)'),
        children: [
          { id: 'ctx-eye-l', slug: 'ctx-eye-l', fma: 'ctx-eye-l', side: 'left', labels: labels('Auge') },
        ],
      },
      julich: null,
      atlas3d: {
        dkt: {
          id: 'dkt-runtime',
          labels: labels('DKT runtime'),
          children: [
            { id: 'dkt-area-a-l', slug: 'dkt-area-a-l', fma: 'dkt-area-a-l', side: 'left', labels: labels('DKT A') },
          ],
        },
        brodmann: null,
        destrieux: {
          id: 'destrieux-runtime',
          labels: labels('Destrieux runtime'),
          children: [
            { id: 'destrieux-area-a-l', slug: 'destrieux-area-a-l', fma: 'destrieux-area-a-l', side: 'left', labels: labels('Destrieux A') },
          ],
        },
      },
      expanded: {},
    })

    const { container } = render(<StructureTree />)

    const text = container.textContent ?? ''
    let cursor = 0
    for (const label of ['TARO', 'Jülich', 'DKT', 'Brodmann', 'Destrieux', 'Kontext (Vollausbau)']) {
      const position = text.indexOf(label, cursor)
      expect(position).toBeGreaterThanOrEqual(cursor)
      cursor = position + label.length
    }
    expect(screen.getAllByText('Inhalt folgt')).toHaveLength(2)
  })

  it('findet sichtbare Kapitelrollen ueber die Strukturbaum-Suche', () => {
    useViewerStore.setState({
      ontology: {
        version: 'test',
        space: 'test',
        structureCount: 1,
        tree: {
          id: 'brain',
          labels: labels('Brain'),
          children: [
            {
              id: 'left-middle-frontal-gyrus',
              slug: 'left-middle-frontal-gyrus',
              fma: 'FMA:61806',
              side: 'left',
              labels: labels('Gyrus frontalis medius links'),
              k11Role: 'DLPFC',
            },
          ],
        },
      },
      search: 'DLPFC',
    })

    render(<StructureTree />)

    expect(screen.getByRole('button', { name: 'Gyrus frontalis medius links DLPFC' })).toBeInTheDocument()
  })

  it('bindet die Suche an den Store und rendert Label-, Alias- und Nulltreffer', () => {
    render(<StructureTree />)

    const searchInput = screen.getByPlaceholderText('Struktur suchen…')
    fireEvent.change(searchInput, { target: { value: 'Area A' } })
    expect(useViewerStore.getState().search).toBe('Area A')
    expect(screen.getByRole('button', { name: 'Area A' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Area B' })).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'cingullum' } })
    expect(screen.getByRole('button', { name: 'Area B' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Area A' })).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'kein-treffer' } })
    expect(screen.getByText('Keine Treffer.')).toBeInTheDocument()
  })

  it('rendert keine kapitelweite Vertiefung im Explorer-Baum', () => {
    render(<StructureTree />)

    expect(screen.queryByText('Vertiefung')).not.toBeInTheDocument()
    expect(screen.queryByText('Kapitelweite Vertiefung')).not.toBeInTheDocument()
  })
})
