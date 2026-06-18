import { useEffect, useId, useRef } from 'react'

interface FlyoutProps {
  eyebrow: string
  label: string
  icon?: React.ReactNode
  open: boolean
  onToggle: () => void
  onClose: () => void
  disabled?: boolean
  /** Ankerseite des Popovers. 'right' fuer Boxen am rechten Rand (kein Viewport-Ueberlauf). */
  align?: 'left' | 'right'
  popoverWidth?: string
  popoverMaxWidth?: string
  children: React.ReactNode
}

/** Popover, klappt nach oben aus einer Fussleisten-Box auf. Mindestens box-breit, waechst aber
 *  mit dem Inhalt (kein Abschneiden langer Eintraege wie "Phineas Gage"), gedeckelt gegen
 *  Viewport-Ueberlauf. Schliesst bei Escape und Aussenklick. Der Trigger fuellt die Box. */
export default function Flyout({
  eyebrow,
  label,
  icon,
  open,
  onToggle,
  onClose,
  disabled,
  align = 'left',
  popoverWidth = 'max-content',
  popoverMaxWidth = 'min(280px, 80vw)',
  children,
}: FlyoutProps) {
  const popoverId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const lastTouchToggleAt = useRef(0)
  const activate = () => {
    if (!disabled) onToggle()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose])

  return (
    <div ref={ref} className="col" style={{ position: 'relative', cursor: disabled ? 'default' : 'pointer' }}>
      <button
        type="button"
        className="flyout-trigger"
        onPointerUp={(event) => {
          if (event.pointerType !== 'touch') return
          event.preventDefault()
          lastTouchToggleAt.current = Date.now()
          activate()
        }}
        onClick={() => {
          if (Date.now() - lastTouchToggleAt.current < 500) return
          activate()
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {icon ? <span className="flyout-icon">{icon}</span> : null}
        <div className="h">{eyebrow}</div>
        <span className="v ellip">
          {label} <span className="flyout-caret" style={{ color: 'var(--g500)', fontSize: 9 }}>{open ? '▾' : '▴'}</span>
        </span>
      </button>
      {open ? (
        <div
          id={popoverId}
          role="region"
          aria-label={`${eyebrow}: ${label}`}
          className="ed-panel ed-frame flyout-popover"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            // Inhaltsbreite, mind. so breit wie die Box, gegen Viewport-Ueberlauf gedeckelt.
            // Rechte Boxen verankern rechts, damit sie nicht aus dem Viewport wachsen.
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            minWidth: '100%',
            width: popoverWidth,
            maxWidth: popoverMaxWidth,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            display: 'flex',
            flexDirection: 'column',
            padding: 5,
            zIndex: 20,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
