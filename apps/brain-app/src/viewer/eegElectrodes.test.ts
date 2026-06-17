import { describe, expect, it } from 'vitest'
import type { Scene } from '../scene/types'
import { EEG_ELECTRODES, EEG_HEADSET_CONNECTIONS, EEG_SITES, erpSiteForScene, erpSitesForScene } from './eegElectrodes'

function erpScene(site: string, supportSites: string[] = []): Scene {
  return {
    id: `erp-${site}`,
    section: '11.4',
    author: 'ifland',
    order: 1,
    title: `ERP ${site}`,
    brain: { regions: [], camera: 'medial-midline' },
    overlay: { kind: 'erp', position: 'right', size: 'md', data: { site, topography: { supportSites }, series: [{ label: 'No-go', points: [[0, 0]] }] } },
    companion: { summary: 'x', sources: [] },
  }
}

describe('EEG electrodes', () => {
  it('leitet aktive ERP-Elektroden aus der Szene ab', () => {
    expect(erpSiteForScene(erpScene('Cz'))).toBe('Cz')
    expect(erpSiteForScene(erpScene('Pz'))).toBe('Pz')
    expect(erpSiteForScene(erpScene('Unknown'))).toBeNull()
  })

  it('haelt P3a/P3z zentral und P3b parietal auf der Mittellinie', () => {
    expect(EEG_ELECTRODES.Cz.position[0]).toBe(0)
    expect(EEG_ELECTRODES.Pz.position[0]).toBe(0)
    expect(EEG_ELECTRODES.Cz.position[2]).toBeGreaterThan(EEG_ELECTRODES.Pz.position[2])
  })

  it('liefert primaere und unterstuetzende ERP-Elektroden fuer das Headset', () => {
    expect(erpSitesForScene(erpScene('Cz', ['Fz', 'Cz', 'C3']))).toEqual({
      primary: 'Cz',
      support: ['Fz', 'C3'],
    })
    expect(erpSitesForScene(erpScene('Pz', ['P3', 'P4']))).toEqual({
      primary: 'Pz',
      support: ['P3', 'P4'],
    })
  })

  it('verbindet nur definierte Elektroden', () => {
    const sites = new Set<string>(EEG_SITES)
    for (const [from, to] of EEG_HEADSET_CONNECTIONS) {
      expect(sites.has(from)).toBe(true)
      expect(sites.has(to)).toBe(true)
    }
  })
})
