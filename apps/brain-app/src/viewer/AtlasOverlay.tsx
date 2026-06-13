import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes } from './cutCapsMerged'

// Zwei Atlas-Overlay-Arten ueber TARO, beide halbtransparent + distinkt eingefaerbt:
//  - 'raw':   die ORIGINALEN Julich/DKT-Mesh-Areale (fremdes MNI-Hirn, eigene Polygonisierung),
//             per Affine grob auf TARO gelegt -> macht den Rest-Drift sichtbar.
//  - 'carve': die Atlas-Parzellen aus TARO-EIGENEN Vertices gecarvt -> liegen per Konstruktion
//             exakt (0 mm) auf der TARO-Oberflaeche. Zeigt, dass das Pin-Ziel deckungsgleich ist.
// Lazy: das GLB (4-22 MB) laedt erst beim Einblenden, weil die Komponente nur dann gemountet wird.
const URLS = {
  raw: { julich: '/assets/bodyparts3d/atlas-raw-julich.glb', dkt: '/assets/bodyparts3d/atlas-raw-dkt.glb' },
  carve: { julich: '/assets/bodyparts3d/atlas-carved-julich.glb', dkt: '/assets/bodyparts3d/atlas-carved-dkt.glb' },
} as const

// Roh = kuehle Toene (Teal/Pink), Carve = warme Toene (Orange/Lime) — auf einen Blick unterscheidbar.
const COLORS = {
  raw: { julich: '#39d3c4', dkt: '#e879c8' },
  carve: { julich: '#f5a623', dkt: '#b7e84f' },
} as const

function AtlasLayer({ kind, which }: { kind: 'raw' | 'carve'; which: 'julich' | 'dkt' }) {
  const { scene } = useGLTF(URLS[kind][which])
  const mat = useMemo(() => {
    const color = COLORS[kind][which]
    return new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.18,
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
      // Carve liegt exakt auf TARO -> ohne Offset z-fightet er. Leicht nach vorn ziehen.
      polygonOffset: kind === 'carve',
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  }, [kind, which])
  useMemo(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.material = mat
        m.raycast = () => {}
        m.renderOrder = 2
      }
    })
  }, [scene, mat])

  // Schnittebenen respektieren: das Overlay wird mit TARO mitgeschnitten (sonst ragt es im
  // Cut-Modus dort raus, wo TARO weggeschnitten ist, und wirkt faelschlich versetzt).
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const clipAtlas = useViewerStore((s) => s.clipAtlasOverlay)
  useEffect(() => {
    mat.clippingPlanes = clipAtlas && cutMode === 'slice' ? activeCutPlanes(cuts) : []
    mat.clipIntersection = false
  }, [mat, cuts, cutMode, clipAtlas])

  return <primitive object={scene} />
}

/** Mountet die Atlas-Layer (Roh + Carve) nur wenn der jeweilige Toggle an ist (lazy load). */
export default function AtlasOverlay() {
  const showJulich = useViewerStore((s) => s.showAtlasJulich)
  const showDkt = useViewerStore((s) => s.showAtlasDkt)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  return (
    <>
      {showJulich && <AtlasLayer kind="raw" which="julich" />}
      {showDkt && <AtlasLayer kind="raw" which="dkt" />}
      {showCarveJulich && <AtlasLayer kind="carve" which="julich" />}
      {showCarveDkt && <AtlasLayer kind="carve" which="dkt" />}
    </>
  )
}
