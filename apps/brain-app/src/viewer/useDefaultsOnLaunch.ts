import { useEffect, useMemo } from 'react'
import { useSettingsStore } from './settingsStore'
import { useViewerStore } from './viewerStore'
import { hasImportedSnapshotRouteForCurrentLocation } from './viewerStateSnapshot'
import {
  applyAtlasDefaults,
  applyColoringDefaults,
  applyLanguageDefault,
  applyViewportDefaults,
  canApplyFunctionalDefaults,
  rememberAppMode,
} from './settingsRuntime'

/** Wendet die Settings-Defaults (Kamera, Faerbung, Sprache, Atlas, App-Modus) beim ersten
 *  Laden an. Nur aktiv wenn `launched` true ist und kein Snapshot-Import laeuft. */
export function useDefaultsOnLaunch(launched: boolean): void {
  const defaultCameraView = useSettingsStore((s) => s.viewport.defaultCameraView)
  const defaultColorMode = useSettingsStore((s) => s.coloring.defaultColorMode)
  const dimOthers = useSettingsStore((s) => s.coloring.dimOthers)
  const primaryLanguage = useSettingsStore((s) => s.language.primary)
  const defaultAtlasLayer = useSettingsStore((s) => s.atlas.defaultLayer)
  const visibleCollectionsKey = useSettingsStore((s) => s.atlas.visibleCollections.join('\u0000'))
  const visibleCollections = useMemo(
    () => (visibleCollectionsKey ? visibleCollectionsKey.split('\u0000') : []),
    [visibleCollectionsKey],
  )
  const appMode = useViewerStore((s) => s.appMode)

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyViewportDefaults({ viewport: { defaultCameraView } })
  }, [defaultCameraView, launched])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyColoringDefaults({ coloring: { defaultColorMode, dimOthers } })
  }, [defaultColorMode, dimOthers, launched])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyLanguageDefault({ language: { primary: primaryLanguage } })
  }, [launched, primaryLanguage])

  useEffect(() => {
    if (!launched || hasImportedSnapshotRouteForCurrentLocation()) return
    if (!canApplyFunctionalDefaults()) return
    applyAtlasDefaults({ atlas: { defaultLayer: defaultAtlasLayer, visibleCollections } })
  }, [defaultAtlasLayer, launched, visibleCollections])

  useEffect(() => {
    if (launched) rememberAppMode(appMode)
  }, [appMode, launched])
}
