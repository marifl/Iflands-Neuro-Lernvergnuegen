import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../scene/sceneStore'
import { EEG_ELECTRODES, EEG_HEADSET_CONNECTIONS, erpSiteForScene, type EegSite } from './eegElectrodes'
import { useViewerStore } from './viewerStore'

const BAND_COLOR = '#2f6673'
const ELECTRODE_COLOR = '#d8ecef'
const ACTIVE_COLOR = '#f26b1f'

function Connector({ from, to }: { from: EegSite; to: EegSite }) {
  const fromPos = EEG_ELECTRODES[from].position
  const toPos = EEG_ELECTRODES[to].position
  const transform = useMemo(() => {
    const a = new THREE.Vector3(...fromPos)
    const b = new THREE.Vector3(...toPos)
    const direction = b.clone().sub(a)
    const length = direction.length()
    const midpoint = a.clone().add(b).multiplyScalar(0.5)
    const quaternion = length === 0
      ? new THREE.Quaternion()
      : new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return { length, midpoint, quaternion }
  }, [fromPos, toPos])

  if (transform.length === 0) return null
  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} renderOrder={4}>
      <cylinderGeometry args={[0.65, 0.65, transform.length, 8]} />
      <meshStandardMaterial color={BAND_COLOR} emissive={BAND_COLOR} emissiveIntensity={0.08} transparent opacity={0.72} depthWrite={false} />
    </mesh>
  )
}

function Electrode({ site, active, pulse }: { site: EegSite; active: boolean; pulse: number }) {
  const electrode = EEG_ELECTRODES[site]
  const intensity = active ? 0.35 + 1.35 * pulse : 0.08
  const radius = active ? 3.5 : 2.15
  return (
    <mesh name={`eeg-${site}`} position={electrode.position} renderOrder={5}>
      <sphereGeometry args={[radius, 16, 10]} />
      <meshStandardMaterial
        color={active ? ACTIVE_COLOR : ELECTRODE_COLOR}
        emissive={active ? ACTIVE_COLOR : ELECTRODE_COLOR}
        emissiveIntensity={intensity}
        roughness={0.45}
        metalness={0}
      />
    </mesh>
  )
}

export default function EegHeadset() {
  const appMode = useViewerStore((s) => s.appMode)
  const erpPulse = useViewerStore((s) => s.erpPulse)
  const scenes = useSceneStore((s) => s.scenes)
  const index = useSceneStore((s) => s.index)
  const site = erpSiteForScene(scenes[index])

  if (appMode !== 'learn' || !site) return null

  return (
    <group name="eeg-headset">
      {EEG_HEADSET_CONNECTIONS.map(([from, to]) => (
        <Connector key={`${from}-${to}`} from={from} to={to} />
      ))}
      {Object.keys(EEG_ELECTRODES).map((key) => {
        const electrodeSite = key as EegSite
        return <Electrode key={electrodeSite} site={electrodeSite} active={electrodeSite === site} pulse={erpPulse} />
      })}
    </group>
  )
}
