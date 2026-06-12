import { useEffect, useState } from 'react'
import { useViewerStore, type AppMode, type CutAxis, type SelectMode } from './viewerStore'
import { CUT_AXES, CUT_POS_MAX } from './cutCapsMerged'
import type { ColorMode } from './ontology'
import { fetchColorPresets, presetIssue, type ColorPreset } from './colorPresets'
import { useIsPhone } from '../useMediaQuery'
import Flyout from './Flyout'
import SourcesPage from './SourcesPage'

type OpenFlyout = 'atlas' | 'mode' | 'color' | 'cut' | 'view' | 'context' | 'tool' | null

/** Kamera-Schnellwinkel (Shot-Name aus cameraPresets -> Label). */
const VIEW_PRESETS: { name: string; label: string }[] = [
  { name: 'anterior', label: 'Anterior' },
  { name: 'lateral-left', label: 'Lateral' },
  { name: 'superior', label: 'Superior' },
  { name: 'medial-midline', label: 'Medial' },
]

const MODE_LABEL: Record<AppMode, string> = { learn: 'Lernen', explore: 'Explorer', phineas: 'Phineas Gage' }
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

/** Fussleiste als globales Viewport-Cockpit: App-Ebene (Atlas, Modus) plus modusuebergreifende
 *  Darstellungs-Werkzeuge. Box-breite Flyouts klappen nach oben auf; Boxen gleichmaessig verteilt. */
export default function FooterBar() {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const selectMode = useViewerStore((s) => s.selectMode)
  const setSelectMode = useViewerStore((s) => s.setSelectMode)
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
  const setCameraView = useViewerStore((s) => s.setCameraView)
  const showSkull = useViewerStore((s) => s.showSkull)
  const skullOpacity = useViewerStore((s) => s.skullOpacity)
  const setSkull = useViewerStore((s) => s.setSkull)
  const [open, setOpen] = useState<OpenFlyout>(null)
  const [showSources, setShowSources] = useState(false)
  const toggle = (which: OpenFlyout) => setOpen((cur) => (cur === which ? null : which))
  const close = () => setOpen(null)
  const isPhone = useIsPhone()

  // Box-Liste in Anzeige-Reihenfolge. Werkzeug (Klickmodus) nur im Explorer sinnvoll.
  const boxes: BoxDef[] = [
    {
      key: 'atlas',
      eyebrow: 'Atlas',
      label: 'Menü',
      content: <Item onClick={() => { setShowSources(true); close() }}>Quellen &amp; Lizenzen</Item>,
    },
    {
      key: 'mode',
      eyebrow: 'Modus',
      label: MODE_LABEL[appMode],
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
              </>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
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
