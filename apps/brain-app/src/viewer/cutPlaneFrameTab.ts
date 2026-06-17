import { CUT_AXIS_COLORS } from './atlasColorSystem'
import type { CutAxis } from './cutCapsMerged'

export const CUT_FRAME_TAB_WIDTH_PX = 108
export const CUT_FRAME_TAB_HEIGHT_PX = 44

const CUT_FRAME_TAB_CHEVRON_NOTCH = 14
const CUT_FRAME_TAB_TRANSITION = 'clip-path 140ms ease-out, padding 140ms ease-out, opacity 140ms ease-out, box-shadow 140ms ease-out'

export type CutFrameTabDirection = 'left' | 'right' | 'up' | 'down'

type TabButtonUpdate = {
  axis: CutAxis
  active: boolean
  highlighted: boolean
  dragging: boolean
  direction: CutFrameTabDirection
  positionMm: number
}

const AXIS_TEXT: Record<CutAxis, { short: string; long: string }> = {
  sagittal: { short: 'Sag', long: 'Sagittale Schnittebene' },
  coronal: { short: 'Kor', long: 'Koronale Schnittebene' },
  axial: { short: 'Axi', long: 'Axiale Schnittebene' },
}

export function formatCutPlanePosition(positionMm: number): string {
  const pos = Math.round(positionMm)
  if (pos > 0) return `+${pos} mm`
  if (pos < 0) return `−${Math.abs(pos)} mm`
  return '0 mm'
}

export function cutPlaneFrameTabA11y(axis: CutAxis, active: boolean, positionMm: number): { ariaLabel: string; title: string } {
  const { long } = AXIS_TEXT[axis]
  if (!active) {
    return {
      ariaLabel: `${long}, inaktiv`,
      title: `${long}: über Schnitte aktivieren`,
    }
  }
  return {
    ariaLabel: `${long}, aktiv bei ${formatCutPlanePosition(positionMm)}; klicken zum Deaktivieren, ziehen zum Verschieben`,
    title: `${long}: klicken zum Deaktivieren, ziehen zum Verschieben`,
  }
}

export function configureCutPlaneFrameTabButton(button: HTMLButtonElement, axis: CutAxis): void {
  button.type = 'button'
  button.className = 'cut-plane-frame-tab'
  button.dataset.cutAxis = axis
  button.style.position = 'absolute'
  button.style.width = `${CUT_FRAME_TAB_WIDTH_PX}px`
  button.style.height = `${CUT_FRAME_TAB_HEIGHT_PX}px`
  button.style.minHeight = '44px'
  button.style.boxSizing = 'border-box'
  button.style.display = 'none'
  button.style.alignItems = 'center'
  button.style.justifyContent = 'center'
  button.style.gap = '8px'
  button.style.pointerEvents = 'auto'
  button.style.cursor = 'grab'
  button.style.transform = 'translate3d(0, 0, 0)'
  button.style.transition = CUT_FRAME_TAB_TRANSITION
  button.style.setProperty('--cut-axis-color', cssColor(CUT_AXIS_COLORS[axis], 0.92))
  button.style.setProperty('--cut-axis-color-soft', cssColor(CUT_AXIS_COLORS[axis], 0.48))
  button.style.setProperty('--cut-axis-color-wash', cssColor(CUT_AXIS_COLORS[axis], 0.18))
  button.style.setProperty('--shell-cut-axis-color', cssColor(CUT_AXIS_COLORS[axis], 0.92))
  button.style.setProperty('--shell-cut-axis-color-soft', cssColor(CUT_AXIS_COLORS[axis], 0.48))
  button.style.setProperty('--shell-cut-axis-color-wash', cssColor(CUT_AXIS_COLORS[axis], 0.18))

  const label = document.createElement('span')
  label.dataset.cutPlaneFrameTabLabel = 'true'
  label.textContent = AXIS_TEXT[axis].short
  label.style.display = 'inline-block'
  label.style.flex = '0 0 auto'

  const pos = document.createElement('span')
  pos.dataset.cutPlaneFrameTabPos = 'true'
  pos.textContent = ''
  pos.style.display = 'none'
  pos.style.flex = '0 0 auto'
  pos.style.minWidth = '38px'
  pos.style.textAlign = 'right'
  pos.style.font = '500 11px/1 var(--ed-mono, ui-monospace, SFMono-Regular, Menlo, monospace)'
  pos.style.opacity = '0.9'
  pos.style.letterSpacing = '0'

  button.append(label, pos)
  updateCutPlaneFrameTabButton(button, {
    axis,
    active: false,
    highlighted: false,
    dragging: false,
    direction: 'right',
    positionMm: 0,
  })
}

export function updateCutPlaneFrameTabButton(button: HTMLButtonElement, update: TabButtonUpdate): void {
  const { axis, active, highlighted, dragging, direction, positionMm } = update
  const posSpan = button.querySelector<HTMLElement>('[data-cut-plane-frame-tab-pos="true"]')
  const a11y = cutPlaneFrameTabA11y(axis, active, positionMm)

  button.dataset.cutActive = active ? 'true' : 'false'
  button.dataset.cutHighlighted = highlighted ? 'true' : 'false'
  button.setAttribute('aria-label', a11y.ariaLabel)
  button.setAttribute('aria-pressed', active ? 'true' : 'false')
  button.title = a11y.title
  button.style.display = active ? 'flex' : 'none'
  button.style.clipPath = cutFrameTabClipPath(direction)
  button.style.padding = cutFrameTabPadding(direction)
  button.style.opacity = active ? '1' : '0.88'
  button.style.cursor = dragging ? 'grabbing' : 'grab'

  if (!posSpan) return
  if (active) {
    posSpan.textContent = formatCutPlanePosition(positionMm)
    posSpan.style.display = 'inline-block'
  } else {
    posSpan.textContent = ''
    posSpan.style.display = 'none'
  }
}

function cutFrameTabClipPath(direction: CutFrameTabDirection): string {
  const notchPct = (CUT_FRAME_TAB_CHEVRON_NOTCH / CUT_FRAME_TAB_WIDTH_PX) * 100
  const notchPctV = (CUT_FRAME_TAB_CHEVRON_NOTCH / CUT_FRAME_TAB_HEIGHT_PX) * 100
  if (direction === 'right') {
    return `polygon(0% 0%, ${100 - notchPct}% 0%, 100% 50%, ${100 - notchPct}% 100%, 0% 100%, ${notchPct}% 50%)`
  }
  if (direction === 'left') {
    return `polygon(${notchPct}% 0%, 100% 0%, ${100 - notchPct}% 50%, 100% 100%, ${notchPct}% 100%, 0% 50%)`
  }
  if (direction === 'down') {
    return `polygon(0% 0%, 100% 0%, 100% ${100 - notchPctV}%, 50% 100%, 0% ${100 - notchPctV}%)`
  }
  return `polygon(50% 0%, 100% ${notchPctV}%, 100% 100%, 0% 100%, 0% ${notchPctV}%)`
}

function cutFrameTabPadding(direction: CutFrameTabDirection): string {
  const lead = CUT_FRAME_TAB_CHEVRON_NOTCH + 4
  const trail = 12
  if (direction === 'right') return `0 ${lead}px 0 ${trail}px`
  if (direction === 'left') return `0 ${trail}px 0 ${lead}px`
  return `4px 12px`
}

function cssColor(hex: number, alpha: number): string {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  return `rgba(${r},${g},${b},${alpha})`
}
