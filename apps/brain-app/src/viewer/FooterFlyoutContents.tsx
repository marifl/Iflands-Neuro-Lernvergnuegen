import { useEffect, useMemo, useState } from 'react'
import { useViewerStore, type CutAxis, type SelectMode } from './viewerStore'
import { CUT_AXES, CUT_POS_MAX } from './cutCapsMerged'
import { fetchColorPresets, fetchPresentationColorItems, presetIssue, type ColorPreset, type PresentationColorItem } from './colorPresets'
import { BASE_COLOR_MODE_DEFINITIONS } from './colorModeDefinitions'
import { PresetGroupExplanation, PresetReadOnlyAction } from './PresetColorExplanation'
import { AuthoringTransformControls } from './AuthoringTransformControls'
import { replaceCanonicalLocation } from '../scene/router'
import { Item } from './FooterBar'

export const TOOL_LABEL: Record<SelectMode, string> = { group: 'Gruppe', direct: 'Direkt' }
export const CUT_LABEL: Record<CutAxis, string> = {
  sagittal: 'Sagittal',
  coronal: 'Coronal',
  axial: 'Axial',
}

export function ColorFlyoutContent({ onClose }: { onClose: () => void }) {
  const colorMode = useViewerStore((s) => s.colorMode)
  const setColorMode = useViewerStore((s) => s.setColorMode)
  const activePreset = useViewerStore((s) => s.activePreset)
  const setPreset = useViewerStore((s) => s.setPreset)
  const presetViewOptions = useViewerStore((s) => s.presetViewOptions)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const [presets, setPresets] = useState<ColorPreset[]>([])
  const [presentationColorItems, setPresentationColorItems] = useState<PresentationColorItem[]>([])
  const [presetError, setPresetError] = useState<Error | null>(null)
  // Vortrags-Färbungen einmal aus der kanonischen Atlas-Config laden; Fehler laut nach oben.
  useEffect(() => {
    Promise.all([fetchColorPresets(), fetchPresentationColorItems()])
      .then(([loadedPresets, loadedItems]) => {
        setPresets(loadedPresets)
        setPresentationColorItems(loadedItems)
      })
      .catch(setPresetError)
  }, [])
  if (presetError) throw presetError
  const presetsById = useMemo(() => new Map(presets.map((preset) => [preset.id, preset])), [presets])

  const selectPresentationColorItem = (item: PresentationColorItem) => {
    if (item.colorPresetId) {
      const preset = presetsById.get(item.colorPresetId)
      if (!preset) {
        setPresetError(new Error(`Vortrags-Färbung "${item.id}" referenziert fehlendes Farb-Preset "${item.colorPresetId}"`))
        return
      }
      const issue = presetIssue(preset)
      if (issue) {
        setPresetError(new Error(`Vortrags-Färbung "${item.id}" ist nicht auflösbar: ${issue}`))
        return
      }
      setPreset({ ...preset, dimOthers: item.dimOthers ?? preset.dimOthers })
    } else {
      setPreset(null)
    }
    replaceCanonicalLocation({
      sequenceKind: 'presentation',
      sequenceName: 'kapitel11-vorlesung',
      configName: item.id,
      sceneId: item.scene,
      step: 0,
    })
    setAppMode('learn')
    onClose()
  }

  return (
    <>
      {BASE_COLOR_MODE_DEFINITIONS.map((definition) => (
        <Item key={definition.mode} active={colorMode === definition.mode} onClick={() => { setColorMode(definition.mode); onClose() }}>
          {definition.label}
        </Item>
      ))}
      {/* Vortrags-Färbungen kommen aus atlas-config.json/presentation, nicht aus Companion-JSON. */}
      {presentationColorItems.length > 0 ? (
        <>
          <div className="eyebrow" style={{ margin: '8px 0 4px' }}>Vortrags-Färbungen</div>
          {presentationColorItems.map((item) => {
            const preset = item.colorPresetId ? presetsById.get(item.colorPresetId) : null
            const issue = item.colorPresetId && !preset
              ? `Farb-Preset "${item.colorPresetId}" fehlt`
              : preset
                ? presetIssue(preset)
                : null
            return (
              <Item
                key={item.id}
                active={new URLSearchParams(window.location.search).get('config') === item.id}
                disabled={issue !== null}
                title={issue ?? undefined}
                onClick={() => { if (!issue) selectPresentationColorItem(item) }}
              >
                {item.label}
              </Item>
            )
          })}
          {colorMode === 'preset' && activePreset ? (
            <>
              <div style={{ height: 8 }} />
              <PresetGroupExplanation preset={activePreset} />
              <div className="eyebrow" style={{ margin: '0 0 4px' }}>Aktionen</div>
              <PresetReadOnlyAction label="Nur relevante Regionen" active={presetViewOptions.hideUncolored} />
            </>
          ) : null}
        </>
      ) : null}
    </>
  )
}

export function CutFlyoutContent() {
  const cuts = useViewerStore((s) => s.cuts)
  const setCut = useViewerStore((s) => s.setCut)
  const cutMode = useViewerStore((s) => s.cutMode)
  const setCutMode = useViewerStore((s) => s.setCutMode)
  const clipAtlasOverlay = useViewerStore((s) => s.clipAtlasOverlay)
  const setClipAtlasOverlay = useViewerStore((s) => s.setClipAtlasOverlay)

  return (
    <>
      {/* Wirkung der Ebenen: schneiden (mit Cap) ODER dahinterliegende Strukturen ausblenden. */}
      <div className="eyebrow" style={{ marginBottom: 4 }}>Wirkung</div>
      <Item active={cutMode === 'slice'} onClick={() => setCutMode('slice')}>Schneiden</Item>
      <Item active={cutMode === 'hide'} onClick={() => setCutMode('hide')}>Ausblenden</Item>
      <div style={{ height: 10 }} />
      {CUT_AXES.map((a) => (
        // Pro Achse: Toggle (an/aus) + bei aktiver Achse ein Positions-Slider.
        <div key={a}>
          <Item active={cuts[a].on} onClick={() => setCut(a, { on: !cuts[a].on, pos: cuts[a].pos })}>
            {CUT_LABEL[a]}
          </Item>
          {cuts[a].on ? (
            <input
              type="range"
              min={-CUT_POS_MAX}
              max={CUT_POS_MAX}
              value={cuts[a].pos}
              onChange={(e) => setCut(a, { on: true, pos: Number(e.target.value) })}
              aria-label={`Schnittposition ${CUT_LABEL[a]}`}
              style={{ width: '100%', margin: '4px 0 8px', accentColor: 'var(--orange)', cursor: 'ew-resize' }}
            />
          ) : null}
        </div>
      ))}
      {/* Atlas-Overlays (Julich/DKT) optional vom Schnitt ausnehmen — zum Vergleich ganz zeigen. */}
      <div style={{ height: 10 }} />
      <div className="eyebrow" style={{ marginBottom: 4 }}>Atlas-Overlay</div>
      <Item active={clipAtlasOverlay} onClick={() => setClipAtlasOverlay(true)}>Mitschneiden</Item>
      <Item active={!clipAtlasOverlay} onClick={() => setClipAtlasOverlay(false)}>Vom Schnitt ausnehmen</Item>
    </>
  )
}

export function ToolFlyoutContent({ onClose }: { onClose: () => void }) {
  const selectMode = useViewerStore((s) => s.selectMode)
  const setSelectMode = useViewerStore((s) => s.setSelectMode)
  const selected = useViewerStore((s) => s.selected)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hidden = useViewerStore((s) => s.hidden)
  const isolated = useViewerStore((s) => s.isolated)
  const select = useViewerStore((s) => s.select)
  const setHidden = useViewerStore((s) => s.setHidden)
  const clearHidden = useViewerStore((s) => s.clearHidden)
  const setIsolated = useViewerStore((s) => s.setIsolated)
  const isolateUp = useViewerStore((s) => s.isolateUp)
  const selectedSlugList = [...selectedSlugs]
  const selectionHasVisibleSlugs = selectedSlugList.some((slug) => !hidden.has(slug))
  const selectionToggleLabel = selectionHasVisibleSlugs ? 'Auswahl ausblenden' : 'Auswahl einblenden'

  return (
    <>
      <AuthoringTransformControls includeEditToggle includeNudgeAction includeResetAction />
      <div style={{ height: 10 }} />
      <div className="eyebrow" style={{ marginBottom: 4 }}>Auswahl</div>
      <Item active={selectMode === 'group'} onClick={() => { setSelectMode('group'); onClose() }}>&#9654; Gruppe</Item>
      <Item active={selectMode === 'direct'} onClick={() => { setSelectMode('direct'); onClose() }}>&#9655; Direkt</Item>
      <Item
        disabled={!selectedSlugList.length}
        disabledReason="Erst eine Struktur auswählen"
        onClick={() => {
          if (!selectedSlugList.length) return
          setHidden(selectedSlugList, selectionHasVisibleSlugs)
          onClose()
        }}
      >
        {selectionToggleLabel}
      </Item>
      <Item
        disabled={!selected}
        disabledReason="Erst eine Struktur auswählen"
        onClick={() => {
          if (!selected) return
          setIsolated(selected)
          onClose()
        }}
      >
        Auswahl isolieren
      </Item>
      <Item
        disabled={!selected}
        disabledReason="Erst eine Struktur auswählen"
        onClick={() => {
          select(null)
          onClose()
        }}
      >
        Auswahl lösen
      </Item>
      <div style={{ height: 10 }} />
      <div className="eyebrow" style={{ marginBottom: 4 }}>Ansicht zurücksetzen</div>
      <Item
        disabled={!hidden.size}
        disabledReason="Keine ausgeblendeten Strukturen"
        onClick={() => {
          clearHidden()
          onClose()
        }}
      >
        Alles zeigen
      </Item>
      <Item
        disabled={!isolated}
        disabledReason="Keine Isolation aktiv"
        onClick={() => {
          isolateUp()
          onClose()
        }}
      >
        Isolationsebene zurück
      </Item>
      <Item
        disabled={!isolated}
        disabledReason="Keine Isolation aktiv"
        onClick={() => {
          setIsolated(null)
          onClose()
        }}
      >
        Isolation aus
      </Item>
    </>
  )
}
