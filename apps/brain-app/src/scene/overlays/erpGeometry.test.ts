import { describe, it, expect } from 'vitest'
import { toPolyline } from './erpGeometry'
import { resolveErpTopography } from './erpTopography'

describe('toPolyline', () => {
  it('mappt Punkte in den SVG-Viewport (y invertiert)', () => {
    const pts = toPolyline([[1, 0], [2, 5], [3, -5]], { w: 100, h: 40 })
    // x linear 0..100; y: max(5)->0, min(-5)->40, 0->20
    expect(pts[0]).toEqual([0, 20])
    expect(pts[1]).toEqual([50, 0])
    expect(pts[2]).toEqual([100, 40])
  })
})

describe('resolveErpTopography', () => {
  it('unterscheidet Cz-Komponenten ueber Support-Sites und Quellenziele', () => {
    const p3a = resolveErpTopography({
      component: 'P3a',
      site: 'Cz',
      source: 'ACC',
      sourceTargets: [{ label: 'ACC', role: 'Konflikt' }],
      topography: { supportSites: ['Fz', 'Cz'], region: 'fronto-zentral' },
    }, 'p3a-konfliktmonitoring')
    const p3z = resolveErpTopography({
      component: 'P3z',
      site: 'Cz',
      source: 'SMA / pre-SMA',
      sourceTargets: [{ label: 'SMA / pre-SMA', role: 'Inhibition' }],
      topography: { supportSites: ['Fz', 'C3', 'C4'], region: 'zentral-motorisch' },
    }, 'p3z-inhibition')

    expect(p3a.primarySite).toBe('Cz')
    expect(p3z.primarySite).toBe('Cz')
    expect(p3a.points.map((point) => point.site)).toEqual(['Fz', 'Cz'])
    expect(p3z.points.map((point) => point.site)).toEqual(['Fz', 'C3', 'C4', 'Cz'])
    expect(p3a.sourceTargets[0].label).toBe('ACC')
    expect(p3z.sourceTargets[0].label).toBe('SMA / pre-SMA')
  })

  it('setzt P3b posterior-parietal auf Pz mit Flankenreferenzen', () => {
    const p3b = resolveErpTopography({
      component: 'P3b',
      site: 'Pz',
      source: 'Parietal- und Frontallappen',
      topography: { supportSites: ['P3', 'P4'], region: 'posterior-parietal' },
    }, 'p3b-engagement')

    expect(p3b.primarySite).toBe('Pz')
    expect(p3b.region).toBe('posterior-parietal')
    expect(p3b.points.map((point) => [point.site, point.role])).toEqual([
      ['P3', 'support'],
      ['P4', 'support'],
      ['Pz', 'primary'],
    ])
  })

  it('wirft laut bei unbekannten Topografie-Sites', () => {
    expect(() => resolveErpTopography({
      site: 'Cz',
      source: 'ACC',
      topography: { supportSites: ['Ghost'] },
    }, 'broken')).toThrow('unbekannte supportSite "Ghost"')
  })
})
