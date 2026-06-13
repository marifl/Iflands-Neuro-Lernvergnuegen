import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'

// Roh-Atlas-Overlays: die ORIGINALEN Julich/DKT-Mesh-Areale (eigene Polygonisierung), per globaler
// Affine MNI->TARO auf das TARO-Hirn gelegt. Halbtransparent + distinkte Farbe, damit der Rest-Drift
// gegenueber der TARO-Oberflaeche sichtbar wird. Lazy: das GLB (13-22 MB) laedt erst beim Einblenden,
// weil die Komponente nur dann gemountet wird.
const URLS = {
  julich: '/assets/bodyparts3d/atlas-raw-julich.glb',
  dkt: '/assets/bodyparts3d/atlas-raw-dkt.glb',
} as const

const COLORS = { julich: '#39d3c4', dkt: '#e879c8' } as const

function RawAtlas({ which }: { which: 'julich' | 'dkt' }) {
  const { scene } = useGLTF(URLS[which])
  useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS[which],
      emissive: new THREE.Color(COLORS[which]),
      emissiveIntensity: 0.18,
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.material = mat
        m.raycast = () => {}
        m.renderOrder = 2
      }
    })
    return null
  }, [scene, which])
  return <primitive object={scene} />
}

/** Mountet die Roh-Atlas-Layer nur wenn der jeweilige Toggle an ist (lazy load). */
export default function AtlasOverlay() {
  const showJulich = useViewerStore((s) => s.showAtlasJulich)
  const showDkt = useViewerStore((s) => s.showAtlasDkt)
  return (
    <>
      {showJulich && <RawAtlas which="julich" />}
      {showDkt && <RawAtlas which="dkt" />}
    </>
  )
}
