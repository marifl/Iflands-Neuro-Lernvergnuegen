import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useViewerStore } from './viewerStore'
import { CUT_AXES } from './cutCapsMerged'
import { CutPlaneFrameGizmo, type CutController } from './CutPlaneFrameGizmo'

/** Adapter: die Gizmo-CutController-API auf den viewerStore (Multi-Axis cuts) abgebildet. */
function makeCutController(): CutController {
  return {
    getCut: (axis) => useViewerStore.getState().cuts[axis],
    setCuts: (configs) => useViewerStore.getState().setCuts(configs),
    onCutChange: (cb) => {
      let prev = useViewerStore.getState().cuts
      return useViewerStore.subscribe((state) => {
        const cur = state.cuts
        if (cur === prev) return
        for (const axis of CUT_AXES) {
          if (cur[axis] !== prev[axis]) cb(axis, cur[axis])
        }
        prev = cur
      })
    },
  }
}

/**
 * Montiert die CutPlaneFrameGizmo (3D-Rahmen + Chevron-Tabs) in die R3F-Szene und koppelt
 * sie ueber einen Store-Adapter an die Multi-Axis-cuts. Erscheint, sobald eine Achse aktiv ist.
 */
export default function CutPlaneGizmoBridge() {
  const { scene, camera, gl, controls, invalidate } = useThree()

  useEffect(() => {
    if (!controls) return
    const gizmo = new CutPlaneFrameGizmo(
      scene,
      camera,
      gl,
      controls as unknown as OrbitControls,
      makeCutController(),
      () => invalidate(),
    )
    return () => gizmo.dispose()
  }, [scene, camera, gl, controls, invalidate])

  return null
}
