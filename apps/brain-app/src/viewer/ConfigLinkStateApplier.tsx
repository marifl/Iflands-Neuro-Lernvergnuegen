import { useEffect, useRef, useState } from 'react'
import { useViewerStore, type CutAxis, type CutConfig } from './viewerStore'
import { type ConfigCuts, type ConfigVisibility, type EffectiveConfig } from './atlas/atlasConfig'
import { hasImportedSnapshotRouteForCurrentLocation } from './viewerStateSnapshot'
import { fetchColorPresets, restrictPresetToBuckets } from './colorPresets'
import { configRegionsToMeshes } from '../scene/brainBridge'

const CONFIG_AXIS_TO_CUT_AXIS: Record<'x' | 'y' | 'z', CutAxis> = {
  x: 'sagittal',
  y: 'axial',
  z: 'coronal',
}

export function dimOpacityFromConfig(effectiveConfig: EffectiveConfig | null, defaultOpacity: number): number {
  const dimOpacity = effectiveConfig?.visibility.dim_opacity
  if (dimOpacity === undefined) return defaultOpacity
  if (!Number.isFinite(dimOpacity) || dimOpacity < 0 || dimOpacity > 1) {
    throw new Error('Config-Link: visibility.dim_opacity muss zwischen 0 und 1 liegen')
  }
  return dimOpacity
}

function emptyConfigCuts(): Record<CutAxis, CutConfig> {
  return {
    sagittal: { on: false, pos: 0 },
    coronal: { on: false, pos: 0 },
    axial: { on: false, pos: 0 },
  }
}

function cutsFromConfig(cuts: ConfigCuts | undefined): Record<CutAxis, CutConfig> {
  const out = emptyConfigCuts()
  if (!cuts?.enabled) return out
  if (!cuts.planes?.length) throw new Error('Config-Link: cuts.enabled=true braucht mindestens eine Schnittebene')
  for (const plane of cuts.planes) {
    if (plane.keep && plane.keep !== 'positive') {
      throw new Error(`Config-Link: cuts.keep="${plane.keep}" wird vom Viewer noch nicht unterstuetzt`)
    }
    out[CONFIG_AXIS_TO_CUT_AXIS[plane.axis]] = { on: true, pos: plane.position }
  }
  return out
}

function uniqueConfigStrings(values: string[] | undefined, field: string): string[] {
  if (!values) return []
  const out: string[] = []
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Config-Link: ${field}[${index}] muss ein nicht-leerer String sein`)
    }
    if (seen.has(value)) throw new Error(`Config-Link: ${field} enthaelt "${value}" doppelt`)
    seen.add(value)
    out.push(value)
  })
  return out
}

function isolatedFromVisibility(visibility: ConfigVisibility): string | null {
  const isolated = uniqueConfigStrings(visibility.isolated, 'visibility.isolated')
  if (isolated.length > 1) {
    throw new Error('Config-Link: visibility.isolated unterstuetzt aktuell genau ein Isolationsziel')
  }
  return isolated[0] ?? null
}

function defaultVisibilityFromConfig(effectiveConfig: EffectiveConfig): { key: string; hidden: string[]; isolated: string | null } | null {
  if (!effectiveConfig.hasUrlConfig && !effectiveConfig.hasUrlPreset) return null
  if (effectiveConfig.hasUrlConfig && !effectiveConfig.activeConfiguration) return null
  const key = effectiveConfig.hasUrlConfig
    ? `config:${effectiveConfig.activeConfiguration}`
    : `preset:${effectiveConfig.preset}`
  return {
    key,
    hidden: uniqueConfigStrings(effectiveConfig.visibility.hidden, 'visibility.hidden'),
    isolated: isolatedFromVisibility(effectiveConfig.visibility),
  }
}

function ConfigLinkStateApplier({ effectiveConfig }: { effectiveConfig: EffectiveConfig | null }) {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setPreset = useViewerStore((s) => s.setPreset)
  const setCuts = useViewerStore((s) => s.setCuts)
  const setCutMode = useViewerStore((s) => s.setCutMode)
  const setCarveOverlay = useViewerStore((s) => s.setCarveOverlay)
  const applyDefaultVisibility = useViewerStore((s) => s.applyDefaultVisibility)
  const [error, setError] = useState<Error | null>(null)
  const routedConfig = useRef<string | null>(null)
  const hasConfigUrl = effectiveConfig?.hasUrlConfig ?? false
  const activeConfiguration = effectiveConfig?.activeConfiguration ?? null
  const configuration = effectiveConfig?.configuration ?? null

  if (error) throw error

  useEffect(() => {
    if (!effectiveConfig || !hasConfigUrl || !activeConfiguration || !configuration) return
    if (hasImportedSnapshotRouteForCurrentLocation()) return
    setCutMode('slice')
    setCuts(cutsFromConfig(configuration.cuts))
    const defaultVisibility = defaultVisibilityFromConfig(effectiveConfig)
    if (defaultVisibility) {
      applyDefaultVisibility(defaultVisibility.key, defaultVisibility.hidden, defaultVisibility.isolated)
    }
    const carveLayer = configuration.colors?.preset ? 'off' : configuration.view?.carve_on_taro
    setCarveOverlay('julich', carveLayer === 'julich')
    setCarveOverlay('dkt', carveLayer === 'dkt')
    setCarveOverlay('brodmann', false)

    const explicitExploreMode = new URLSearchParams(window.location.search).get('mode') === 'explore'
    if (configuration.overlay?.scene && appMode === 'explore' && !explicitExploreMode && routedConfig.current !== activeConfiguration) {
      routedConfig.current = activeConfiguration
      setAppMode('learn')
      return
    }
    if (appMode === 'explore') setHighlight(configRegionsToMeshes(configuration.regions))
  }, [
    hasConfigUrl,
    activeConfiguration,
    configuration,
    effectiveConfig,
    appMode,
    setAppMode,
    setHighlight,
    setCuts,
    setCutMode,
    setCarveOverlay,
    applyDefaultVisibility,
  ])

  useEffect(() => {
    if (!effectiveConfig?.hasUrlPreset || effectiveConfig.hasUrlConfig) return
    if (hasImportedSnapshotRouteForCurrentLocation()) return
    const defaultVisibility = defaultVisibilityFromConfig(effectiveConfig)
    if (defaultVisibility) {
      applyDefaultVisibility(defaultVisibility.key, defaultVisibility.hidden, defaultVisibility.isolated)
    }
  }, [effectiveConfig, applyDefaultVisibility])

  useEffect(() => {
    if (!hasConfigUrl || !activeConfiguration || !configuration) return
    if (hasImportedSnapshotRouteForCurrentLocation()) return
    let alive = true
    const presetId = configuration.colors?.preset
    if (!presetId) {
      setPreset(null)
      return () => { alive = false }
    }
    fetchColorPresets()
      .then((presets) => {
        if (!alive) return
        const preset = presets.find((item) => item.id === presetId)
        if (!preset) throw new Error(`Config-Link: Farb-Preset "${presetId}" nicht gefunden`)
        const configPreset = restrictPresetToBuckets(preset, configuration.regions?.buckets ?? [], activeConfiguration)
        setPreset({
          ...configPreset,
          dimOthers: configuration.colors?.dim_others ?? preset.dimOthers,
        })
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => { alive = false }
  }, [hasConfigUrl, activeConfiguration, configuration, setPreset])

  return null
}

export default ConfigLinkStateApplier
