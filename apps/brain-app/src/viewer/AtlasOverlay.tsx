import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes } from './cutCapsMerged'
import { ATLAS_SURFACE_FLAG } from './atlasParcels'
import { ATLAS_CAP_SOURCE_FLAG, buildAtlasCapProxyBundle, type AtlasCapProxyBundle } from './atlasCapProxies'

// Zwei Atlas-Overlay-Arten ueber TARO:
//  - 'raw':   die ORIGINALEN Julich/DKT-Mesh-Areale (fremdes MNI-Hirn), per Affine grob auf TARO
//             gelegt -> Debug-Ansicht, die den Rest-Drift sichtbar macht (eine Flachfarbe).
//  - 'carve': EINE durchgehende TARO-Kortexflaeche mit Per-Vertex-Atlas-Farbe (bake_carved_surface.mjs).
//             Lueckenlos (Nearest-Fill) + ein Mesh -> KEINE Loecher, kein Z-Fighting (Monorepo-
//             Architektur: vertex-gefaerbte Flaeche statt separater Parzellen-Meshes).
// Lazy: das GLB laedt erst beim Einblenden, weil die Komponente nur dann gemountet wird.
const RAW_URL = { julich: '/assets/bodyparts3d/atlas-raw-julich.glb', dkt: '/assets/bodyparts3d/atlas-raw-dkt.glb' } as const
// Cache-Bust: bei jedem Carve-Rebake hochzaehlen, sonst serviert der Browser die alte GLB/JSON.
const CARVE_V = '8'
const SURFACE_URL = { julich: `/assets/bodyparts3d/atlas-surface-julich.glb?v=${CARVE_V}`, dkt: `/assets/bodyparts3d/atlas-surface-dkt.glb?v=${CARVE_V}`, brodmann: `/assets/bodyparts3d/atlas-surface-brodmann.glb?v=${CARVE_V}` } as const
const PICK_URL = { julich: `/assets/bodyparts3d/atlas-surface-julich-pick.json?v=${CARVE_V}`, dkt: `/assets/bodyparts3d/atlas-surface-dkt-pick.json?v=${CARVE_V}`, brodmann: `/assets/bodyparts3d/atlas-surface-brodmann-pick.json?v=${CARVE_V}` } as const
const CUT_SOURCES_CHANGED_EVENT = 'brain-app:cut-sources-changed'

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
  const [capProxyMaterials, setCapProxyMaterials] = useState<THREE.Material[]>([])
  const bumpCutSourceRevision = useViewerStore((s) => s.bumpCutSourceRevision)

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
  // Scharfe Arealgrenzen kommen aus der GEOMETRIE: bake_carve.mjs gibt das Mesh non-indexed mit EINER
  // Areal-Farbe pro Dreieck aus -> alle 3 Vertices gleich -> keine Interpolation -> harte Kanten, kein
  // Batik. Material daher schlicht: vertexColors + smooth NORMAL (Furchen-Beleuchtung weich).
  // polygonOffset gegen z-Fight mit dem koinzidenten TARO-Cortex (reiner Tiefen-Bias, kein Geometrie-Versatz).
  const mat = useMemo<THREE.Material>(() => new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -12,
  }), [])
  const mats = useMemo(() => [mat, ...capProxyMaterials], [mat, capProxyMaterials])
  useClip(mats)

  useEffect(() => {
    if (capProxyMaterials.length === 0) return
    const id = window.setTimeout(() => {
      bumpCutSourceRevision()
      window.dispatchEvent(new Event(CUT_SOURCES_CHANGED_EVENT))
    }, 0)
    return () => window.clearTimeout(id)
  }, [capProxyMaterials, bumpCutSourceRevision])

  // Material + per-Vertex-Label-Attribut setzen, sobald Pick-Daten da sind (Reihenfolge == GLB-Vertices).
  useEffect(() => {
    const bundles: AtlasCapProxyBundle[] = []
    const proxyMaterials: THREE.Material[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (m.userData[ATLAS_CAP_SOURCE_FLAG]) return
      m.material = mat
      m.renderOrder = 2
      m.userData[ATLAS_SURFACE_FLAG] = true // pickbar (Vertex-genau) via CutPickBridge
      if (!pick) return
      const posCount = (m.geometry.getAttribute('position') as THREE.BufferAttribute).count
      if (posCount !== pick.vlabels.length)
        throw new Error(`atlas-surface ${which}: ${posCount} Vertices != ${pick.vlabels.length} Labels (Bake/Sidecar inkonsistent)`)
      m.geometry.setAttribute('aLabel', new THREE.BufferAttribute(Float32Array.from(pick.vlabels), 1))
      m.userData.atlasPick = pick
      const bundle = buildAtlasCapProxyBundle(m, pick)
      bundles.push(bundle)
      proxyMaterials.push(...bundle.materials)
    })
    setCapProxyMaterials(proxyMaterials)
    return () => {
      for (const bundle of bundles) bundle.dispose()
      bumpCutSourceRevision()
      window.dispatchEvent(new Event(CUT_SOURCES_CHANGED_EVENT))
    }
  }, [scene, mat, pick, which, bumpCutSourceRevision])

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
