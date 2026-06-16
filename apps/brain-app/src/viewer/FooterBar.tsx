import { useEffect, useRef, useState } from 'react'
import { useViewerStore, type AppMode, type CutAxis, type SelectMode } from './viewerStore'
import { CUT_AXES, CUT_POS_MAX } from './cutCapsMerged'
import type { ColorMode } from './ontology'
import { fetchColorPresets, presetIssue, type ColorPreset } from './colorPresets'
import { exportViewerStateSnapshotJson, importViewerStateSnapshotJson } from './viewerStateSnapshot'
import { useIsPhone } from '../useMediaQuery'
import Flyout from './Flyout'
import SourcesPage from './SourcesPage'

type OpenFlyout = 'atlas' | 'mode' | 'color' | 'cut' | 'view' | 'context' | 'snapshot' | 'tool' | null

/** Kamera-Schnellwinkel (Shot-Name aus cameraPresets -> Label). */
const VIEW_PRESETS: { name: string; label: string }[] = [
  { name: 'anterior', label: 'Anterior' },
  { name: 'lateral-left', label: 'Lateral' },
  { name: 'superior', label: 'Superior' },
  { name: 'medial-midline', label: 'Medial' },
]

const MODE_LABEL: Record<AppMode, string> = { learn: 'Lernen', explore: 'Explorer', phineas: 'Phineas Gage', atlas: 'Atlas' }
const TOOL_LABEL: Record<SelectMode, string> = { group: 'Gruppe', direct: 'Direkt' }
const COLOR_LABEL: Record<ColorMode, string> = {
  anatomical: 'Anatomisch',
  function: 'Funktionssystem',
  laterality: 'Lateralität',
  region: 'Region',
  preset: 'Figur',
}
const BASE_COLOR_MODES: ColorMode[] = ['anatomical', 'function', 'laterality', 'region']
const CUT_LABEL: Record<CutAxis, string> = {
  sagittal: 'Sagittal',
  coronal: 'Coronal',
  axial: 'Axial',
}

/** Menue-Eintrag im Flyout (volle Breite, linksbuendig). */
function Item({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`ed-btn${active ? ' active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        marginBottom: 2,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

interface BoxDef {
  key: Exclude<OpenFlyout, null>
  eyebrow: string
  label: string
  content: React.ReactNode
}

function readSnapshotFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Snapshot-Datei konnte nicht gelesen werden'))
    reader.readAsText(file)
  })
}

/** Fussleiste als globales Viewport-Cockpit: App-Ebene (Atlas, Modus) plus modusuebergreifende
 *  Darstellungs-Werkzeuge. Box-breite Flyouts klappen nach oben auf; Boxen gleichmaessig verteilt. */
export default function FooterBar() {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
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
  const colorMode = useViewerStore((s) => s.colorMode)
  const setColorMode = useViewerStore((s) => s.setColorMode)
  const activePreset = useViewerStore((s) => s.activePreset)
  const setPreset = useViewerStore((s) => s.setPreset)
  const [presets, setPresets] = useState<ColorPreset[]>([])
  const [presetError, setPresetError] = useState<Error | null>(null)
  // Figur-Presets einmal laden; Fehler laut nach oben (kein stiller Fallback).
  useEffect(() => {
    fetchColorPresets().then(setPresets, setPresetError)
  }, [])
  if (presetError) throw presetError
  const cuts = useViewerStore((s) => s.cuts)
  const setCut = useViewerStore((s) => s.setCut)
  const cutMode = useViewerStore((s) => s.cutMode)
  const setCutMode = useViewerStore((s) => s.setCutMode)
  const clipAtlasOverlay = useViewerStore((s) => s.clipAtlasOverlay)
  const setClipAtlasOverlay = useViewerStore((s) => s.setClipAtlasOverlay)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)
  const setCarveOverlay = useViewerStore((s) => s.setCarveOverlay)
  const setCameraView = useViewerStore((s) => s.setCameraView)
  const showSkull = useViewerStore((s) => s.showSkull)
  const skullOpacity = useViewerStore((s) => s.skullOpacity)
  const setSkull = useViewerStore((s) => s.setSkull)
  const [open, setOpen] = useState<OpenFlyout>(null)
  const [showSources, setShowSources] = useState(false)
  const [snapshotError, setSnapshotError] = useState<Error | null>(null)
  const snapshotInputRef = useRef<HTMLInputElement>(null)
  const toggle = (which: OpenFlyout) => setOpen((cur) => (cur === which ? null : which))
  const close = () => setOpen(null)
  const isPhone = useIsPhone()
  const selectedSlugList = [...selectedSlugs]
  const selectionHasVisibleSlugs = selectedSlugList.some((slug) => !hidden.has(slug))
  const selectionToggleLabel = selectionHasVisibleSlugs ? 'Auswahl ausblenden' : 'Auswahl einblenden'
  const exportSnapshot = () => {
    const blob = new Blob([exportViewerStateSnapshotJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `brain-app-unterricht-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const importSnapshotFile = async (file: File | null | undefined) => {
    if (!file) return
    try {
      importViewerStateSnapshotJson(await readSnapshotFile(file))
      close()
    } catch (error) {
      setSnapshotError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      if (snapshotInputRef.current) snapshotInputRef.current.value = ''
    }
  }

  if (snapshotError) throw snapshotError

  // Box-Liste in Anzeige-Reihenfolge. Werkzeug (Klickmodus) nur im Explorer sinnvoll.
  const boxes: BoxDef[] = [
    {
      key: 'atlas',
      eyebrow: 'Atlas',
      // Label zeigt das aktive Atlas-auf-Hirn-Overlay (Carve, 0 mm auf TARO) oder „Menü".
      label: showCarveDkt ? 'DKT' : showCarveJulich ? 'Julich' : showCarveBrodmann ? 'Brodmann' : 'Menü',
      content: (
        <>
          {/* Atlas-Areale direkt auf dem TARO-Hirn (Carve = 0 mm, anklickbar zeigt Namen).
              Eines zur Zeit — DKT (gyral), Julich (zytoarchitektonisch) oder Brodmann (klassisch). */}
          <div className="eyebrow" style={{ marginBottom: 4 }}>Atlas auf Hirn</div>
          <Item active={!showCarveJulich && !showCarveDkt && !showCarveBrodmann} onClick={() => { setCarveOverlay('julich', false); setCarveOverlay('dkt', false); setCarveOverlay('brodmann', false); close() }}>Aus</Item>
          <Item active={showCarveDkt} onClick={() => { setCarveOverlay('dkt', true); setCarveOverlay('julich', false); setCarveOverlay('brodmann', false); close() }}>DKT (Gyri)</Item>
          <Item active={showCarveJulich} onClick={() => { setCarveOverlay('julich', true); setCarveOverlay('dkt', false); setCarveOverlay('brodmann', false); close() }}>Julich (Areale)</Item>
          <Item active={showCarveBrodmann} onClick={() => { setCarveOverlay('brodmann', true); setCarveOverlay('julich', false); setCarveOverlay('dkt', false); close() }}>Brodmann (BA)</Item>
          <div style={{ height: 10 }} />
          <Item onClick={() => { setShowSources(true); close() }}>Quellen &amp; Lizenzen</Item>
        </>
      ),
    },
    {
      key: 'mode',
      eyebrow: 'Modus',
      label: MODE_LABEL[appMode],
      // 'atlas' (kanonischer fsaverage-Modus) ist DEBUG-ONLY -> nicht im normalen Modus-Flyout,
      // nur per Deep-Link ?mode=atlas erreichbar. Die regulaeren Modi sind learn/explore/phineas.
      content: (['learn', 'explore', 'phineas'] as const).map((m) => (
        <Item key={m} active={appMode === m} onClick={() => { setAppMode(m); close() }}>
          {MODE_LABEL[m]}
        </Item>
      )),
    },
    {
      key: 'color',
      eyebrow: 'Farbe',
      label: colorMode === 'preset' && activePreset ? activePreset.label : COLOR_LABEL[colorMode],
      content: (
        <>
          {BASE_COLOR_MODES.map((c) => (
            <Item key={c} active={colorMode === c} onClick={() => { setColorMode(c); close() }}>
              {COLOR_LABEL[c]}
            </Item>
          ))}
          {/* Figur-spezifische Faerbungen (Lehrbuch-Abbildungen) — didaktische Gruppen-Farben. */}
          {presets.length > 0 ? (
            <>
              <div className="eyebrow" style={{ margin: '8px 0 4px' }}>Figur-Färbungen</div>
              {presets.map((p) => {
                // Noch nicht baubares Preset (Geometrie-Luecke) deaktivieren + Grund zeigen,
                // statt beim Klick den Viewer crashen zu lassen (fail-loud am richtigen Ort).
                const issue = presetIssue(p)
                return (
                  <Item
                    key={p.id}
                    active={colorMode === 'preset' && activePreset?.id === p.id}
                    disabled={issue !== null}
                    title={issue ?? undefined}
                    onClick={() => { if (!issue) { setPreset(p); close() } }}
                  >
                    {p.label}
                  </Item>
                )
              })}
            </>
          ) : null}
        </>
      ),
    },
    {
      key: 'cut',
      eyebrow: 'Schnitte',
      label: CUT_AXES.filter((a) => cuts[a].on).map((a) => CUT_LABEL[a]).join(' · ') || 'Aus',
      content: (
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
      ),
    },
    {
      key: 'view',
      eyebrow: 'Ansicht',
      label: 'Ausrichten',
      content: VIEW_PRESETS.map((v) => (
        <Item key={v.name} onClick={() => { setCameraView(v.name); close() }}>
          {v.label}
        </Item>
      )),
    },
    {
      key: 'context',
      eyebrow: 'Kontext',
      label: showSkull ? 'Schädel' : 'Aus',
      content: (
        <>
          <Item active={!showSkull} onClick={() => { setSkull(false); close() }}>Aus</Item>
          <Item active={showSkull && skullOpacity <= 0.5} onClick={() => { setSkull(true, 0.25); close() }}>Schädel transparent</Item>
          <Item active={showSkull && skullOpacity > 0.5} onClick={() => { setSkull(true, 0.85); close() }}>Schädel solide</Item>
        </>
      ),
    },
    {
      key: 'snapshot',
      eyebrow: 'Zustand',
      label: 'Datei',
      content: (
        <>
          <Item onClick={() => { exportSnapshot(); close() }}>Exportieren</Item>
          <Item onClick={() => snapshotInputRef.current?.click()}>Importieren</Item>
        </>
      ),
    },
    ...(appMode === 'explore'
      ? [
          {
            key: 'tool' as const,
            eyebrow: 'Werkzeug',
            label: TOOL_LABEL[selectMode],
            content: (
              <>
                <Item active={selectMode === 'group'} onClick={() => { setSelectMode('group'); close() }}>▸ Gruppe</Item>
                <Item active={selectMode === 'direct'} onClick={() => { setSelectMode('direct'); close() }}>▹ Direkt</Item>
                <div style={{ height: 10 }} />
                <div className="eyebrow" style={{ marginBottom: 4 }}>Auswahl</div>
                <Item
                  disabled={!selectedSlugList.length}
                  onClick={() => {
                    if (!selectedSlugList.length) return
                    setHidden(selectedSlugList, selectionHasVisibleSlugs)
                    close()
                  }}
                >
                  {selectionToggleLabel}
                </Item>
                <Item
                  disabled={!selected}
                  onClick={() => {
                    if (!selected) return
                    setIsolated(selected)
                    close()
                  }}
                >
                  Auswahl isolieren
                </Item>
                <Item
                  disabled={!selected}
                  onClick={() => {
                    select(null)
                    close()
                  }}
                >
                  Auswahl lösen
                </Item>
                <div style={{ height: 10 }} />
                <div className="eyebrow" style={{ marginBottom: 4 }}>Ansicht zurücksetzen</div>
                <Item
                  disabled={!hidden.size}
                  onClick={() => {
                    clearHidden()
                    close()
                  }}
                >
                  Alles zeigen
                </Item>
                <Item
                  disabled={!isolated}
                  onClick={() => {
                    isolateUp()
                    close()
                  }}
                >
                  Isolationsebene zurück
                </Item>
                <Item
                  disabled={!isolated}
                  onClick={() => {
                    setIsolated(null)
                    close()
                  }}
                >
                  Isolation aus
                </Item>
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <input
        ref={snapshotInputRef}
        aria-label="Unterrichts-Snapshot-Datei"
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(event) => { void importSnapshotFile(event.currentTarget.files?.[0]) }}
      />
      <div className="ed-foot" style={{ gridTemplateColumns: `repeat(${boxes.length}, 1fr)` }}>
        {boxes.map((box, i) => (
          <Flyout
            key={box.key}
            eyebrow={box.eyebrow}
            label={box.label}
            // Popover rechts verankern, wenn die Box am rechten Rand sitzt (kein Viewport-Ueberlauf).
            // Phone: 3 Boxen pro Reihe (flex-wrap) -> jede 3. Spalte rechts. Sonst: rechte Haelfte.
            align={(isPhone ? i % 3 === 2 : i >= boxes.length / 2) ? 'right' : 'left'}
            open={open === box.key}
            onToggle={() => toggle(box.key)}
            onClose={close}
          >
            {box.content}
          </Flyout>
        ))}
      </div>

      {showSources ? <SourcesPage onClose={() => setShowSources(false)} /> : null}
    </>
  )
}
