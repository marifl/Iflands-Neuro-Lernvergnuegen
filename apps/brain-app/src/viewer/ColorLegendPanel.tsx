import type { ReactNode } from 'react'
import { Eye, EyeOff, Minus, Plus } from 'lucide-react'
import { useViewerStore } from './viewerStore'

function LegendIconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--line-soft)',
        background: 'var(--paper)',
        color: 'var(--g700)',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

export default function ColorLegendPanel({
  title,
  subtitle,
  children,
  maxWidth = 360,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  maxWidth?: number
}) {
  const legend = useViewerStore((s) => s.colorLegend)
  const setLegend = useViewerStore((s) => s.setColorLegend)
  const iconProps = { size: 14, strokeWidth: 1.8, 'aria-hidden': true } as const

  if (!legend.visible) {
    return (
      <button
        type="button"
        className="ed-btn"
        aria-label="Legende anzeigen"
        title="Legende anzeigen"
        onClick={() => setLegend({ visible: true })}
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 15,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 9px',
          pointerEvents: 'auto',
        }}
      >
        <Eye {...iconProps} />
        <span>Legende</span>
      </button>
    )
  }

  return (
    <div
      className="ed-panel ed-frame"
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 15,
        padding: legend.minimized ? '8px 9px' : '10px 13px',
        pointerEvents: 'auto',
        width: legend.minimized ? 230 : undefined,
        maxWidth: `min(${maxWidth}px, calc(100vw - 32px))`,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Färbung</div>
          <div
            style={{
              fontFamily: 'var(--ed-display)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontSize: 14,
              color: 'var(--ink)',
              marginTop: 4,
              lineHeight: 1.15,
              whiteSpace: legend.minimized ? 'nowrap' : undefined,
              overflow: legend.minimized ? 'hidden' : undefined,
              textOverflow: legend.minimized ? 'ellipsis' : undefined,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <LegendIconButton
            label={legend.minimized ? 'Legende erweitern' : 'Legende minimieren'}
            onClick={() => setLegend({ minimized: !legend.minimized })}
          >
            {legend.minimized ? <Plus {...iconProps} /> : <Minus {...iconProps} />}
          </LegendIconButton>
          <LegendIconButton label="Legende verbergen" onClick={() => setLegend({ visible: false })}>
            <EyeOff {...iconProps} />
          </LegendIconButton>
        </div>
      </div>
      {legend.minimized ? null : (
        <>
          {subtitle ? (
            <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 9.5, lineHeight: 1.45, color: 'var(--g600)', margin: '8px 0' }}>
              {subtitle}
            </div>
          ) : null}
          {children}
        </>
      )}
    </div>
  )
}
