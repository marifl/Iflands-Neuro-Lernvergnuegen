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
const SURFACE_URL = { julich: '/assets/bodyparts3d/atlas-surface-julich.glb', dkt: '/assets/bodyparts3d/atlas-surface-dkt.glb', brodmann: '/assets/bodyparts3d/atlas-surface-brodmann.glb' } as const
const PICK_URL = { julich: '/assets/bodyparts3d/atlas-surface-julich-pick.json', dkt: '/assets/bodyparts3d/atlas-surface-dkt-pick.json', brodmann: '/assets/bodyparts3d/atlas-surface-brodmann-pick.json' } as const

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
function CarveSurface({ which }: { which: 'julich' | 'dkt' | 'brodmann' }) {
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

  // MeshPhongMaterial mit den gebackenen Per-Vertex-Farben (COLOR_0, von useGLTF automatisch geladen):
  // nutzt die SZENEN-Lichter inkl. Ambient statt eines einzelnen hartcodierten Lichts -> die leicht
  // getilteten Schnitt-Grenz-Dreiecke gehen NICHT mehr dunkel (Ursache der dunklen Zacken war der
  // ambient-lose Custom-Shader). Jedes Dreieck ist einfarbig (grenz-konformer Cut) -> Arealgrenzen
  // bleiben scharf. polygonOffset haelt den Carve vor der Anatomie (kein z-fighting).
  const mat = useMemo<THREE.Material>(() => new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 6,
    // Z-Fighting mit dem darunterliegenden Kortex: der Schnitt fuegte Mittelpunkt-Vertices ein, die
    // zwischen den Kortex-Vertices liegen -> an den Grenzen scheint der graue Kortex durch. Kraeftiger
    // negativer polygonOffset zieht den Carve konsistent davor (-1 reichte an steilen Stellen nicht).
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  }), [])

  // Material + per-Vertex-Label-Attribut setzen, sobald Pick-Daten da sind (Reihenfolge == GLB-Vertices).
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = mat
      m.renderOrder = 2
      m.userData[ATLAS_SURFACE_FLAG] = true // pickbar (Vertex-genau) via CutPickBridge
      if (!pick) return
      const posCount = (m.geometry.getAttribute('position') as THREE.BufferAttribute).count
      if (posCount !== pick.vlabels.length)
        throw new Error(`atlas-surface ${which}: ${posCount} Vertices != ${pick.vlabels.length} Labels (Bake/Sidecar inkonsistent)`)
      m.geometry.setAttribute('aLabel', new THREE.BufferAttribute(Float32Array.from(pick.vlabels), 1))
      m.userData.atlasPick = pick
    })
  }, [scene, mat, pick, which])

  return <primitive object={scene} />
}

/** Mountet die Atlas-Layer (Roh-Debug + Carve-Flaeche) nur wenn der jeweilige Toggle an ist. */
export default function AtlasOverlay() {
  const showJulich = useViewerStore((s) => s.showAtlasJulich)
  const showDkt = useViewerStore((s) => s.showAtlasDkt)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)
  return (
    <>
      {showJulich && <RawLayer which="julich" />}
      {showDkt && <RawLayer which="dkt" />}
      {showCarveJulich && <CarveSurface which="julich" />}
      {showCarveDkt && <CarveSurface which="dkt" />}
      {showCarveBrodmann && <CarveSurface which="brodmann" />}
    </>
  )
}
