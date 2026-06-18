import { useEffect, useRef, useState } from 'react'
import { BookOpen, Camera, FileJson, Map, MousePointer2, Palette, Scissors, Settings2, Skull } from 'lucide-react'
import { useViewerStore, type CutAxis, type PresetViewOptions, type SelectMode } from './viewerStore'
import { CUT_AXES, CUT_POS_MAX } from './cutCapsMerged'
import { fetchColorPresets, presetIssue, type ColorPreset } from './colorPresets'
import { downloadViewerSnapshot, importViewerSnapshotFile } from './localDataActions'
import { useIsPhone } from '../useMediaQuery'
import Flyout from './Flyout'
import SourcesPage from './SourcesPage'
import { APP_MODE_LABEL, REGULAR_APP_MODE_DEFINITIONS } from './appModeDefinitions'
import { BASE_COLOR_MODE_DEFINITIONS, COLOR_MODE_LABEL } from './colorModeDefinitions'
import { PresetGroupExplanation, PresetReadOnlyAction } from './PresetColorExplanation'
import SettingsPanel from './SettingsPanel'
import { ShellControlButton } from './ShellStatePrimitives'
import { AuthoringTransformControls } from './AuthoringTransformControls'

type OpenFlyout = 'atlas' | 'mode' | 'color' | 'cut' | 'view' | 'context' | 'snapshot' | 'tool' | 'settings' | null

/** Kamera-Schnellwinkel (Shot-Name aus cameraPresets -> Label). */
const VIEW_PRESETS: { name: string; label: string }[] = [
  { name: 'anterior', label: 'Anterior' },
  { name: 'lateral-left', label: 'Lateral' },
  { name: 'superior', label: 'Superior' },
  { name: 'medial-midline', label: 'Medial' },
]

const TOOL_LABEL: Record<SelectMode, string> = { group: 'Gruppe', direct: 'Direkt' }
const CUT_LABEL: Record<CutAxis, string> = {
  sagittal: 'Sagittal',
  coronal: 'Coronal',
  axial: 'Axial',
}

/** Menue-Eintrag im Flyout (volle Breite, linksbuendig). */
function Item({
  active,
  disabled,
  disabledReason,
  title,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  disabledReason?: string
  title?: string
  onClick: () => void
  children: React.ReactNode
}) {
  const reason = disabled ? disabledReason ?? title ?? 'Aktion aktuell nicht verfuegbar' : null
  return (
    <ShellControlButton
      active={active}
      onClick={onClick}
      disabledReason={reason}
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
    </ShellControlButton>
  )
}

function PresetViewSlider({
  label,
  active,
  onChange,
}: {
  label: string
  active: boolean
  onChange: (active: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 8,
        alignItems: 'center',
        padding: '4px 8px 6px',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.25 }}>{label}</span>
      <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, color: active ? 'var(--orange)' : 'var(--g500)' }}>
        {active ? 'An' : 'Aus'}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={1}
        value={active ? 1 : 0}
        onChange={(event) => onChange(Number(event.currentTarget.value) === 1)}
        aria-label={label}
        style={{ gridColumn: '1 / -1', width: '100%', accentColor: 'var(--orange)', cursor: 'ew-resize' }}
      />
    </label>
  )
}

interface BoxDef {
  key: Exclude<OpenFlyout, null>
  eyebrow: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
  popoverWidth?: string
  popoverMaxWidth?: string
}

const FOOTER_ICON_PROPS = { size: 18, strokeWidth: 1.8, 'aria-hidden': true } as const
const MOBILE_BOX_ORDER: BoxDef['key'][] = ['mode', 'tool', 'view', 'cut', 'color', 'context', 'atlas', 'snapshot', 'settings']

/** Fussleiste als globales Viewport-Cockpit: App-Ebene (Atlas, Modus) plus modusuebergreifende
 *  Darstellungs-Werkzeuge. Box-breite Flyouts klappen nach oben auf; Boxen gleichmaessig verteilt. */
export default function FooterBar() {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const selectMode = useViewerStore((s) => s.selectMode)
  const setSelectMode = useViewerStore((s) => s.setSelectMode)
  const authoringEditMode = useViewerStore((s) => s.authoringEditMode)
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
  const presetViewOptions = useViewerStore((s) => s.presetViewOptions)
  const setPresetViewOptions = useViewerStore((s) => s.setPresetViewOptions)
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
  const importSnapshotFile = async (file: File | null | undefined) => {
    if (!file) return
    try {
      await importViewerSnapshotFile(file)
      close()
    } catch (error) {
      setSnapshotError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      if (snapshotInputRef.current) snapshotInputRef.current.value = ''
    }
  }
  if (snapshotError) throw snapshotError

  // Box-Liste in Anzeige-Reihenfolge. Werkzeug kombiniert Auswahlmodus und expliziten Asset-Edit.
  const boxes: BoxDef[] = [
    {
      key: 'atlas',
      eyebrow: 'Atlas',
      // Label zeigt das aktive Atlas-auf-Hirn-Overlay (Carve, 0 mm auf TARO) oder „Menü".
      label: showCarveDkt ? 'DKT' : showCarveJulich ? 'Julich' : showCarveBrodmann ? 'Brodmann' : 'Menü',
      icon: <Map {...FOOTER_ICON_PROPS} />,
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
      label: APP_MODE_LABEL[appMode],
      icon: <BookOpen {...FOOTER_ICON_PROPS} />,
      // 'atlas' (kanonischer fsaverage-Modus) ist DEBUG-ONLY -> nicht im normalen Modus-Flyout,
      // nur per Deep-Link ?mode=atlas erreichbar. Die regulaeren Modi sind learn/explore/phineas.
      content: REGULAR_APP_MODE_DEFINITIONS.map((definition) => (
        <Item key={definition.mode} active={appMode === definition.mode} onClick={() => { setAppMode(definition.mode); close() }}>
          {definition.label}
        </Item>
      )),
    },
    {
      key: 'color',
      eyebrow: 'Färbung',
      label: colorMode === 'preset' && activePreset ? activePreset.label : COLOR_MODE_LABEL[colorMode],
      icon: <Palette {...FOOTER_ICON_PROPS} />,
      content: (
        <>
          {BASE_COLOR_MODE_DEFINITIONS.map((definition) => (
            <Item key={definition.mode} active={colorMode === definition.mode} onClick={() => { setColorMode(definition.mode); close() }}>
              {definition.label}
            </Item>
          ))}
          {/* Figur-spezifische Färbungen (Lehrbuch-Abbildungen) — didaktische Gruppen-Farben. */}
          {presets.length > 0 ? (
            <>
              <div className="eyebrow" style={{ margin: '8px 0 4px' }}>Figur-Färbungen</div>
              {presets.map((p) => {
                // Noch nicht baubares Preset (Geometrie-Lücke) deaktivieren + Grund zeigen,
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
              {colorMode === 'preset' && activePreset ? (
                <>
                  <div style={{ height: 8 }} />
                  <PresetGroupExplanation preset={activePreset} />
                  <div className="eyebrow" style={{ margin: '0 0 4px' }}>Aktionen</div>
                  <PresetReadOnlyAction label="Andere dimmen" active={activePreset.dimOthers} />
                  <PresetViewSlider
                    label="Andere ausblenden"
                    active={presetViewOptions.hideUncolored}
                    onChange={(hideUncolored) => setPresetViewOptions({ hideUncolored } satisfies Partial<PresetViewOptions>)}
                  />
                  <PresetViewSlider
                    label="Eingefärbte fokussieren"
                    active={presetViewOptions.focusColored}
                    onChange={(focusColored) => setPresetViewOptions({ focusColored } satisfies Partial<PresetViewOptions>)}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </>
      ),
    },
    {
      key: 'cut',
      eyebrow: 'Schnitte',
      label: CUT_AXES.filter((a) => cuts[a].on).map((a) => CUT_LABEL[a]).join(' · ') || 'Aus',
      icon: <Scissors {...FOOTER_ICON_PROPS} />,
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
      icon: <Camera {...FOOTER_ICON_PROPS} />,
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
      icon: <Skull {...FOOTER_ICON_PROPS} />,
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
      icon: <FileJson {...FOOTER_ICON_PROPS} />,
      content: (
        <>
          <Item onClick={() => { downloadViewerSnapshot(); close() }}>Exportieren</Item>
          <Item onClick={() => snapshotInputRef.current?.click()}>Importieren</Item>
        </>
      ),
    },
    {
      key: 'settings',
      eyebrow: 'Mehr',
      label: 'Einstellungen',
      icon: <Settings2 {...FOOTER_ICON_PROPS} />,
      popoverWidth: 'min(720px, calc(100vw - 24px))',
      popoverMaxWidth: 'calc(100vw - 24px)',
      content: <SettingsPanel />,
    },
    {
      key: 'tool',
      eyebrow: 'Werkzeug',
      label: authoringEditMode ? 'Asset-Edit' : TOOL_LABEL[selectMode],
      icon: <MousePointer2 {...FOOTER_ICON_PROPS} />,
      content: (
        <>
          <AuthoringTransformControls includeEditToggle includeNudgeAction includeResetAction />
          <div style={{ height: 10 }} />
          <div className="eyebrow" style={{ marginBottom: 4 }}>Auswahl</div>
          <Item active={selectMode === 'group'} onClick={() => { setSelectMode('group'); close() }}>▸ Gruppe</Item>
          <Item active={selectMode === 'direct'} onClick={() => { setSelectMode('direct'); close() }}>▹ Direkt</Item>
          <Item
            disabled={!selectedSlugList.length}
            disabledReason="Erst eine Struktur auswählen"
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
            disabledReason="Erst eine Struktur auswählen"
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
            disabledReason="Erst eine Struktur auswählen"
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
            disabledReason="Keine ausgeblendeten Strukturen"
            onClick={() => {
              clearHidden()
              close()
            }}
          >
            Alles zeigen
          </Item>
          <Item
            disabled={!isolated}
            disabledReason="Keine Isolation aktiv"
            onClick={() => {
              isolateUp()
              close()
            }}
          >
            Isolationsebene zurück
          </Item>
          <Item
            disabled={!isolated}
            disabledReason="Keine Isolation aktiv"
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
  const visibleBoxes = isPhone
    ? MOBILE_BOX_ORDER.flatMap((key) => {
        const box = boxes.find((candidate) => candidate.key === key)
        return box ? [box] : []
      })
    : boxes

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
      <div className="ed-foot" style={{ gridTemplateColumns: `repeat(${visibleBoxes.length}, 1fr)` }}>
        {visibleBoxes.map((box, i) => (
          <Flyout
            key={box.key}
            eyebrow={box.eyebrow}
            label={box.label}
            icon={box.icon}
            // Popover rechts verankern, wenn die Box am rechten Rand sitzt (kein Viewport-Ueberlauf).
            // Phone: horizontaler Icon-Dock -> rechte Hälfte rechts ankern. Sonst: rechte Hälfte.
            align={i >= visibleBoxes.length / 2 ? 'right' : 'left'}
            open={open === box.key}
            onToggle={() => toggle(box.key)}
            onClose={close}
            popoverWidth={box.popoverWidth}
            popoverMaxWidth={box.popoverMaxWidth}
          >
            {box.content}
          </Flyout>
        ))}
      </div>

      {showSources ? <SourcesPage onClose={() => setShowSources(false)} /> : null}
    </>
  )
}
