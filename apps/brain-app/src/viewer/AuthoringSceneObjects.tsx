import { TransformControls } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { EEG_ELECTRODES, isEegSite, type EegSite } from './eegElectrodes'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import type { AuthoringAssetInstance, AuthoringSelectablePart, AuthoringTransform, Vec3 } from './authoringScene'
import { objectGraphIdForTarget, sequenceTargetRefFromAssetPart } from './sequenceTargetRef'
import { useViewerStore } from './viewerStore'
import { pickTargetFromTargetRef, sequenceTargetUserData } from './targetPicking'
import {
  activeAuthoringTransformTarget,
  applyAuthoringTransformDraft,
  applyAuthoringTransformTransaction,
  type ActiveAuthoringTransformTarget,
} from './authoringTransformRuntime'
import { registerAuthoringTransformDraft } from './authoringTransformDraftRegistry'
import { ATLAS_VIEWER_COLORS } from './atlasColorSystem'
import { MANIFEST_AUTHORING_SCENE_ID } from './manifestAuthoringRuntime'

const DEVICE_BASE_COLOR = '#d8ecef'
const DEVICE_HELPER_COLOR = '#6d7c82'
const DEVICE_SELECT_COLOR = ATLAS_VIEWER_COLORS.selection
const DEVICE_HOVER_COLOR = ATLAS_VIEWER_COLORS.hover
const EMISSIVE_OFF_COLOR = ATLAS_VIEWER_COLORS.emissiveOff
const NO_RAYCAST = () => {}

function siteFromPart(part: AuthoringSelectablePart): EegSite | null {
  const source = `${part.partId} ${part.nodeName ?? ''}`.toLowerCase()
  for (const site of Object.keys(EEG_ELECTRODES) as EegSite[]) {
    if (source.includes(site.toLowerCase())) return site
  }
  return null
}

function partPosition(part: AuthoringSelectablePart, index: number, count: number): Vec3 {
  const site = siteFromPart(part)
  if (site && isEegSite(site)) {
    const [x, y, z] = EEG_ELECTRODES[site].position
    return [x, y, z + 70]
  }
  const angle = (Math.PI * 2 * index) / Math.max(count, 1)
  return [Math.cos(angle) * 36, 82, 44 + Math.sin(angle) * 24]
}

function transformProps(transform: AuthoringTransform): {
  position: Vec3
  rotation: Vec3
  scale: Vec3
} {
  return {
    position: transform.position,
    rotation: transform.rotation,
    scale: transform.scale,
  }
}

function transformFromGroup(group: THREE.Group): AuthoringTransform {
  return {
    position: [group.position.x, group.position.y, group.position.z],
    rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
    scale: [group.scale.x, group.scale.y, group.scale.z],
  }
}

function AuthoringPartMesh({
  instance,
  part,
  index,
  count,
  activeTargetId,
}: {
  instance: AuthoringAssetInstance
  part: AuthoringSelectablePart
  index: number
  count: number
  activeTargetId: string | null
}) {
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const targetRef = useMemo(() => sequenceTargetRefFromAssetPart(instance, part), [instance, part])
  const target = useMemo(() => pickTargetFromTargetRef(targetRef, part.label), [targetRef, part.label])
  const pickable = part.pickable && part.role !== 'helper'
  const objectGraphId = target.objectGraphId
  const visible = !hidden.has(objectGraphId)
  const isoDimmed = isolatedSlugs.size > 0 && !isolatedSlugs.has(objectGraphId)
  const active = selectedSlugs.has(objectGraphId) || activeTargetId === objectGraphId
  const hover = hovered === objectGraphId
  const color = pickable ? DEVICE_BASE_COLOR : DEVICE_HELPER_COLOR
  const emissive = active ? DEVICE_SELECT_COLOR : hover ? DEVICE_HOVER_COLOR : EMISSIVE_OFF_COLOR
  const emissiveIntensity = active ? 0.9 : hover ? 0.35 : 0
  const targetPickable = pickable && visible && !isoDimmed

  if (!visible) return null

  return (
    <mesh
      name={objectGraphId}
      position={partPosition(part, index, count)}
      renderOrder={6}
      userData={sequenceTargetUserData(target, pickable)}
      raycast={targetPickable ? undefined : NO_RAYCAST}
    >
      <sphereGeometry args={[pickable ? 5 : 3, 20, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.42}
        metalness={0}
        transparent={!pickable || isoDimmed}
        opacity={isoDimmed ? 0.18 : pickable ? 1 : 0.35}
        depthWrite={pickable && !isoDimmed}
      />
    </mesh>
  )
}

function AuthoringInstance({
  instance,
  activeTargetId,
  activeTransformTarget,
}: {
  instance: AuthoringAssetInstance
  activeTargetId: string | null
  activeTransformTarget: ActiveAuthoringTransformTarget | null
}) {
  const parts = instance.parts ?? []
  const groupRef = useRef<THREE.Group>(null)
  const beforeRef = useRef<AuthoringTransform | null>(null)
  const draggingRef = useRef(false)
  const mode = useViewerStore((s) => s.authoringTransformMode)
  const space = useViewerStore((s) => s.authoringTransformSpace)
  const snap = useViewerStore((s) => s.authoringTransformSnap)
  const frozen = useViewerStore((s) => s.authoringTransformFrozen)
  const editMode = useViewerStore((s) => s.authoringEditMode)
  const transformActive = Boolean(
    editMode
      && activeTransformTarget
      && activeTransformTarget.instance.collectionId === instance.collectionId
      && activeTransformTarget.instance.instanceId === instance.instanceId
      && !frozen,
  )

  if (!instance.visible || parts.length === 0) return null

  const groupTransformProps = draggingRef.current ? {} : transformProps(instance.transform)
  const group = (
    <group ref={groupRef} name={`authoring-instance:${instance.collectionId}:${instance.instanceId}`} {...groupTransformProps}>
      {parts.map((part, index) => (
        <AuthoringPartMesh
          key={part.partId}
          instance={instance}
          part={part}
          index={index}
          count={parts.length}
          activeTargetId={activeTargetId}
        />
      ))}
    </group>
  )

  const captureBefore = useCallback(() => {
    const groupObject = groupRef.current
    beforeRef.current = groupObject ? transformFromGroup(groupObject) : instance.transform
    draggingRef.current = true
  }, [instance.transform])

  const commitAfter = useCallback((): boolean => {
    const groupObject = groupRef.current
    if (!groupObject) return false
    const after = transformFromGroup(groupObject)
    const current = useAuthoringSnapshotStore.getState().authoring
    const before = beforeRef.current
    const result = before
      ? applyAuthoringTransformTransaction(current, {
          collectionId: instance.collectionId,
          instanceId: instance.instanceId,
          before,
          after,
          commandId: `cmd:transform:${instance.instanceId}:${Date.now()}`,
          label: `Transform ${instance.instanceId}`,
        })
      : applyAuthoringTransformDraft(current, {
          collectionId: instance.collectionId,
          instanceId: instance.instanceId,
          transform: after,
          commandId: `cmd:transform:${instance.instanceId}:${Date.now()}`,
          label: `Transform ${instance.instanceId}`,
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
  }, [instance.collectionId, instance.instanceId])

  const noteLiveChange = useCallback(() => {
    groupRef.current?.updateMatrixWorld(true)
  }, [])

  useEffect(() => {
    if (!transformActive) return
    const unregisterDraft = registerAuthoringTransformDraft(commitAfter)
    return () => {
      commitAfter()
      unregisterDraft()
    }
  }, [commitAfter, transformActive])

  if (!transformActive) return group
  return (
    <>
      {group}
      <TransformControls
        object={groupRef as RefObject<THREE.Object3D>}
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

export default function AuthoringSceneObjects() {
  const authoring = useAuthoringSnapshotStore((s) => s.authoring)
  const activeScene = useMemo(() => {
    if (!authoring) return null
    return authoring.authoringScenes.find((scene) => scene.sceneId === authoring.activeSceneId)
      ?? authoring.authoringScenes[0]
      ?? null
  }, [authoring])
  const activeTargetId = authoring?.activeTargetRef ? objectGraphIdForTarget(authoring.activeTargetRef) : null
  const activeTransformTarget = useMemo(() => activeAuthoringTransformTarget(authoring), [authoring])

  if (!activeScene || activeScene.sceneId === MANIFEST_AUTHORING_SCENE_ID) return null
  return (
    <group name={`authoring-scene:${activeScene.sceneId}`}>
      {activeScene.assetInstances.map((instance) => (
        <AuthoringInstance
          key={`${instance.collectionId}:${instance.instanceId}`}
          instance={instance}
          activeTargetId={activeTargetId}
          activeTransformTarget={activeTransformTarget}
        />
      ))}
    </group>
  )
}
