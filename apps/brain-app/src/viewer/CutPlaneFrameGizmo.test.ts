import { describe, expect, it } from 'vitest'
import {
  configureCutPlaneFrameTabButton,
  cutPlaneFrameTabA11y,
  formatCutPlanePosition,
  updateCutPlaneFrameTabButton,
} from './cutPlaneFrameTab'

describe('CutPlaneFrameGizmo tab UI', () => {
  it('formatiert Schnittpositionen mit explizitem Vorzeichen', () => {
    expect(formatCutPlanePosition(12.2)).toBe('+12 mm')
    expect(formatCutPlanePosition(-8.6)).toBe('−9 mm')
    expect(formatCutPlanePosition(0)).toBe('0 mm')
  })

  it('liefert deutsche A11y-Texte fuer aktive und inaktive Handles', () => {
    expect(cutPlaneFrameTabA11y('coronal', false, 0)).toEqual({
      ariaLabel: 'Koronale Schnittebene, inaktiv',
      title: 'Koronale Schnittebene: über Schnitte aktivieren',
    })

    expect(cutPlaneFrameTabA11y('coronal', true, -18)).toEqual({
      ariaLabel: 'Koronale Schnittebene, aktiv bei −18 mm; klicken zum Deaktivieren, ziehen zum Verschieben',
      title: 'Koronale Schnittebene: klicken zum Deaktivieren, ziehen zum Verschieben',
    })
  })

  it('konfiguriert Handles als 44px-Touchziel mit Theme-CSS-Variablen', () => {
    const button = document.createElement('button')

    configureCutPlaneFrameTabButton(button, 'sagittal')

    expect(button.className).toBe('cut-plane-frame-tab')
    expect(button.dataset.cutAxis).toBe('sagittal')
    expect(button.style.height).toBe('44px')
    expect(button.style.minHeight).toBe('44px')
    expect(button.style.getPropertyValue('--cut-axis-color')).toMatch(/^rgba\(/)
    expect(button.getAttribute('aria-label')).toBe('Sagittale Schnittebene, inaktiv')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent).toBe('Sag')
  })

  it('setzt Aktivzustand, Positionswert und Fokusstatus am Handle-DOM', () => {
    const button = document.createElement('button')
    configureCutPlaneFrameTabButton(button, 'axial')

    updateCutPlaneFrameTabButton(button, {
      axis: 'axial',
      active: true,
      highlighted: true,
      dragging: true,
      direction: 'left',
      positionMm: 21.4,
    })

    expect(button.style.display).toBe('flex')
    expect(button.dataset.cutActive).toBe('true')
    expect(button.dataset.cutHighlighted).toBe('true')
    expect(button.style.cursor).toBe('grabbing')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('aria-label')).toContain('+21 mm')
    expect(button.querySelector('[data-cut-plane-frame-tab-pos="true"]')?.textContent).toBe('+21 mm')

    updateCutPlaneFrameTabButton(button, {
      axis: 'axial',
      active: false,
      highlighted: false,
      dragging: false,
      direction: 'right',
      positionMm: 21.4,
    })

    expect(button.style.display).toBe('none')
    expect(button.dataset.cutActive).toBe('false')
    expect(button.dataset.cutHighlighted).toBe('false')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.querySelector('[data-cut-plane-frame-tab-pos="true"]')?.textContent).toBe('')
  })
})
