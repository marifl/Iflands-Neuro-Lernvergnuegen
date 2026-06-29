import { useRef, useState } from 'react'
import { BookOpen, Camera, FileJson, Map as MapIcon, MousePointer2, Palette, Scissors, Settings2, Skull } from 'lucide-react'
import { useViewerStore } from './viewerStore'
import { CUT_AXES } from './cutCapsMerged'
import { downloadViewerSnapshot, importViewerSnapshotFile } from './localDataActions'
import { useIsPhone } from '../useMediaQuery'
import Flyout from './Flyout'
import SourcesPage from './SourcesPage'
import { useSettingsStore } from './settingsStore'
import { APP_MODE_LABEL, REGULAR_APP_MODE_DEFINITIONS } from './appModeDefinitions'
import { ROUTE_CHANGE_EVENT } from '../scene/router'
import { COLOR_MODE_LABEL } from './colorModeDefinitions'
import SettingsPanel from './SettingsPanel'
import { ShellControlButton } from './ShellStatePrimitives'
import { ColorFlyoutContent, CutFlyoutContent, ToolFlyoutContent, CUT_LABEL, TOOL_LABEL } from './FooterFlyoutContents'

type OpenFlyout = 'atlas' | 'mode' | 'color' | 'cut' | 'view' | 'context' | 'snapshot' | 'tool' | 'settings' | null

/** Kamera-Schnellwinkel (Shot-Name aus cameraPresets -> Label). */
const VIEW_PRESETS: { name: string; label: string }[] = [
  { name: 'anterior', label: 'Anterior' },
  { name: 'lateral-left', label: 'Lateral' },
  { name: 'superior', label: 'Superior' },
  { name: 'medial-midline', label: 'Medial' },
]

/** Menue-Eintrag im Flyout (volle Breite, linksbuendig). */
export function Item({
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
const MOBILE_BOX_ORDER: BoxDef['key'][] = ['mode', 'tool', 'view', 'cut', 'color', 'atlas', 'snapshot', 'settings']

/** Fussleiste als globales Viewport-Cockpit: App-Ebene (Atlas, Modus) plus modusuebergreifende
 *  Darstellungs-Werkzeuge. Box-breite Flyouts klappen nach oben auf; Boxen gleichmaessig verteilt. */
export default function FooterBar() {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const selectMode = useViewerStore((s) => s.selectMode)
  const authoringEditMode = useViewerStore((s) => s.authoringEditMode)
  const colorMode = useViewerStore((s) => s.colorMode)
  const activePreset = useViewerStore((s) => s.activePreset)
  const cuts = useViewerStore((s) => s.cuts)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)
  const setCarveOverlay = useViewerStore((s) => s.setCarveOverlay)
  const setCameraView = useViewerStore((s) => s.setCameraView)
  const skullContext = useSettingsStore((s) => s.viewport.skullContext)
  const updateSettings = useSettingsStore((s) => s.updateCategory)
  const [open, setOpen] = useState<OpenFlyout>(null)
  const [showSources, setShowSources] = useState(false)
  const [snapshotError, setSnapshotError] = useState<Error | null>(null)
  const snapshotInputRef = useRef<HTMLInputElement>(null)
  const toggle = (which: OpenFlyout) => setOpen((cur) => (cur === which ? null : which))
  const close = () => setOpen(null)
  const isPhone = useIsPhone()
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

  const boxes: BoxDef[] = [
    {
      key: 'atlas',
      eyebrow: 'Atlas',
      label: showCarveDkt ? 'DKT' : showCarveJulich ? 'Julich' : showCarveBrodmann ? 'Brodmann' : 'Menü',
      icon: <MapIcon {...FOOTER_ICON_PROPS} />,
      content: (
        <>
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
      eyebrow: 'Lernraum',
      label: APP_MODE_LABEL[appMode],
      icon: <BookOpen {...FOOTER_ICON_PROPS} />,
      // Lernen ist der primaere Flow (Home); Strukturfokus ist eine Surface darin.
      // Jede Nicht-Lern-Surface bekommt einen sichtbaren Rueckweg zum Lernschritt.
      content: (
        <>
          {appMode !== 'learn' ? (
            <Item onClick={() => { setAppMode('learn'); close() }}>← Zurück zum Lernschritt</Item>
          ) : null}
          {REGULAR_APP_MODE_DEFINITIONS.map((definition) => (
            <Item key={definition.mode} active={appMode === definition.mode} onClick={() => {
              if (definition.mode !== 'learn') {
                window.history.replaceState(null, '', `?mode=${definition.mode}`)
                window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
              }
              setAppMode(definition.mode)
              close()
            }}>
              {definition.mode === 'learn' ? `${definition.label} · Home` : definition.label}
            </Item>
          ))}
        </>
      ),
    },
    {
      key: 'color',
      eyebrow: 'Färbung',
      label: colorMode === 'preset' && activePreset ? activePreset.label : COLOR_MODE_LABEL[colorMode],
      icon: <Palette {...FOOTER_ICON_PROPS} />,
      content: <ColorFlyoutContent onClose={close} />,
    },
    {
      key: 'cut',
      eyebrow: 'Schnitte',
      label: CUT_AXES.filter((a) => cuts[a].on).map((a) => CUT_LABEL[a]).join(' · ') || 'Aus',
      icon: <Scissors {...FOOTER_ICON_PROPS} />,
      content: <CutFlyoutContent />,
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
      label: skullContext !== 'hidden' ? 'Schädel' : 'Aus',
      icon: <Skull {...FOOTER_ICON_PROPS} />,
      content: (
        <>
          <Item active={skullContext === 'hidden'} onClick={() => { updateSettings('viewport', { skullContext: 'hidden' }); close() }}>Aus</Item>
          <Item active={skullContext === 'transparent'} onClick={() => { updateSettings('viewport', { skullContext: 'transparent' }); close() }}>Schädel transparent</Item>
          <Item active={skullContext === 'solid'} onClick={() => { updateSettings('viewport', { skullContext: 'solid' }); close() }}>Schädel solide</Item>
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
      content: <ToolFlyoutContent onClose={close} />,
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
