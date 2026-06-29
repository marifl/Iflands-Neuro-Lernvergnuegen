import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import PresenterChrome from './PresenterChrome'
import { useSceneStore } from './sceneStore'
import { SceneSchema } from './types'
import type { LoadedScene, SequenceKind } from './scenes'

function loadedScene(
  id: string,
  title: string,
  stepIndex: number,
  stepCount: number,
  sequenceKind: SequenceKind = 'presentation',
): LoadedScene {
  return {
    ...SceneSchema.parse({
      id,
      section: '11.4',
      author: 'ifland',
      order: stepIndex,
      title,
      brain: { regions: ['acc-cingulum'], camera: 'medial-midline' },
      overlay: { kind: 'prose', position: 'right', size: 'md' },
      companion: { summary: 'x', sources: [] },
    }),
    configName: id,
    configCameraTargetMeshes: [],
    sequence: {
      kind: sequenceKind,
      name: sequenceKind === 'presentation' ? 'kapitel11-vorlesung' : 'kapitel11-pfad',
      label: sequenceKind === 'presentation' ? 'Kapitel 11 — Vorlesung' : 'Lernpfad Kapitel 11',
      stepIndex,
      stepCount,
    },
  }
}

beforeEach(() => {
  useSceneStore.setState({
    scenes: [
      loadedScene('basalganglienschleifen', 'Basalganglien-Schleifen', 0, 3),
      loadedScene('vcpt', 'VCPT und Go/No-go', 1, 3),
      loadedScene('p3a-konfliktmonitoring', 'P3a-Konfliktmonitoring', 2, 3),
    ],
    index: 1,
    step: 2,
  })
})

afterEach(() => {
  cleanup()
  useSceneStore.setState({ scenes: [], index: 0, step: 0 })
})

describe('PresenterChrome', () => {
  it('zeigt Vortrag, Folie, Step-Titel, Fortschritt und Sprungauswahl', () => {
    render(<PresenterChrome />)

    expect(screen.getByText('Vortrag')).toBeInTheDocument()
    expect(screen.getByText('Kapitel 11 — Vorlesung')).toBeInTheDocument()
    expect(screen.getByLabelText('Aktueller Vortragsschritt')).toHaveTextContent('Folie 2 / 3 · Step 3')
    expect(screen.getByText('VCPT und Go/No-go')).toBeInTheDocument()
    const stepPicker = screen.getByLabelText('Szene springen')
    expect(stepPicker.tagName).toBe('INPUT')
    expect(stepPicker).toHaveDisplayValue('2. VCPT und Go/No-go')
    // Scene-Nav ist Touch-Primaernavigation: Step-Picker + Prev/Next >= 44px (Shape §Touch-Targets).
    expect(stepPicker).toHaveStyle({ minHeight: '44px' })
    expect(screen.getByLabelText('Nächste Szene')).toHaveStyle({ minHeight: '44px' })
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3')
  })

  it('navigiert per Buttons und suchbarem Sprung ohne Debug-Konsole', () => {
    render(<PresenterChrome />)

    fireEvent.click(screen.getByLabelText('Nächste Szene'))
    expect(useSceneStore.getState().index).toBe(2)

    fireEvent.click(screen.getByLabelText('Vorige Szene'))
    expect(useSceneStore.getState().index).toBe(1)

    fireEvent.change(screen.getByLabelText('Szene springen'), { target: { value: 'p3a' } })
    fireEvent.click(screen.getByRole('option', { name: '3. P3a-Konfliktmonitoring' }))
    expect(useSceneStore.getState().index).toBe(2)
  })

  it('erklaert deaktivierte Rand-Navigation sichtbar und bleibt fokussierbar', () => {
    useSceneStore.setState({ index: 0, step: 0 })

    render(<PresenterChrome />)

    const previous = screen.getByLabelText('Vorige Szene')
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    expect(previous).not.toBeDisabled()
    expect(previous).toHaveAccessibleDescription('Erster Schritt')

    fireEvent.click(previous)
    expect(useSceneStore.getState().index).toBe(0)
  })

  it('benennt Nicht-Presentation-Sequenzen als Lernpfad', () => {
    useSceneStore.setState({
      scenes: [loadedScene('vcpt', 'VCPT', 0, 1, 'learning')],
      index: 0,
      step: 0,
    })

    render(<PresenterChrome />)

    expect(screen.getByText('Lernpfad')).toBeInTheDocument()
    expect(screen.getByText('Lernpfad Kapitel 11')).toBeInTheDocument()
  })
})
