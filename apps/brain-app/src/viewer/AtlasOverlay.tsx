import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes } from './cutCapsMerged'
import { parcelColor, ATLAS_PARCEL_FLAG } from './atlasParcels'

// Zwei Atlas-Overlay-Arten ueber TARO:
//  - 'raw':   die ORIGINALEN Julich/DKT-Mesh-Areale (fremdes MNI-Hirn), per Affine grob auf TARO
//             gelegt -> Debug-Ansicht, die den Rest-Drift sichtbar macht (eine Flachfarbe).
//  - 'carve': die Atlas-Parzellen aus TARO-EIGENEN Vertices gecarvt -> liegen exakt (0 mm) auf der
//             TARO-Oberflaeche. Lern-Ansicht: jedes Areal eigene Farbe, opak, anklickbar (Name).
// Lazy: das GLB laedt erst beim Einblenden, weil die Komponente nur dann gemountet wird.
const URLS = {
  raw: { julich: '/assets/bodyparts3d/atlas-raw-julich.glb', dkt: '/assets/bodyparts3d/atlas-raw-dkt.glb' },
  carve: { julich: '/assets/bodyparts3d/atlas-carved-julich.glb', dkt: '/assets/bodyparts3d/atlas-carved-dkt.glb' },
} as const

// Roh-Debug: eine kuehle Flachfarbe je Quelle (Drift auf einen Blick erkennbar).
const RAW_COLOR = { julich: '#39d3c4', dkt: '#e879c8' } as const

function AtlasLayer({ kind, which }: { kind: 'raw' | 'carve'; which: 'julich' | 'dkt' }) {
  const { scene } = useGLTF(URLS[kind][which])

  // Materialien je Mesh setzen. Raw: eine Flachfarbe (Debug). Carve: per-Areal-Farbe, opak,
  // pickbar (Flag) -> CutPickBridge zeigt beim Klick den Areal-Namen.
  const materials = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (kind === 'raw') {
        const color = RAW_COLOR[which]
        m.material = new THREE.MeshStandardMaterial({
          color, emissive: new THREE.Color(color), emissiveIntensity: 0.18,
          roughness: 0.7, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
        })
        m.raycast = () => {} // Roh-Overlay nicht pickbar (Debug)
      } else {
        // Carve-Areal auf der TARO-Oberflaeche. Damit die umgebende Anatomie (Dura, Sinus,
        // Marklager …) im „Voller Atlas" die Areale nicht verdeckt: ohne Tiefentest + hohe
        // renderOrder ZULETZT zeichnen -> die kameranahe Kortex-Seite wird auf alles gemalt.
        // FrontSide cullt die Rueckseite (Hirn ist konvex) -> kein Durchscheinen der Gegenseite.
        m.material = new THREE.MeshStandardMaterial({
          color: parcelColor(m.name), roughness: 0.78, metalness: 0, side: THREE.FrontSide,
          depthTest: false, depthWrite: false,
        })
        m.userData[ATLAS_PARCEL_FLAG] = true // pickbar via CutPickBridge (zeigt Areal-Name)
        m.renderOrder = 10
      }
      m.renderOrder = m.renderOrder || 2
      mats.push(m.material as THREE.MeshStandardMaterial)
    })
    return mats
  }, [scene, kind, which])

  // Schnittebenen respektieren: das Overlay wird mit TARO mitgeschnitten (sonst ragt es im
  // Cut-Modus dort raus, wo TARO weggeschnitten ist, und wirkt faelschlich versetzt).
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const clipAtlas = useViewerStore((s) => s.clipAtlasOverlay)
  useEffect(() => {
    const planes = clipAtlas && cutMode === 'slice' ? activeCutPlanes(cuts) : []
    for (const mat of materials) {
      mat.clippingPlanes = planes
      mat.clipIntersection = false
    }
  }, [materials, cuts, cutMode, clipAtlas])

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
