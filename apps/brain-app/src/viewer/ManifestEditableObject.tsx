import { TransformControls } from '@react-three/drei'
import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { AssetManifestEntry } from './assetManifest'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import type { AuthoringTransform } from './authoringScene'
import {
  activeAuthoringTransformTarget,
  applyAuthoringTransformDraft,
  applyAuthoringTransformTransaction,
} from './authoringTransformRuntime'
import { registerAuthoringTransformDraft } from './authoringTransformDraftRegistry'
import { manifestAuthoringTransform } from './manifestAuthoringRuntime'
import { useViewerStore } from './viewerStore'

function applyTransform(object: THREE.Object3D, transform: AuthoringTransform): void {
  object.position.set(...transform.position)
  object.rotation.set(...transform.rotation)
  object.scale.set(...transform.scale)
  object.updateMatrix()
  object.updateMatrixWorld(true)
}

function transformFromObject(object: THREE.Object3D): AuthoringTransform {
  return {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: [object.scale.x, object.scale.y, object.scale.z],
  }
}

export default function ManifestEditableObject({ object, asset }: { object: THREE.Object3D; asset: AssetManifestEntry }) {
  const authoring = useAuthoringSnapshotStore((s) => s.authoring)
  const editMode = useViewerStore((s) => s.authoringEditMode)
  const mode = useViewerStore((s) => s.authoringTransformMode)
  const space = useViewerStore((s) => s.authoringTransformSpace)
  const snap = useViewerStore((s) => s.authoringTransformSnap)
  const frozen = useViewerStore((s) => s.authoringTransformFrozen)
  const beforeRef = useRef<AuthoringTransform | null>(null)
  const draggingRef = useRef(false)
  const transform = manifestAuthoringTransform(authoring, asset)
  const activeTarget = activeAuthoringTransformTarget(authoring)
  const transformActive = Boolean(
    editMode &&
    !frozen &&
    asset.runtimeInstanceId &&
    activeTarget?.instance.collectionId === asset.collectionId &&
    activeTarget.instance.instanceId === asset.runtimeInstanceId,
  )

  useEffect(() => {
    if (draggingRef.current) return
    applyTransform(object, transform)
  }, [object, transform])

  const captureBefore = useCallback(() => {
    beforeRef.current = transformFromObject(object)
    draggingRef.current = true
  }, [object])

  const commitAfter = useCallback((): boolean => {
    if (!asset.runtimeInstanceId) return false
    const after = transformFromObject(object)
    const current = useAuthoringSnapshotStore.getState().authoring
    const before = beforeRef.current
    const result = before
      ? applyAuthoringTransformTransaction(current, {
          collectionId: asset.collectionId,
          instanceId: asset.runtimeInstanceId,
          before,
          after,
          commandId: `cmd:transform:${asset.runtimeInstanceId}:${Date.now()}`,
          label: `Transform ${asset.runtimeInstanceId}`,
        })
      : applyAuthoringTransformDraft(current, {
          collectionId: asset.collectionId,
          instanceId: asset.runtimeInstanceId,
          transform: after,
          commandId: `cmd:transform:${asset.runtimeInstanceId}:${Date.now()}`,
          label: `Transform ${asset.runtimeInstanceId}`,
        })
    beforeRef.current = null
    draggingRef.current = false
    if (!result) return false
    const store = useAuthoringSnapshotStore.getState()
    store.setAuthoringSnapshotState(result.authoring)
    store.recordAuthoringCommand(result.command)
    if (import.meta.env.DEV) {
      ;(window as unknown as { __BRAIN_LAST_AUTHORING_COMMAND__?: unknown }).__BRAIN_LAST_AUTHORING_COMMAND__ = result.command
    }
    return true
  }, [asset.collectionId, asset.runtimeInstanceId, object])

  const noteLiveChange = useCallback(() => {
    object.updateMatrixWorld(true)
  }, [object])

  useEffect(() => {
    if (!transformActive) return
    const unregisterDraft = registerAuthoringTransformDraft(commitAfter)
    return () => {
      commitAfter()
      unregisterDraft()
    }
  }, [commitAfter, transformActive])

  if (!transformActive) return <primitive object={object} />
  return (
    <>
      <primitive object={object} />
      <TransformControls
        object={object}
        mode={mode}
        space={space}
        translationSnap={snap ? 5 : undefined}
        rotationSnap={snap ? Math.PI / 12 : undefined}
        scaleSnap={snap ? 0.05 : undefined}
        onMouseDown={captureBefore}
        onMouseUp={commitAfter}
        onObjectChange={noteLiveChange}
      />
    </>
  )
}
