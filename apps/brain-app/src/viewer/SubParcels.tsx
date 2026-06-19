import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { ATLAS_VIEWER_COLORS, PRESET_COLOR_EMISSIVE_INTENSITY } from './atlasColorSystem'
import { resolvePresetColors } from './colorPresets'
import { approachTransitionValue } from './transitions'

const SUBPARCELS_GLB = '/assets/bodyparts3d/k11-subparcels.glb'
const SELECT_COLOR = ATLAS_VIEWER_COLORS.selection

useGLTF.preload(SUBPARCELS_GLB)

/** Sub-Patches (ACC/SMA/pre-SMA + DKT-Splits) als echte TARO-Geometrie. Zwei Modi:
 *  - Highlight/ERP: Mesh sichtbar + orange leuchtend, wenn sein Name im highlight-Array ist
 *    (bei aktiver ERP-Animation pulst die Quelle zur Huellkurve).
 *  - Preset (Figur-Faerbung): Sub-Patch sichtbar + in der Gruppenfarbe seines Buckets, sonst
 *    unsichtbar. So faerben die Presets sub-gyral (vlpfc->pars*, dacc->caudal ACC, ofc->lat/med)
 *    und Abb. 11-04 (nucleus-accumbens) ist freigeschaltet.
 *  polygonOffset haelt das Mesh vor dem Eltern-Gyrus (kein Z-Fighting). */
export default function SubParcels() {
  const { scene } = useGLTF(SUBPARCELS_GLB)
  const highlight = useViewerStore((s) => s.highlight)
  const erpActive = useViewerStore((s) => s.erpActive)
  const erpPulse = useViewerStore((s) => s.erpPulse)
  const colorMode = useViewerStore((s) => s.colorMode)
  const activePreset = useViewerStore((s) => s.activePreset)
  // Figur-Preset: Sub-Patch-Name -> Hex. Nur bei colorMode='preset'; wirft laut bei Luecken-Bucket
  // (gleiche Quelle wie der Brain-Apply-Pfad, damit Namen nicht divergieren).
  const presetColors = useMemo(
    () => (colorMode === 'preset' && activePreset ? resolvePresetColors(activePreset) : null),
    [colorMode, activePreset],
  )
  const opacityTargets = useRef(new Map<THREE.Mesh, number>())
  const transitionActive = useRef(false)

  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.material = new THREE.MeshStandardMaterial({
          color: SELECT_COLOR,
          emissive: new THREE.Color(SELECT_COLOR),
          emissiveIntensity: 0.7,
          opacity: 0,
          roughness: 0.6,
          metalness: 0,
          side: THREE.DoubleSide,
          transparent: true,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
        m.visible = false
        m.raycast = () => {}
        list.push(m)
      }
    })
    return list
  }, [scene])

  const setOpacityTarget = (mesh: THREE.Mesh, targetOpacity: number) => {
    if (targetOpacity > 0) mesh.visible = true
    opacityTargets.current.set(mesh, targetOpacity)
    transitionActive.current = true
  }

  useFrame((_, delta) => {
    if (!transitionActive.current) return
    let stillActive = false
    for (const [mesh, targetOpacity] of opacityTargets.current) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity = approachTransitionValue(mat.opacity, targetOpacity, delta)
      const transparent = mat.opacity < 0.999
      if (mat.transparent !== transparent) {
        mat.transparent = transparent
        mat.needsUpdate = true
      }
      mat.depthWrite = mat.opacity > 0.6
      if (targetOpacity === 0 && mat.opacity === 0) mesh.visible = false
      if (mat.opacity !== targetOpacity) stillActive = true
    }
    transitionActive.current = stillActive
  })

  useEffect(() => {
    const set = new Set(highlight)
    // Bei aktiver ERP-Animation pulst die Quelle synchron zur ERP-Huellkurve (0.15..1.0),
    // sonst konstantes Highlight-Leuchten.
    const intensity = erpActive ? 0.15 + 0.85 * erpPulse : 0.7
    for (const m of meshes) {
      const mat = m.material as THREE.MeshStandardMaterial
      if (presetColors) {
        // Figur-Preset: nur Sub-Patches eines aktiven Buckets sichtbar, in Gruppenfarbe.
        const hex = presetColors.get(m.name)
        if (hex) {
          setOpacityTarget(m, 1)
          mat.color.set(hex)
          mat.emissive.set(hex)
          mat.emissiveIntensity = PRESET_COLOR_EMISSIVE_INTENSITY
        } else {
          setOpacityTarget(m, 0)
        }
      } else {
        // Highlight-/ERP-Modus: orange Quelle nur fuer Meshes im highlight-Set.
        setOpacityTarget(m, set.has(m.name) ? 1 : 0)
        mat.color.set(SELECT_COLOR)
        mat.emissive.set(SELECT_COLOR)
        mat.emissiveIntensity = intensity
      }
    }
  }, [meshes, highlight, erpActive, erpPulse, presetColors])

  return <primitive object={scene} />
}
