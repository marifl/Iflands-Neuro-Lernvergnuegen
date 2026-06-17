import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExplorerLearningFlyout, { learningTargetForNode } from './ExplorerLearningFlyout'
import type { OntologyNode } from './ontology'

const labels = (value: string) => ({ de: value, la: value, en: value })

const accNode: OntologyNode = {
  id: 'left-anterior-cingulate',
  slug: 'left-anterior-cingulate',
  fma: 'left-anterior-cingulate',
  side: 'left',
  labels: labels('Anteriores Cingulum'),
  k11Role: 'ACC · Konfliktmonitoring',
}

const ofcNode: OntologyNode = {
  id: 'left-medial-orbital-gyrus',
  slug: 'left-medial-orbital-gyrus',
  fma: 'left-medial-orbital-gyrus',
  side: 'left',
  labels: labels('Medialer orbitofrontaler Cortex'),
  k11Role: 'VMPFC / OFC',
}

describe('ExplorerLearningFlyout', () => {
  it('ordnet ACC-nahe Knoten keiner Explorer-Lernszene mehr zu', () => {
    expect(learningTargetForNode(accNode)).toBeNull()
  })

  it('ordnet OFC/vmPFC-Knoten dem Phineas-Bonuskontext zu', () => {
    expect(learningTargetForNode(ofcNode)).toEqual({
      mode: 'phineas',
      label: 'Bonus-Kontext: Phineas Gage (OFC/vmPFC)',
      actionLabel: 'Bonus-Kontext öffnen',
      bonusContextId: 'phineas-gage',
      launch: {
        schemaVersion: 1,
        collectionId: 'case-phineas-gage',
        contextId: 'phineas-gage',
        entrypoint: { kind: 'app-mode', appMode: 'phineas' },
      },
    })
  })

  it('rendert Bonus-Kontext und ruft Zielnavigation auf', () => {
    const onClose = vi.fn()
    const onOpenAtlas = vi.fn()
    const onOpenTarget = vi.fn()
    const target = learningTargetForNode(ofcNode)!

    render(
      <ExplorerLearningFlyout
        node={ofcNode}
        target={target}
        atlasAvailable
        onClose={onClose}
        onOpenAtlas={onOpenAtlas}
        onOpenTarget={onOpenTarget}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Bonus-Kontext Medialer orbitofrontaler Cortex' })).toBeInTheDocument()
    expect(screen.getByText('VMPFC / OFC')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lernen öffnen' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bonus-Kontext öffnen' }))
    expect(onOpenTarget).toHaveBeenCalledWith(target)
    fireEvent.click(screen.getByRole('button', { name: 'Atlas öffnen' }))
    expect(onOpenAtlas).toHaveBeenCalledTimes(1)
  })

  it('rendert kompakt ohne doppelte Struktur-Beschriftung und ohne Lernaktion', () => {
    const target = learningTargetForNode(ofcNode)!

    render(
      <ExplorerLearningFlyout
        node={ofcNode}
        target={target}
        atlasAvailable
        compact
        onClose={() => {}}
        onOpenAtlas={() => {}}
        onOpenTarget={() => {}}
      />,
    )

    expect(screen.queryByText('Medialer orbitofrontaler Cortex')).not.toBeInTheDocument()
    expect(screen.queryByText('VMPFC / OFC')).not.toBeInTheDocument()
    expect(screen.getByText('Bonus-Kontext: Phineas Gage (OFC/vmPFC)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lernen öffnen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bonus-Kontext öffnen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atlas öffnen' })).toBeInTheDocument()
  })

  it('benennt Phineas als Bonus-Kontext-Aktion', () => {
    const onOpenTarget = vi.fn()
    const target = learningTargetForNode(ofcNode)!
    render(
      <ExplorerLearningFlyout
        node={ofcNode}
        target={target}
        atlasAvailable={false}
        onClose={() => {}}
        onOpenAtlas={() => {}}
        onOpenTarget={onOpenTarget}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bonus-Kontext öffnen' }))
    expect(onOpenTarget).toHaveBeenCalledWith(target)
  })

  it('schließt per Escape', () => {
    const onClose = vi.fn()
    render(
      <ExplorerLearningFlyout
        node={ofcNode}
        target={learningTargetForNode(ofcNode)!}
        atlasAvailable={false}
        onClose={onClose}
        onOpenAtlas={() => {}}
        onOpenTarget={() => {}}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
