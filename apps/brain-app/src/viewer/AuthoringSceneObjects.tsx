import { TransformControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EEG_ELECTRODES, isEegSite, type EegSite } from './eegElectrodes'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import type { AuthoringAssetInstance, AuthoringSelectablePart, AuthoringTransform, Vec3 } from './authoringScene'
import { objectGraphIdForTarget, sequenceTargetRefFromAssetPart } from './sequenceTargetRef'
import { useViewerStore } from './viewerStore'
import { pickTargetFromTargetRef, sequenceTargetUserData } from './targetPicking'
import {
  activeAuthoringTransformTarget,
  applyAuthoringTransformCommand,
  type ActiveAuthoringTransformTarget,
} from './authoringTransformRuntime'

const DEVICE_BASE_COLOR = '#d8ecef'
const DEVICE_HELPER_COLOR = '#6d7c82'
const DEVICE_SELECT_COLOR = '#f26b1f'
const DEVICE_HOVER_COLOR = '#ffd2a8'
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

function sameTransform(a: AuthoringTransform, b: AuthoringTransform): boolean {
  return (
    a.position.every((value, index) => value === b.position[index]) &&
    a.rotation.every((value, index) => value === b.rotation[index]) &&
    a.scale.every((value, index) => value === b.scale[index])
  )
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
  const emissive = active ? DEVICE_SELECT_COLOR : hover ? DEVICE_HOVER_COLOR : '#000000'
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
  const controlsRef = useRef<any>(null)
  const beforeRef = useRef<AuthoringTransform | null>(null)
  const mode = useViewerStore((s) => s.authoringTransformMode)
  const space = useViewerStore((s) => s.authoringTransformSpace)
  const snap = useViewerStore((s) => s.authoringTransformSnap)
  const frozen = useViewerStore((s) => s.authoringTransformFrozen)
  const transformActive = Boolean(
    activeTransformTarget
      && activeTransformTarget.instance.collectionId === instance.collectionId
      && activeTransformTarget.instance.instanceId === instance.instanceId
      && !frozen,
  )

  if (!instance.visible || parts.length === 0) return null

  const group = (
    <group ref={groupRef} name={`authoring-instance:${instance.collectionId}:${instance.instanceId}`} {...transformProps(instance.transform)}>
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

  useEffect(() => {
    if (!transformActive) return
    const controls = controlsRef.current
    if (!controls) return
    const onMouseDown = () => {
      beforeRef.current = groupRef.current ? transformFromGroup(groupRef.current) : instance.transform
    }
    const onMouseUp = () => {
      const groupObject = groupRef.current
      if (!groupObject || !beforeRef.current) return
      const after = transformFromGroup(groupObject)
      if (sameTransform(beforeRef.current, after)) return
      const current = useAuthoringSnapshotStore.getState().authoring
      const target = activeAuthoringTransformTarget(current)
      if (!current || !target) return
      const result = applyAuthoringTransformCommand(
        current,
        target,
        after,
        `cmd:transform:${target.instance.instanceId}:${Date.now()}`,
        `Transform ${target.instance.instanceId}`,
      )
      useAuthoringSnapshotStore.getState().setAuthoringSnapshotState(result.authoring)
      if (import.meta.env.DEV) {
        ;(window as unknown as { __BRAIN_LAST_AUTHORING_COMMAND__?: unknown }).__BRAIN_LAST_AUTHORING_COMMAND__ = result.command
      }
    }
    controls.addEventListener('mouseDown', onMouseDown)
    controls.addEventListener('mouseUp', onMouseUp)
    return () => {
      controls.removeEventListener('mouseDown', onMouseDown)
      controls.removeEventListener('mouseUp', onMouseUp)
    }
  }, [instance.transform, transformActive])

  if (!transformActive) return group
  return (
    <TransformControls
      ref={controlsRef}
      mode={mode}
      space={space}
      translationSnap={snap ? 5 : undefined}
      rotationSnap={snap ? Math.PI / 12 : undefined}
      scaleSnap={snap ? 0.05 : undefined}
    >
      {group}
    </TransformControls>
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

  if (!activeScene) return null
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
