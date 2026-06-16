import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Scene } from '../types'
import Flowchart from './Flowchart'
import { icaWavePath } from './IcaSeparation'

function flowScene(data: Record<string, unknown>): Scene {
  return {
    id: 'ica-uebersicht',
    section: '11.4',
    author: 'ifland',
    order: 30,
    title: 'ICA',
    brain: { regions: [], camera: 'superior' },
    overlay: { kind: 'flowchart', position: 'right', size: 'md', data },
    companion: { summary: 'x', sources: [] },
  }
}

const nodes = [
  { id: 'p3a', label: 'P3a', result: 'Konfliktmonitoring', color: '#c0392b', site: 'Cz', source: 'ACC' },
  { id: 'p3b', label: 'P3b', result: 'Engagement', color: '#2f80ed', site: 'Pz', source: 'Parietal/Frontal' },
  { id: 'p3z', label: 'P3z', result: 'Inhibition', color: '#9b59b6', site: 'Cz', source: 'SMA/pre-SMA' },
]

describe('Flowchart', () => {
  it('rendert statische Flowchart-Nodes weiter unveraendert', () => {
    render(<Flowchart scene={flowScene({ nodes: [{ id: 'a', label: 'A', result: 'B' }] })} />)

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('rendert die ICA-Zerlegung mit pausierbarer Animation und Schematisch-Hinweis', () => {
    render(<Flowchart scene={flowScene({
      mode: 'ica-separation',
      evidence: 'Schematisch/didaktisch; keine Rohmesswerte',
      nodes,
    })} />)

    expect(screen.getByLabelText('ICA-Komponententrennung')).toBeInTheDocument()
    expect(screen.getByText('P3a')).toBeInTheDocument()
    expect(screen.getByText('P3b')).toBeInTheDocument()
    expect(screen.getByText('P3z')).toBeInTheDocument()
    expect(screen.getByText('Schematisch/didaktisch; keine Rohmesswerte')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('ICA-Animation pausieren'))

    expect(screen.getByLabelText('ICA-Animation abspielen')).toBeInTheDocument()
  })

  it('erzeugt getrennte Pfade fuer gemischtes Signal und Komponenten', () => {
    expect(icaWavePath(nodes, 'mixed', 0.25)).not.toEqual(icaWavePath(nodes, 'component', 0.25, 0))
    expect(icaWavePath(nodes, 'component', 0.25, 0)).not.toEqual(icaWavePath(nodes, 'component', 0.25, 1))
  })
})
