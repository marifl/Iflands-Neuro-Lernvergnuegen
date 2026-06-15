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
  it('ordnet ACC-nahe Knoten der P3a-Lernszene zu', () => {
    expect(learningTargetForNode(accNode)).toMatchObject({
      sceneId: 'p3a-konfliktmonitoring',
      configName: 'p3a-konfliktmonitoring',
      mode: 'learn',
      label: 'P3a - Konfliktmonitoring',
    })
  })

  it('ordnet OFC/vmPFC-Knoten der Phineas-Fallstudie zu', () => {
    expect(learningTargetForNode(ofcNode)).toEqual({
      mode: 'phineas',
      label: 'Phineas Gage - OFC/vmPFC',
      actionLabel: 'Phineas öffnen',
    })
  })

  it('rendert Lernbezug und ruft Lernnavigation auf', () => {
    const onClose = vi.fn()
    const onOpenAtlas = vi.fn()
    const onOpenLearn = vi.fn()
    const target = learningTargetForNode(accNode)!

    render(
      <ExplorerLearningFlyout
        node={accNode}
        target={target}
        atlasAvailable
        onClose={onClose}
        onOpenAtlas={onOpenAtlas}
        onOpenLearn={onOpenLearn}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Lernbezug Anteriores Cingulum' })).toBeInTheDocument()
    expect(screen.getByText('ACC · Konfliktmonitoring')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lernen öffnen' }))
    expect(onOpenLearn).toHaveBeenCalledWith(target)
    fireEvent.click(screen.getByRole('button', { name: 'Atlas öffnen' }))
    expect(onOpenAtlas).toHaveBeenCalledTimes(1)
  })

  it('benennt den Phineas-Modus als eigene Aktion', () => {
    const onOpenLearn = vi.fn()
    const target = learningTargetForNode(ofcNode)!
    render(
      <ExplorerLearningFlyout
        node={ofcNode}
        target={target}
        atlasAvailable={false}
        onClose={() => {}}
        onOpenAtlas={() => {}}
        onOpenLearn={onOpenLearn}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Phineas öffnen' }))
    expect(onOpenLearn).toHaveBeenCalledWith(target)
  })

  it('schließt per Escape', () => {
    const onClose = vi.fn()
    render(
      <ExplorerLearningFlyout
        node={accNode}
        target={learningTargetForNode(accNode)!}
        atlasAvailable={false}
        onClose={onClose}
        onOpenAtlas={() => {}}
        onOpenLearn={() => {}}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
