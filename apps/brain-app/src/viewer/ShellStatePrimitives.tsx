import { useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

type ShellState = 'loading' | 'empty' | 'error' | 'disabled'

const STATE_ROLE: Record<ShellState, 'status' | 'note' | 'alert'> = {
  loading: 'status',
  empty: 'note',
  error: 'alert',
  disabled: 'note',
}

export function ShellStateBlock({
  state,
  title,
  detail,
  children,
}: {
  state: ShellState
  title: string
  detail?: string
  children?: ReactNode
}) {
  return (
    <div role={STATE_ROLE[state]} aria-label={title} className={`shell-state-block shell-state-${state}`}>
      <div className="shell-state-title">{title}</div>
      {detail ? <div className="shell-state-detail">{detail}</div> : null}
      {children}
    </div>
  )
}

type ShellControlButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  active?: boolean
  disabledReason?: string | null
}

export function ShellControlButton({
  active,
  children,
  className,
  disabledReason,
  onClick,
  type = 'button',
  ...props
}: ShellControlButtonProps) {
  const reasonId = useId()
  const disabled = Boolean(disabledReason)
  const ariaDescribedBy = [props['aria-describedby'], disabled ? reasonId : null].filter(Boolean).join(' ') || undefined
  const explicitAriaLabel = props['aria-label']
  const label = typeof children === 'string' ? children : undefined
  const buttonClassName = ['ed-btn', active ? 'active' : null, className].filter(Boolean).join(' ')
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      {...props}
      type={type}
      className={buttonClassName}
      aria-disabled={disabled ? 'true' : undefined}
      aria-describedby={ariaDescribedBy}
      aria-label={explicitAriaLabel ?? (disabled && label ? label : undefined)}
      data-shell-disabled={disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      <span className="shell-control-label">{children}</span>
      {disabled ? (
        <span id={reasonId} className="shell-control-reason">
          {disabledReason}
        </span>
      ) : null}
    </button>
  )
}
