import { useEffect, useRef } from 'react'

interface FlyoutProps {
  eyebrow: string
  label: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  disabled?: boolean
  children: React.ReactNode
}

/** Box-breites Popover, klappt nach oben aus einer Fussleisten-Box auf.
 *  Schliesst bei Escape und Aussenklick. Der Trigger fuellt die Box. */
export default function Flyout({ eyebrow, label, open, onToggle, onClose, disabled, children }: FlyoutProps) {
  const ref = useRef<HTMLDivElement>(null)

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
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
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
        <div className="h">{eyebrow}</div>
        <span className="v ellip">
          {label} <span style={{ color: 'var(--g500)', fontSize: 9 }}>{open ? '▾' : '▴'}</span>
        </span>
      </button>
      {open ? (
        <div
          className="ed-panel ed-frame"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            right: 0,
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
