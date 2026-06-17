import type { CSSProperties } from 'react'
import { useViewerStore } from './viewerStore'

const CRUMB_STYLE: CSSProperties = {
  color: 'var(--g600)',
  cursor: 'pointer',
  fontFamily: 'var(--ed-mono)',
  fontSize: 11,
  letterSpacing: '0.04em',
  background: 'transparent',
  border: 0,
  padding: 0,
}

const CLOSE_STYLE: CSSProperties = {
  ...CRUMB_STYLE,
  marginLeft: 4,
  color: 'var(--g500)',
  fontSize: 12,
}

/** Breadcrumb des Isolationsmodus: Alle -> Ober-Gruppe -> fokussierter Knoten. */
export default function IsolationBar() {
  const path = useViewerStore((s) => s.isolationPath)
  const lang = useViewerStore((s) => s.lang)
  const setIsolated = useViewerStore((s) => s.setIsolated)
  if (path.length === 0) return null

  return (
    <nav
      aria-label="Isolation"
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        flexWrap: 'wrap',
        padding: '7px 18px',
        background: 'var(--paper)',
        borderBottom: '1.5px solid var(--line)',
      }}
    >
      <span className="eyebrow">Isolation</span>
      <button type="button" style={CRUMB_STYLE} onClick={() => setIsolated(null)}>
        Alle
      </button>
      {path.map((crumb, index) => {
        const isCurrent = index === path.length - 1
        return (
          <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span aria-hidden style={{ color: 'var(--g500)', fontSize: 10 }}>›</span>
            <button
              type="button"
              aria-current={isCurrent ? 'page' : undefined}
              style={{
                ...CRUMB_STYLE,
                color: isCurrent ? 'var(--orange)' : 'var(--g600)',
                fontWeight: isCurrent ? 600 : 400,
              }}
              onClick={() => setIsolated(crumb.id)}
            >
              {crumb.labels[lang]}
            </button>
          </span>
        )
      })}
      <button type="button" aria-label="Isolation verlassen" title="Isolation verlassen (Esc)" onClick={() => setIsolated(null)} style={CLOSE_STYLE}>
        ✕
      </button>
    </nav>
  )
}
