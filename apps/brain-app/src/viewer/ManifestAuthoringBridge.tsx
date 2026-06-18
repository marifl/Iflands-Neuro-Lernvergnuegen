import { useEffect } from 'react'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import { ensureManifestAuthoringState } from './manifestAuthoringRuntime'
import { loadPhineasAssetManifest } from './phineasAssetManifest'

export default function ManifestAuthoringBridge() {
  useEffect(() => {
    let active = true
    loadPhineasAssetManifest().then((manifest) => {
      if (!active) return
      const store = useAuthoringSnapshotStore.getState()
      const next = ensureManifestAuthoringState(store.authoring, manifest)
      if (JSON.stringify(next) !== JSON.stringify(store.authoring)) {
        store.setAuthoringSnapshotState(next)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return null
}
