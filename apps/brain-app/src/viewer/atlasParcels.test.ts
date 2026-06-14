import { describe, it, expect } from 'vitest'
import { parcelColor, prettyParcel } from './atlasParcels'

describe('prettyParcel', () => {
  it('kapitalisiert DKT-aparc + Lateralitaet', () => {
    expect(prettyParcel('parsopercularis-l')).toBe('Parsopercularis (L)')
    expect(prettyParcel('caudalanteriorcingulate-r')).toBe('Caudalanteriorcingulate (R)')
  })

  it('formatiert Julich als Area · Host', () => {
    expect(prettyParcel('julich3-area-44-ifg-l')).toBe('Area 44 · IFG (L)')
  })
})

describe('parcelColor', () => {
  it('ist stabil und seitengleich (L/R selbes Areal -> selbe Farbe)', () => {
    expect(parcelColor('parsopercularis-l')).toBe(parcelColor('parsopercularis-r'))
    expect(parcelColor('parsopercularis-l')).toBe(parcelColor('parsopercularis-l'))
  })

  it('unterscheidet verschiedene Areale', () => {
    expect(parcelColor('parsopercularis-l')).not.toBe(parcelColor('superiorfrontal-l'))
  })
})
