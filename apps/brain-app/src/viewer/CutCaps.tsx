import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewerStore } from './viewerStore'
import { CutCapsMerged, cutPlaneFor, CUT_CAP_HELPER_FLAG, CUT_SOURCE_FLAG } from './cutCapsMerged'

export { CUT_SOURCE_FLAG }

/**
 * Stencil-Cap-Pipeline fuer die aktive Schnittebene. Additiv zu useClipPlanes:
 * useClipPlanes schneidet die source-Materialien weg, CutCaps fuellt die Cross-Section.
 * Die source-Meshes liefert ein Live-Traverse der R3F-Root-Szene (Flag CUT_SOURCE_FLAG).
 */
export default function CutCaps() {
  const scene = useThree((s) => s.scene)
  const cuts = useViewerStore((s) => s.cuts)
  const cutMode = useViewerStore((s) => s.cutMode)
  const hovered = useViewerStore((s) => s.hovered)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const highlight = useViewerStore((s) => s.highlight)

  const caps = useMemo(() => {
    const getSourceMeshes = (): THREE.Mesh[] => {
      const list: THREE.Mesh[] = []
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh || !mesh.geometry) return
        if (mesh.userData[CUT_CAP_HELPER_FLAG]) return
        if (!mesh.userData[CUT_SOURCE_FLAG]) return
        list.push(mesh)
      })
      return list
    }
    return new CutCapsMerged({ scene, getSourceMeshes })
  }, [scene])

  useEffect(() => () => caps.dispose(), [caps])

  useEffect(() => {
    // Caps nur im 'slice'-Modus; im 'hide'-Modus gibt es keine Schnittflaechen.
    if (cutMode === 'slice') {
      caps.setPlanes({
        sagittal: cuts.sagittal.on ? cutPlaneFor('sagittal', cuts.sagittal.pos) : null,
        coronal: cuts.coronal.on ? cutPlaneFor('coronal', cuts.coronal.pos) : null,
        axial: cuts.axial.on ? cutPlaneFor('axial', cuts.axial.pos) : null,
      })
    } else {
      caps.setPlanes({})
    }
    // Nach dem Rebuild (frische Basisfarben) Auswahl/Hover erneut anwenden.
    const s = useViewerStore.getState()
    caps.syncHighlight(s.selectedSlugs, s.highlight, s.hovered)
  }, [caps, cuts, cutMode])

  // Auswahl/Animation/Hover-Wechsel: Caps einfaerben (billiger Farb-Update, kein Rebuild).
  useEffect(() => {
    caps.syncHighlight(selectedSlugs, highlight, hovered)
  }, [caps, selectedSlugs, highlight, hovered])

  return null
}
