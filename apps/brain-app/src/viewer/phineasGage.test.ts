import { describe, expect, it } from 'vitest'
import {
  LESION_STRUCTURES,
  PHINEAS_GAGE,
  ROD_ENTRY,
  ROD_EXIT,
  ROD_RADIUS_SHAFT,
  ROD_RADIUS_TIP,
  rodSegmentForPhase,
} from './phineasGage'

describe('Phineas-Gage-Szene', () => {
  it('modelliert die Penetration als monotone Eintritt-Durchtritt-Austritt-Sequenz', () => {
    const phases = PHINEAS_GAGE.steps.filter((step) => step.showRod).map((step) => step.rodPhase)

    expect(phases).toHaveLength(3)
    expect(phases[0]).toBeGreaterThan(0)
    expect(phases[0]).toBeLessThan(phases[1])
    expect(phases[1]).toBeLessThan(phases[2])
    expect(phases[2]).toBe(1)
  })

  it('legt die Stangenspitze vom linken Gesichtsbereich zum superioren Austritt', () => {
    const entry = rodSegmentForPhase(0)
    const final = rodSegmentForPhase(1)

    expect(entry.tip).toEqual(ROD_ENTRY)
    expect(final.tip[1]).toBeGreaterThan(ROD_EXIT[1])
    expect(final.tip[2]).toBeLessThan(ROD_ENTRY[2])
    expect(final.length).toBeGreaterThan(entry.length)
    expect(ROD_RADIUS_TIP).toBeLessThan(ROD_RADIUS_SHAFT)
  })

  it('markiert nur linke orbitofrontale/vmPFC-nahe Laesionsstrukturen', () => {
    expect(LESION_STRUCTURES.length).toBeGreaterThan(4)
    for (const slug of LESION_STRUCTURES) {
      expect(slug.startsWith('left-')).toBe(true)
      expect(slug).toMatch(/orbital|straight|subcallosal/)
    }
  })

  it('macht die Modellannahme explizit statt ein Originalmodell zu behaupten', () => {
    expect(PHINEAS_GAGE.assetNoteDe).toContain('kein Original-Gage-CT/GLB')
    expect(PHINEAS_GAGE.trajectoryNoteDe).toContain('Van Horn')
  })
})
