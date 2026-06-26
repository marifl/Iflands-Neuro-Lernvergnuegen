import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { ANATOMICAL_COLOR, buildAtlasTree, meshColor, type Lang } from './ontology'
import { ATLAS_VIEWER_COLORS, PRESET_COLOR_EMISSIVE_INTENSITY } from './atlasColorSystem'
import { parcelColor, prettyAtlasRegion } from './atlasParcels'
import { PRESET_DIM_COLOR, resolvePresetColors } from './colorPresets'
import { useViewerStore } from './viewerStore'
import { activeCutPlanes, isHiddenByCutSlab } from './cutCapsMerged'
import { useSettingsStore } from './settingsStore'
import { createAnatomicalMaterial, contextAnatomicalMaterialRole, contextColorForMode } from './anatomicalMaterials'
import { CUT_SOURCE_FLAG } from './CutCaps'
import { ontologyMeshTargetUserData } from './targetPicking'
import { approachTransitionValue } from './transitions'
import { useCaseStudyViewStore } from './phineasGage'
import {
  BRAIN_MODEL_OPTIONS,
  type BrainModelOption,
  type BrainModelOptionId,
} from './brainModelOptions'

export const SKULL_GLB = '/assets/context/skull.glb'
export const HEAD_GLB = '/assets/context/head.glb'
// Watertight-3D-Atlas-Ueber-Objekte (furchen-echt, fsaverage->TARO). Julich nutzt die furchige
// v3.1-Variante; das alte glatte volumetrische julich-brain.glb wurde entfernt (ersetzt).
export type Atlas3dKey = 'julich' | 'dkt' | 'brodmann' | 'destrieux'

export const ATLAS3D: { key: Atlas3dKey; glb: string; rootLabels: Record<Lang, string> }[] = [
  { key: 'julich', glb: '/assets/bodyparts3d/atlas3d-julich.glb', rootLabels: { de: 'Jülich', la: 'Atlas Julich-Brain', en: 'Julich' } },
  { key: 'dkt', glb: '/assets/bodyparts3d/atlas3d-dkt.glb', rootLabels: { de: 'DKT', la: 'Atlas DKT', en: 'DKT' } },
  { key: 'brodmann', glb: '/assets/bodyparts3d/atlas3d-brodmann.glb', rootLabels: { de: 'Brodmann', la: 'Areae Brodmann', en: 'Brodmann' } },
  { key: 'destrieux', glb: '/assets/bodyparts3d/atlas3d-destrieux.glb', rootLabels: { de: 'Destrieux', la: 'Atlas Destrieux', en: 'Destrieux' } },
]

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
useGLTF.preload(SKULL_GLB)
useGLTF.preload(HEAD_GLB)

const SELECT_COLOR = ATLAS_VIEWER_COLORS.selection
const HOVER_COLOR = ATLAS_VIEWER_COLORS.hover
const EMISSIVE_OFF_COLOR = ATLAS_VIEWER_COLORS.emissiveOff
const DIM_DEPTH_WRITE_THRESHOLD = 0.6

// three.js raycastet unsichtbare Objekte trotzdem -> ausgeblendete Meshes muessen explizit
// nicht-pickbar werden, sonst bleiben sie anklickbar/hoverbar.
const NO_RAYCAST = () => {}
function setPickable(mesh: THREE.Mesh, pickable: boolean): void {
  mesh.raycast = pickable ? THREE.Mesh.prototype.raycast : NO_RAYCAST
}

function attachOntologyMeshTarget(mesh: THREE.Mesh): void {
  const targetUserData = ontologyMeshTargetUserData(mesh.name)
  if (!targetUserData) return
  mesh.userData = { ...mesh.userData, ...targetUserData }
}

function hasUvAttribute(mesh: THREE.Mesh): boolean {
  return Boolean(mesh.geometry.getAttribute('uv'))
}

/** Alle aktiven Schnittebenen auf die Materialien einer Mesh-Liste anwenden (leer = kein Schnitt).
 *  Nur im 'slice'-Modus wird geschnitten; im 'hide'-Modus bleibt die Geometrie ungeschnitten. */
function useClipPlanes(meshes: THREE.Mesh[]): void {
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const planes = useMemo(() => (cutMode === 'slice' ? activeCutPlanes(cuts) : []), [cuts, cutMode])
  useEffect(() => {
    for (const mesh of meshes) (mesh.material as THREE.MeshStandardMaterial).clippingPlanes = planes
  }, [meshes, planes])
}

const NEVER_HIDDEN = (): boolean => false
/** Predikat fuer den 'hide'-Modus: blendet Strukturen aus, die vollstaendig hinter einer Ebene
 *  liegen. Im 'slice'-Modus stabil NEVER_HIDDEN — die Sichtbarkeits-Effekte laufen nicht extra. */
function useCutHidden(): (mesh: THREE.Mesh) => boolean {
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  return useMemo(() => {
    if (cutMode !== 'hide') return NEVER_HIDDEN
    return (mesh: THREE.Mesh) => isHiddenByCutSlab(mesh, cuts)
  }, [cuts, cutMode])
}

export function Brain({ brainModel, dimOpacity }: { brainModel: BrainModelOption; dimOpacity: number }) {
  const { scene } = useGLTF(brainModel.url)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const highlight = useViewerStore((s) => s.highlight)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const colorMode = useViewerStore((s) => s.colorMode)
  const colorIndex = useViewerStore((s) => s.colorIndex)
  const activePreset = useViewerStore((s) => s.activePreset)
  const presetViewOptions = useViewerStore((s) => s.presetViewOptions)
  const erpActive = useViewerStore((s) => s.erpActive)
  const erpPulse = useViewerStore((s) => s.erpPulse)
  const opacityTargets = useRef(new Map<THREE.Mesh, number>())
  const opacityTransitionActive = useRef(false)
  // Figur-Preset: Mesh -> Hex. Nur bei colorMode='preset' wirksam; wirft laut bei Luecken-Bucket.
  const presetColors = useMemo(
    () => (activePreset ? resolvePresetColors(activePreset) : null),
    [activePreset],
  )
  useEffect(() => {
    const runtimeWindow = window as Window & { __brainModelOption?: BrainModelOption }
    runtimeWindow.__brainModelOption = brainModel
  }, [brainModel])
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        const materialRole = colorIndex.get(mesh.name)?.anatomicalRole ?? 'brain-cortex'
        mesh.material = createAnatomicalMaterial(materialRole, {
          // Halb-Meshes (L/R-Haelften) sind am Mittelschnitt offen; DoubleSide stellt
          // sicher, dass nichts durch Backface-Culling unsichtbar wird.
          enableBumpMap: hasUvAttribute(mesh),
          side: THREE.DoubleSide,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        attachOntologyMeshTarget(mesh)
        list.push(mesh)
      }
    })
    return list
  }, [scene, colorIndex])

  useClipPlanes(meshes)

  const setOpacityTarget = (mesh: THREE.Mesh, targetOpacity: number) => {
    opacityTargets.current.set(mesh, targetOpacity)
    opacityTransitionActive.current = true
  }

  useFrame((_, delta) => {
    if (!opacityTransitionActive.current) return
    let stillActive = false
    for (const [mesh, targetOpacity] of opacityTargets.current) {
      const material = mesh.material as THREE.MeshStandardMaterial
      material.opacity = approachTransitionValue(material.opacity, targetOpacity, delta)
      const transparent = material.opacity < 0.999
      if (material.transparent !== transparent) {
        material.transparent = transparent
        material.needsUpdate = true
      }
      material.depthWrite = material.opacity > DIM_DEPTH_WRITE_THRESHOLD
      if (material.opacity !== targetOpacity) stillActive = true
    }
    opacityTransitionActive.current = stillActive
  })

  useEffect(() => {
    const highlightSet = new Set(highlight)
    // Waehrend einer Animation (Highlight-Set aktiv) werden nicht-aktive Strukturen
    // transparent, damit die tiefen Strukturen (Striatum, Pallidum, Thalamus) durch
    // den Cortex sichtbar werden.
    const presetViewActive = colorMode === 'preset' && Boolean(presetColors && activePreset)
    const sceneHighlightActive = highlightSet.size > 0 && !presetViewActive
    const hidePresetUncolored = presetViewActive
    const focusPresetColored = presetViewActive && presetViewOptions.focusColored
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const presetColor = presetColors?.get(mesh.name)
      const isPresetColored = Boolean(presetColor)
      // Hierarchisches Ein-/Ausblenden ueber den Baum: unsichtbar UND nicht pickbar.
      const visible = !hidden.has(mesh.name) && !cutHidden(mesh) && !(hidePresetUncolored && !isPresetColored)
      mesh.visible = visible
      // Fokusmodus: gleicher Opacity-/Pickability-Pfad wie Isolation. Bei Figur-Faerbung kann
      // das aktive Preset die Fokusmenge liefern, damit subkortikale Gruppen sichtbar werden.
      const focusDimmed = focusPresetColored ? !isPresetColored : iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !focusDimmed)
      const material = mesh.material as THREE.MeshStandardMaterial
      // Basisfarbe nach aktivem Farbmodus (Auswahl/Hover ueberlagern als Emissive).
      // Preset-Modus: Gruppen-Farbe je Mesh; nicht-gruppierte Strukturen gedimmt (dimOthers).
      if (colorMode === 'preset' && presetColors && activePreset) {
        material.color.set(presetColor ?? (activePreset.dimOthers ? PRESET_DIM_COLOR : ANATOMICAL_COLOR))
      } else {
        material.color.set(meshColor(colorIndex.get(mesh.name), colorMode))
      }
      const isActive = !presetViewActive && (selectedSlugs.has(mesh.name) || highlightSet.has(mesh.name))
      if (presetViewActive && presetColor) {
        material.emissive.set(presetColor)
        material.emissiveIntensity = PRESET_COLOR_EMISSIVE_INTENSITY
      } else if (isActive) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.7
      } else if (!presetViewActive && mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.35
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      const dim = visible && ((sceneHighlightActive && !isActive) || focusDimmed)
      setOpacityTarget(mesh, dim ? dimOpacity : 1)
    }
  }, [
    meshes,
    selectedSlugs,
    hovered,
    highlight,
    hidden,
    isolatedSlugs,
    colorMode,
    colorIndex,
    presetColors,
    activePreset,
    presetViewOptions,
    cutHidden,
    dimOpacity,
  ])

  // EEG voll-synchron fuer brain.glb-Quellen (z.B. P3b parietal): pulst NUR die gehighlighteten
  // Meshes mit der ERP-Huellkurve. Bewusst eigener, leichter Effekt (laeuft per Frame ueber
  // erpPulse, beruehrt aber nur das kleine Highlight-Set) statt den schweren Farb-Effekt oben
  // (600+ Meshes) in den Render-Pfad zu ziehen. Sub-Patch-Quellen (P3a/P3z) laufen ueber SubParcels.
  useEffect(() => {
    if (!erpActive) return
    const highlightSet = new Set(highlight)
    const intensity = 0.15 + 0.85 * erpPulse
    for (const mesh of meshes) {
      if (highlightSet.has(mesh.name)) (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
    }
  }, [meshes, highlight, erpActive, erpPulse])

  // DEV-only: Szene + THREE global exponieren, damit das Koordinaten-Bake (scripts/bake-structure-coords.mjs)
  // und kuenftige Punkt-/Verbinder-Animationen die Geometrie im Viewer-Raum traversieren koennen.
  // Bewusst dauerhaft (nur DEV) — nicht entfernen.
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as { __THREE__: unknown }).__THREE__ = THREE
      ;(window as unknown as { __THREE_SCENE__: unknown }).__THREE_SCENE__ = scene
    }
  }, [scene])

  // Picking laeuft zentral ueber CutPickBridge (cut-aware), nicht ueber per-Mesh-Events.
  return <primitive object={scene} />
}

export function BrainModelReviewSelector({
  brainModel,
  isNarrow,
  onSelect,
}: {
  brainModel: BrainModelOption
  isNarrow: boolean
  onSelect: (id: BrainModelOptionId) => void
}) {
  return (
    <label
      className="ed-panel ed-frame"
      style={{
        position: 'absolute',
        top: isNarrow ? undefined : 16,
        right: isNarrow ? 12 : 16,
        bottom: isNarrow ? 64 : undefined,
        zIndex: 18,
        display: 'grid',
        gap: 6,
        padding: '8px 10px',
        minWidth: isNarrow ? 170 : 188,
        pointerEvents: 'auto',
      }}
    >
      <span className="eyebrow">Hirnmodell</span>
      <select
        aria-label="Hirnmodell waehlen"
        value={brainModel.id}
        onChange={(event) => onSelect(event.target.value as BrainModelOptionId)}
        style={{
          width: '100%',
          border: '1px solid color-mix(in srgb, var(--line), transparent 10%)',
          borderRadius: 6,
          background: 'var(--paper)',
          color: 'var(--ink)',
          font: '600 12px var(--ed-mono)',
          padding: '6px 8px',
        }}
      >
        {BRAIN_MODEL_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span style={{ color: 'var(--g600)', fontSize: 'var(--fs-base)', lineHeight: 1.25 }}>{brainModel.reviewNote}</span>
    </label>
  )
}

export function ContextSkull({ dimOpacity }: { dimOpacity: number }) {
  const { scene } = useGLTF(SKULL_GLB)
  const skullContext = useSettingsStore((s) => s.viewport.skullContext)
  const caseStudySkullActive = useCaseStudyViewStore((s) => s.showSkull)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const colorMode = useViewerStore((s) => s.colorMode)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const showSkull = skullContext !== 'hidden'
  const skullOpacity = skullContext === 'solid' ? 0.85 : 0.25
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = createAnatomicalMaterial('bone', {
          enableBumpMap: hasUvAttribute(mesh),
          side: THREE.DoubleSide,
          transparent: true,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        attachOntologyMeshTarget(mesh)
        list.push(mesh)
      }
    })
    return list
  }, [scene])

  useClipPlanes(meshes)

  useEffect(() => {
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const visible = !caseStudySkullActive && (showSkull || !hidden.has(mesh.name)) && !cutHidden(mesh)
      mesh.visible = visible
      const isoDimmed = iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !isoDimmed)
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.set(contextColorForMode(mesh.name, colorMode))
      const opacity = isoDimmed ? dimOpacity : showSkull ? skullOpacity : 1
      material.opacity = opacity
      material.depthWrite = opacity > DIM_DEPTH_WRITE_THRESHOLD
      if (selectedSlugs.has(mesh.name)) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.6
      } else if (mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.3
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      material.needsUpdate = true
    }
  }, [meshes, showSkull, skullOpacity, caseStudySkullActive, hidden, isolatedSlugs, selectedSlugs, hovered, cutHidden, dimOpacity, colorMode])

  // Picking laeuft zentral ueber CutPickBridge (cut-aware), nicht ueber per-Mesh-Events.
  return <primitive object={scene} />
}

/** Voller Kopf-Kontext (Vollausbau): per Baum-Toggle ein-/ausblendbar, anklickbar. */
export function ContextHead({ dimOpacity }: { dimOpacity: number }) {
  const { scene } = useGLTF(HEAD_GLB)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const colorMode = useViewerStore((s) => s.colorMode)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = createAnatomicalMaterial(contextAnatomicalMaterialRole(mesh.name), {
          enableBumpMap: hasUvAttribute(mesh),
          side: THREE.DoubleSide,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        attachOntologyMeshTarget(mesh)
        list.push(mesh)
      }
    })
    return list
  }, [scene])

  useClipPlanes(meshes)

  useEffect(() => {
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const visible = !hidden.has(mesh.name) && !cutHidden(mesh)
      mesh.visible = visible
      const isoDimmed = iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !isoDimmed) // ausgeblendet/isoliert-aussen -> nicht pickbar
      const material = mesh.material as THREE.MeshStandardMaterial
      material.color.set(contextColorForMode(mesh.name, colorMode))
      if (selectedSlugs.has(mesh.name)) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.7
      } else if (mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.35
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      if (material.transparent !== isoDimmed) material.needsUpdate = true
      material.transparent = isoDimmed
      material.opacity = isoDimmed ? dimOpacity : 1
      material.depthWrite = !isoDimmed
    }
  }, [meshes, hidden, isolatedSlugs, selectedSlugs, hovered, cutHidden, dimOpacity, colorMode])

  // Picking laeuft zentral ueber CutPickBridge (cut-aware), nicht ueber per-Mesh-Events.
  return <primitive object={scene} />
}

/** Watertight-3D-Atlas-Ueber-Objekt (furchen-echt, Y-up, eigene saubere Geometrie — NICHT auf TARO
 *  gecarvt). Pro Areal eine stabile Farbe; default versteckt, per Strukturbaum-Toggle einblendbar,
 *  anklickbar (Picking ueber Mesh-Name = Slug). Baut beim ersten Laden den Atlas-Teilbaum und
 *  registriert ihn im Store (Julich -> setJulich, sonst -> setAtlas3d). */
export function AtlasOverObject({
  atlasKey,
  glb,
  rootLabels,
  aliasesByName,
  dimOpacity,
}: {
  atlasKey: Atlas3dKey
  glb: string
  rootLabels: Record<Lang, string>
  aliasesByName?: ReadonlyMap<string, string[]>
  dimOpacity: number
}) {
  const { scene } = useGLTF(glb)
  const setJulich = useViewerStore((s) => s.setJulich)
  const setAtlas3d = useViewerStore((s) => s.setAtlas3d)
  const hidden = useViewerStore((s) => s.hidden)
  const isolatedSlugs = useViewerStore((s) => s.isolatedSlugs)
  const cutHidden = useCutHidden()
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hovered = useViewerStore((s) => s.hovered)
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = new THREE.MeshStandardMaterial({
          // Cerebellum/Hirnstamm = Kontext (gedaempft); GapMaps = "nicht-kartierte" Rest-Zonen (neutral,
          // damit sie nicht dominieren); echte zytoarchitektonische Areale = stabile Farbe (L/R teilen sie).
          color: /cerebellum|brainstem/.test(mesh.name)
            ? ATLAS_VIEWER_COLORS.atlasContext
            : /gapmap/.test(mesh.name)
              ? ATLAS_VIEWER_COLORS.atlasGap
              : parcelColor(mesh.name),
          roughness: 0.82,
          metalness: 0,
          side: THREE.DoubleSide,
        })
        mesh.userData[CUT_SOURCE_FLAG] = true // von CutCaps gecappt, wenn geschnitten
        attachOntologyMeshTarget(mesh)
        list.push(mesh)
      }
    })
    return list
  }, [scene])

  useClipPlanes(meshes)

  // Teilbaum aus den Mesh-Namen bauen + im Store registrieren (alle Areale starten versteckt).
  useEffect(() => {
    const names = meshes.map((m) => m.name).filter(Boolean)
    if (!names.length) return
    const { tree, slugs } = buildAtlasTree(atlasKey, rootLabels, names, prettyAtlasRegion, aliasesByName)
    if (atlasKey === 'julich') setJulich(tree, slugs)
    else setAtlas3d(atlasKey, tree, slugs)
  }, [meshes, atlasKey, rootLabels, aliasesByName, setJulich, setAtlas3d])

  useEffect(() => {
    const iso = isolatedSlugs.size > 0
    for (const mesh of meshes) {
      const visible = !hidden.has(mesh.name) && !cutHidden(mesh)
      mesh.visible = visible
      const isoDimmed = iso && !isolatedSlugs.has(mesh.name)
      setPickable(mesh, visible && !isoDimmed)
      const material = mesh.material as THREE.MeshStandardMaterial
      if (selectedSlugs.has(mesh.name)) {
        material.emissive.set(SELECT_COLOR)
        material.emissiveIntensity = 0.7
      } else if (mesh.name === hovered) {
        material.emissive.set(HOVER_COLOR)
        material.emissiveIntensity = 0.35
      } else {
        material.emissive.set(EMISSIVE_OFF_COLOR)
        material.emissiveIntensity = 0
      }
      if (material.transparent !== isoDimmed) material.needsUpdate = true
      material.transparent = isoDimmed
      material.opacity = isoDimmed ? dimOpacity : 1
      material.depthWrite = !isoDimmed
    }
  }, [meshes, hidden, isolatedSlugs, selectedSlugs, hovered, cutHidden, dimOpacity])

  return <primitive object={scene} />
}
