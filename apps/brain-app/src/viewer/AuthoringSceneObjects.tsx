import { useMemo } from 'react'
import { EEG_ELECTRODES, isEegSite, type EegSite } from './eegElectrodes'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import type { AuthoringAssetInstance, AuthoringSelectablePart, AuthoringTransform, Vec3 } from './authoringScene'
import { objectGraphIdForTarget, sequenceTargetRefFromAssetPart } from './sequenceTargetRef'
import { useViewerStore } from './viewerStore'
import { pickTargetFromTargetRef, sequenceTargetUserData } from './targetPicking'

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
  const hovered = useViewerStore((s) => s.hovered)
  const targetRef = useMemo(() => sequenceTargetRefFromAssetPart(instance, part), [instance, part])
  const target = useMemo(() => pickTargetFromTargetRef(targetRef, part.label), [targetRef, part.label])
  const pickable = part.pickable && part.role !== 'helper'
  const objectGraphId = target.objectGraphId
  const active = selectedSlugs.has(objectGraphId) || activeTargetId === objectGraphId
  const hover = hovered === objectGraphId
  const color = pickable ? DEVICE_BASE_COLOR : DEVICE_HELPER_COLOR
  const emissive = active ? DEVICE_SELECT_COLOR : hover ? DEVICE_HOVER_COLOR : '#000000'
  const emissiveIntensity = active ? 0.9 : hover ? 0.35 : 0

  return (
    <mesh
      name={objectGraphId}
      position={partPosition(part, index, count)}
      renderOrder={6}
      userData={sequenceTargetUserData(target, pickable)}
      raycast={pickable ? undefined : NO_RAYCAST}
    >
      <sphereGeometry args={[pickable ? 5 : 3, 20, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.42}
        metalness={0}
        transparent={!pickable}
        opacity={pickable ? 1 : 0.35}
        depthWrite={pickable}
      />
    </mesh>
  )
}

function AuthoringInstance({ instance, activeTargetId }: { instance: AuthoringAssetInstance; activeTargetId: string | null }) {
  const parts = instance.parts ?? []
  if (!instance.visible || parts.length === 0) return null
  return (
    <group name={`authoring-instance:${instance.collectionId}:${instance.instanceId}`} {...transformProps(instance.transform)}>
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

  if (!activeScene) return null
  return (
    <group name={`authoring-scene:${activeScene.sceneId}`}>
      {activeScene.assetInstances.map((instance) => (
        <AuthoringInstance
          key={`${instance.collectionId}:${instance.instanceId}`}
          instance={instance}
          activeTargetId={activeTargetId}
        />
      ))}
    </group>
  )
}
