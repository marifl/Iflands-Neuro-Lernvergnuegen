import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'

const SUBPARCELS_GLB = '/assets/bodyparts3d/k11-subparcels.glb'
const SELECT_COLOR = '#f26b1f'

useGLTF.preload(SUBPARCELS_GLB)

/** Sub-Patches (ACC/SMA/pre-SMA) als echte TARO-Geometrie. Default unsichtbar; ein Mesh
 *  wird nur sichtbar + leuchtend, wenn sein Name im viewerStore.highlight-Array ist.
 *  polygonOffset haelt es vor dem Eltern-Gyrus (kein Z-Fighting). */
export default function SubParcels() {
  const { scene } = useGLTF(SUBPARCELS_GLB)
  const highlight = useViewerStore((s) => s.highlight)

  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.material = new THREE.MeshStandardMaterial({
          color: SELECT_COLOR,
          emissive: new THREE.Color(SELECT_COLOR),
          emissiveIntensity: 0.7,
          roughness: 0.6,
          metalness: 0,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
        m.raycast = () => {}
        list.push(m)
      }
    })
    return list
  }, [scene])

  useEffect(() => {
    const set = new Set(highlight)
    for (const m of meshes) m.visible = set.has(m.name)
  }, [meshes, highlight])

  return <primitive object={scene} />
}
