import { describe, expect, it } from 'vitest'
import {
  HISTORICAL_ROD_LENGTH_MM,
  HISTORICAL_ROD_SHAFT_DIAMETER_MM,
  HISTORICAL_ROD_TIP_DIAMETER_MM,
  HISTORICAL_ROD_WEIGHT_KG,
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

  it('verweist auf die montierten Standalone-Gage-Assets', () => {
    expect(PHINEAS_GAGE.assetNoteDe).toContain('Standalone-Gage-GLBs')
    expect(PHINEAS_GAGE.assetNoteDe).toContain('/assets/phineas')
    expect(PHINEAS_GAGE_ASSETS).toEqual({
      skull: '/assets/phineas/phineas-gage-skull-lod.glb',
      calvariumCut: '/assets/phineas/phineas-gage-skull-calvarium-cut-lod.glb',
      ironRod: '/assets/phineas/phineas-gage-iron-rod.glb',
    })
    expect(PHINEAS_GAGE_TARGETS.skull).toEqual({
      targetKind: 'asset-part',
      collectionId: 'case-phineas-gage',
      instanceId: 'phineas-gage-skull-01',
      partId: 'skull',
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
