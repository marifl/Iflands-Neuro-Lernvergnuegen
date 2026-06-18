import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthoringTransformControls } from './AuthoringTransformControls'
import {
  AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  useAuthoringSnapshotStore,
  type AuthoringSnapshotState,
} from './authoringSnapshotStore'
import { useViewerStore } from './viewerStore'

const authoringState: AuthoringSnapshotState = {
  schemaVersion: AUTHORING_SNAPSHOT_STATE_SCHEMA_VERSION,
  registryContext: {
    collectionIds: ['device-eeg-10-20'],
    bonusContextIds: [],
  },
  authoringScenes: [
    {
      schemaVersion: 1,
      sceneId: 'test-authoring',
      assetInstances: [
        {
          instanceId: 'eeg-cap-01',
          assetId: 'asset:eeg-cap',
          collectionId: 'device-eeg-10-20',
          visible: true,
          transform: {
            position: [0, 1.2, 0],
            rotation: [0, 0.25, 0],
            scale: [0.8, 0.8, 0.8],
          },
          origin: { policy: 'asset-origin' },
          parts: [],
        },
      ],
    },
  ],
  timelines: [],
  activeSceneId: 'test-authoring',
  activeTargetRef: {
    targetKind: 'asset-instance',
    collectionId: 'device-eeg-10-20',
    instanceId: 'eeg-cap-01',
  },
}

describe('AuthoringTransformControls', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthoringSnapshotStore.getState().resetAuthoringSnapshotState()
    useViewerStore.setState({
      authoringEditMode: false,
      authoringTransformMode: 'translate',
      authoringTransformSpace: 'world',
      authoringTransformSnap: false,
      authoringTransformFrozen: false,
    })
  })

  it('zeigt die Viewport-Toolbar nur im Asset-Edit-Modus', () => {
    const { rerender } = render(<AuthoringTransformControls layout="toolbar" includeEditToggle includeResetAction />)

    expect(screen.queryByRole('toolbar', { name: 'Asset-Edit-Werkzeuge' })).not.toBeInTheDocument()

    act(() => {
      useViewerStore.setState({ authoringEditMode: true })
    })
    rerender(<AuthoringTransformControls layout="toolbar" includeEditToggle includeResetAction />)

    expect(screen.getByRole('toolbar', { name: 'Asset-Edit-Werkzeuge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verschieben' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Drehen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skalieren' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Welt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lokal' })).toBeInTheDocument()
  })

  it('schaltet Transform-Methode, Koordinatenraum, Snap und Gizmo-Lock', () => {
    useViewerStore.setState({ authoringEditMode: true })
    render(<AuthoringTransformControls layout="toolbar" includeEditToggle includeResetAction />)

    fireEvent.click(screen.getByRole('button', { name: 'Drehen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lokal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Snap aus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gizmo frei' }))

    expect(useViewerStore.getState().authoringTransformMode).toBe('rotate')
    expect(useViewerStore.getState().authoringTransformSpace).toBe('local')
    expect(useViewerStore.getState().authoringTransformSnap).toBe(true)
    expect(useViewerStore.getState().authoringTransformFrozen).toBe(true)
  })

  it('behält den Footer-Menuepfad zum Aktivieren von Asset-Edit bei', () => {
    render(<AuthoringTransformControls includeEditToggle includeNudgeAction includeResetAction />)

    expect(screen.getByRole('button', { name: 'Lokal' })).toHaveAccessibleDescription('Asset-Edit einschalten')
    fireEvent.click(screen.getByRole('button', { name: 'Asset-Edit aus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lokal' }))

    expect(useViewerStore.getState().authoringEditMode).toBe(true)
    expect(useViewerStore.getState().authoringTransformSpace).toBe('local')
  })

  it('schreibt numerische Transform-Eingaben als persistente Commands', () => {
    useViewerStore.setState({ authoringEditMode: true })
    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState(authoringState)
    render(<AuthoringTransformControls layout="toolbar" includeEditToggle includeResetAction />)

    fireEvent.change(screen.getByLabelText('Position X'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Rotation Y'), { target: { value: '90' } })

    const transform = useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform
    expect(transform?.position[0]).toBe(12)
    expect(transform?.rotation[1]).toBeCloseTo(Math.PI / 2)
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(2)
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.commands.map((command) => command.label)).toEqual([
      'Position X',
      'Rotation Y',
    ])
  })

  it('macht Undo, Redo und History-Cursor im Transform-UI bedienbar', () => {
    useViewerStore.setState({ authoringEditMode: true })
    useAuthoringSnapshotStore.getState().setAuthoringSnapshotState(authoringState)
    render(<AuthoringTransformControls layout="toolbar" includeEditToggle includeResetAction />)

    fireEvent.change(screen.getByLabelText('Position X'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform.position[0]).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform.position[0]).toBe(12)

    fireEvent.change(screen.getByLabelText('Position Y'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Transform-History'), { target: { value: '1' } })

    const transform = useAuthoringSnapshotStore.getState().authoring?.authoringScenes[0].assetInstances[0].transform
    expect(transform?.position).toEqual([12, 1.2, 0])
    expect(useAuthoringSnapshotStore.getState().authoringCommandHistory.cursor).toBe(1)
  })
})
