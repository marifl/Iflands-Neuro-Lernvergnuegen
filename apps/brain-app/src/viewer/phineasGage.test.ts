import { describe, expect, it } from 'vitest'
import {
  HISTORICAL_ROD_LENGTH_MM,
  HISTORICAL_ROD_SHAFT_DIAMETER_MM,
  HISTORICAL_ROD_TIP_DIAMETER_MM,
  HISTORICAL_ROD_WEIGHT_KG,
  LESION_FOCUS_AREAS_DE,
  LESION_STRUCTURES,
  PHINEAS_GAGE,
  PHINEAS_GAGE_ASSETS,
  PHINEAS_GAGE_TARGETS,
  ROD_ENTRY,
  ROD_EXIT,
  ROD_RADIUS_SHAFT,
  ROD_RADIUS_TIP,
  rodSegmentForPhase,
} from './phineasGage'

describe('Phineas-Gage-Szene', () => {
  it('modelliert die Penetration als monotone Eintritt-Durchtritt-Austritt-Sequenz', () => {
    const phases = PHINEAS_GAGE.steps
      .filter((step) => step.showRod && step.highlight.length === 0)
      .map((step) => step.rodPhase)

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
    expect(ROD_ENTRY[0]).toBeGreaterThan(ROD_EXIT[0])
    expect(final.tip[1]).toBeGreaterThan(ROD_EXIT[1])
    expect(final.tip[2]).toBeLessThan(ROD_ENTRY[2])
    expect(final.length).toBeGreaterThan(entry.length)
    expect(ROD_RADIUS_TIP).toBeLessThan(ROD_RADIUS_SHAFT)
  })

  it('markiert nur linke orbitofrontale/VMPFC-nahe Laesionsstrukturen', () => {
    expect(LESION_STRUCTURES.length).toBeGreaterThan(4)
    for (const slug of LESION_STRUCTURES) {
      expect(slug.startsWith('left-')).toBe(true)
      expect(slug).toMatch(/orbital|straight|subcallosal/)
    }
    for (const label of LESION_FOCUS_AREAS_DE) expect(label).toMatch(/\S/)
  })

  it('zeigt Laesionsschritte mit Stangen- und Schaedelkontekst statt isolierter Marker', () => {
    const lesionSteps = PHINEAS_GAGE.steps.filter((step) => step.highlight.includes('left-straight-gyrus'))

    expect(LESION_FOCUS_AREAS_DE).toHaveLength(LESION_STRUCTURES.length)
    expect(LESION_FOCUS_AREAS_DE).toContain('Gyrus rectus links')
    expect(lesionSteps).toHaveLength(2)
    for (const step of lesionSteps) {
      expect(step.showSkull).toBe(true)
      expect(step.skullOpacity).toBeGreaterThan(0)
      expect(step.skullOpacity).toBeLessThan(0.2)
      expect(step.showRod).toBe(true)
      expect(step.rodPhase).toBe(1)
      expect(step.areas).toEqual(LESION_FOCUS_AREAS_DE)
    }
  })

  it('verweist auf die montierten Standalone-Gage-Assets', () => {
    expect(PHINEAS_GAGE.assetNoteDe).toContain('Standalone-Gage-GLBs')
    expect(PHINEAS_GAGE.assetNoteDe).toContain('/assets/phineas')
    expect(PHINEAS_GAGE_ASSETS).toEqual({
      skullBase: '/assets/phineas/phineas-gage-skull-base.glb',
      skullCalvaria: '/assets/phineas/phineas-gage-skull-calvaria.glb',
      ironRod: '/assets/phineas/phineas-gage-iron-rod.glb',
    })
    expect(PHINEAS_GAGE_TARGETS.skullBase).toEqual({
      targetKind: 'asset-part',
      collectionId: 'case-phineas-gage',
      instanceId: 'phineas-gage-skull-base-01',
      partId: 'skull-base',
    })
    expect(PHINEAS_GAGE.trajectoryNoteDe).toContain('Van Horn')
  })

  it('trennt didaktische Rod-Phase vom generierten Runtime-Modell', () => {
    const final = rodSegmentForPhase(1)

    expect(HISTORICAL_ROD_LENGTH_MM).toBe(1100)
    expect(HISTORICAL_ROD_SHAFT_DIAMETER_MM).toBe(32)
    expect(HISTORICAL_ROD_TIP_DIAMETER_MM).toBeCloseTo(6.4)
    expect(HISTORICAL_ROD_WEIGHT_KG).toBeCloseTo(5.9)
    expect(final.length).toBeLessThan(HISTORICAL_ROD_LENGTH_MM / 3)
    expect(ROD_RADIUS_SHAFT * 2).toBeLessThan(HISTORICAL_ROD_SHAFT_DIAMETER_MM)
    expect(PHINEAS_GAGE.assetNoteDe).toContain('Transform-Vertrag')
    expect(PHINEAS_GAGE.rodScaleNoteDe).toContain('generierte Eisenstangen-GLB')
  })
})
