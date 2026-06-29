import { useState } from 'react'
import { BookOpen, Compass, Layers, MoreHorizontal, X } from 'lucide-react'
import { useViewerStore, type AppMode } from './viewerStore'
import { ROUTE_CHANGE_EVENT } from '../scene/router'
import SettingsPanel from './SettingsPanel'
import type { ResponsiveShellMode } from './explorerShellLayout'

/** Globale Surface-Navigation des Unified Learning Mode (ifn-nav Rail/Dock-Topologie).
 *  Rail (Landscape/Desktop) bzw. Dock (Phone Portrait) fuehren zu den Unified-Surfaces;
 *  die Buehne bleibt frei (Leiste liegt am Rand). Sekundaeres hinter „Mehr". */

interface NavSurface {
  mode: Extract<AppMode, 'learn' | 'explore' | 'atlas'>
  label: string
  description: string
  icon: React.ReactNode
}

const NAV_ICON_PROPS = { size: 20, strokeWidth: 1.8, 'aria-hidden': true } as const

const SURFACES: NavSurface[] = [
  { mode: 'learn', label: 'Lernen', description: 'Geführter Lernschritt mit Inhalt, Fortschritt und nächster Aktion.', icon: <BookOpen {...NAV_ICON_PROPS} /> },
  { mode: 'explore', label: 'Struktur', description: 'Strukturfokus: Suche, Strukturbaum, Auswahl und Isolieren.', icon: <Compass {...NAV_ICON_PROPS} /> },
  { mode: 'atlas', label: 'Atlas', description: 'Präzises fsaverage-Atlas-Supplement als Referenz zum Lernschritt.', icon: <Layers {...NAV_ICON_PROPS} /> },
]

/** appMode wechseln + URL fuer Deep-Link/Reload synchron halten (wie FooterBar/atlasBridge).
 *  Lernen behaelt die aktive Szene (kein URL-Reset), damit der Lernschritt fortsetzbar bleibt. */
function goToSurface(mode: NavSurface['mode'], setAppMode: (m: AppMode) => void) {
  if (mode !== 'learn') {
    window.history.replaceState(null, '', `?mode=${mode}`)
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  }
  setAppMode(mode)
}

export default function ShellNav({ shellMode }: { shellMode: ResponsiveShellMode }) {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const [moreOpen, setMoreOpen] = useState(false)
  const variant = shellMode === 'portrait-drawer' ? 'dock' : 'rail'

  const navTo = (mode: NavSurface['mode']) => {
    goToSurface(mode, setAppMode)
  }

  const surfaceButton = (surface: NavSurface) => {
    const active = appMode === surface.mode
    return (
      <button
        key={surface.mode}
        type="button"
        className={`ed-btn${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
        title={surface.description}
        onClick={() => navTo(surface.mode)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          flex: variant === 'dock' ? 1 : 'none',
          minWidth: 44,
          minHeight: 44,
          padding: variant === 'dock' ? '6px 4px' : '9px 4px',
          background: 'transparent',
          border: 'none',
        }}
      >
        {surface.icon}
        <span className="eyebrow" style={{ fontSize: 8 }}>{surface.label}</span>
      </button>
    )
  }

  const moreButton = (
    <button
      type="button"
      className="ed-btn"
      aria-haspopup="dialog"
      aria-expanded={moreOpen}
      title="Mehr — weitere Surfaces und Einstellungen"
      onClick={() => setMoreOpen(true)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flex: variant === 'dock' ? 1 : 'none',
        minWidth: 44,
        minHeight: 44,
        padding: variant === 'dock' ? '6px 4px' : '9px 4px',
        background: 'transparent',
        border: 'none',
        marginTop: variant === 'rail' ? 'auto' : undefined,
      }}
    >
      <MoreHorizontal {...NAV_ICON_PROPS} />
      <span className="eyebrow" style={{ fontSize: 8 }}>Mehr</span>
    </button>
  )

  return (
    <>
      <nav
        aria-label="Hauptnavigation"
        data-shell-nav={variant}
        className="ed-panel"
        style={
          variant === 'dock'
            ? {
                flex: 'none',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                borderTop: '1.5px solid var(--line)',
              }
            : {
                flex: 'none',
                width: 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '10px 0',
                borderRight: '1.5px solid var(--line)',
              }
        }
      >
        {SURFACES.map(surfaceButton)}
        {moreButton}
      </nav>

      {moreOpen ? (
        <div
          role="dialog"
          aria-label="Mehr"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setMoreOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', border: 'none', cursor: 'pointer' }}
          />
          <div
            className="ed-panel ed-frame"
            style={{
              position: 'relative',
              maxHeight: '86%',
              overflowY: 'auto',
              borderTop: '1.5px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1.5px solid var(--line)' }}>
              <span className="eyebrow">Mehr</span>
              <button type="button" className="ed-btn" style={{ padding: '6px 9px', minHeight: 44, minWidth: 44 }} onClick={() => setMoreOpen(false)}>
                <X size={16} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: 6 }}>
              {SURFACES.map((surface) => {
                const active = appMode === surface.mode
                return (
                  <button
                    key={surface.mode}
                    type="button"
                    className={`ed-btn${active ? ' active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => { navTo(surface.mode); setMoreOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '10px 12px', minHeight: 44 }}
                  >
                    {surface.icon}
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{surface.label}</span>
                      <span className="eyebrow" style={{ color: 'var(--g500)' }}>{surface.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div style={{ borderTop: '1.5px solid var(--line)', padding: '12px' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Einstellungen</div>
              <SettingsPanel />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
