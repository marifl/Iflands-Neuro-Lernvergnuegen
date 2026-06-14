import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes } from './cutCapsMerged'
import { ATLAS_SURFACE_FLAG } from './atlasParcels'

// Zwei Atlas-Overlay-Arten ueber TARO:
//  - 'raw':   die ORIGINALEN Julich/DKT-Mesh-Areale (fremdes MNI-Hirn), per Affine grob auf TARO
//             gelegt -> Debug-Ansicht, die den Rest-Drift sichtbar macht (eine Flachfarbe).
//  - 'carve': EINE durchgehende TARO-Kortexflaeche mit Per-Vertex-Atlas-Farbe (bake_carved_surface.mjs).
//             Lueckenlos (Nearest-Fill) + ein Mesh -> KEINE Loecher, kein Z-Fighting (Monorepo-
//             Architektur: vertex-gefaerbte Flaeche statt separater Parzellen-Meshes).
// Lazy: das GLB laedt erst beim Einblenden, weil die Komponente nur dann gemountet wird.
const RAW_URL = { julich: '/assets/bodyparts3d/atlas-raw-julich.glb', dkt: '/assets/bodyparts3d/atlas-raw-dkt.glb' } as const
const SURFACE_URL = { julich: '/assets/bodyparts3d/atlas-surface-julich.glb', dkt: '/assets/bodyparts3d/atlas-surface-dkt.glb' } as const
const PICK_URL = { julich: '/assets/bodyparts3d/atlas-surface-julich-pick.json', dkt: '/assets/bodyparts3d/atlas-surface-dkt-pick.json' } as const

// Roh-Debug: eine kuehle Flachfarbe je Quelle (Drift auf einen Blick erkennbar).
const RAW_COLOR = { julich: '#39d3c4', dkt: '#e879c8' } as const

function useClip(mats: THREE.Material[]) {
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const clipAtlas = useViewerStore((s) => s.clipAtlasOverlay)
  useEffect(() => {
    const planes = clipAtlas && cutMode === 'slice' ? activeCutPlanes(cuts) : []
    for (const mat of mats) (mat as THREE.MeshStandardMaterial).clippingPlanes = planes
  }, [mats, cuts, cutMode, clipAtlas])
}

/** Roh-Overlay (Debug): Original-MNI-Areale, eine Flachfarbe, halbtransparent, nicht pickbar. */
function RawLayer({ which }: { which: 'julich' | 'dkt' }) {
  const { scene } = useGLTF(RAW_URL[which])
  const mats = useMemo(() => {
    const out: THREE.Material[] = []
    const color = RAW_COLOR[which]
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = new THREE.MeshStandardMaterial({
        color, emissive: new THREE.Color(color), emissiveIntensity: 0.18,
        roughness: 0.7, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide,
      })
      m.raycast = () => {}
      m.renderOrder = 2
      out.push(m.material)
    })
    return out
  }, [scene, which])
  useClip(mats)
  return <primitive object={scene} />
}

/** Carve-Flaeche: EIN vertex-gefaerbtes Mesh (= die TARO-Kortex, atlas-eingefaerbt). Lueckenlos,
 *  pickbar (Per-Vertex-Label via Sidecar; CutPickBridge liest den Areal-Namen). */
function CarveSurface({ which }: { which: 'julich' | 'dkt' }) {
  const { scene } = useGLTF(SURFACE_URL[which])
  const [pick, setPick] = useState<{ slugs: string[]; vlabels: Int16Array } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(PICK_URL[which])
      .then((r) => {
        if (!r.ok) throw new Error(`Atlas-Pick ${which}: HTTP ${r.status}`)
        return r.json()
      })
      .then((j) => { if (alive) setPick({ slugs: j.slugs, vlabels: Int16Array.from(j.vlabels) }) })
    return () => { alive = false }
  }, [which])

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide }),
    [],
  )
  useMemo(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = mat
      m.renderOrder = 2
      m.userData[ATLAS_SURFACE_FLAG] = true // pickbar (Vertex-genau) via CutPickBridge
    })
  }, [scene, mat])

  // Pick-Daten (slugs + per-Vertex-Label) ans Mesh haengen, sobald geladen.
  useEffect(() => {
    if (!pick) return
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).userData.atlasPick = pick })
  }, [scene, pick])

  useClip(useMemo(() => [mat], [mat]))
  return <primitive object={scene} />
}

/** Mountet die Atlas-Layer (Roh-Debug + Carve-Flaeche) nur wenn der jeweilige Toggle an ist. */
export default function AtlasOverlay() {
  const showJulich = useViewerStore((s) => s.showAtlasJulich)
  const showDkt = useViewerStore((s) => s.showAtlasDkt)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  return (
    <>
      {showJulich && <RawLayer which="julich" />}
      {showDkt && <RawLayer which="dkt" />}
      {showCarveJulich && <CarveSurface which="julich" />}
      {showCarveDkt && <CarveSurface which="dkt" />}
    </>
  )
}
