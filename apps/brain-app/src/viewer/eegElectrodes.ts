import type { Scene } from '../scene/types'

export const EEG_SITES = ['Fpz', 'Fz', 'Cz', 'Pz', 'Oz', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4'] as const
export type EegSite = (typeof EEG_SITES)[number]

export interface EegElectrode {
  site: EegSite
  position: [number, number, number]
  role: string
}

export interface ErpSceneSites {
  primary: EegSite
  support: EegSite[]
}

export const EEG_ELECTRODES: Record<EegSite, EegElectrode> = {
  Fpz: { site: 'Fpz', position: [0, 70, 70], role: 'frontopolarer Mittellinienanker' },
  Fz: { site: 'Fz', position: [0, 82, 48], role: 'frontale Mittellinie' },
  Cz: { site: 'Cz', position: [0, 92, 12], role: 'zentraler Vertex, P3a/P3z-Ableitung' },
  Pz: { site: 'Pz', position: [0, 82, -32], role: 'parietale Mittellinie, P3b-Ableitung' },
  Oz: { site: 'Oz', position: [0, 64, -70], role: 'okzipitaler Mittellinienanker' },
  F3: { site: 'F3', position: [34, 76, 42], role: 'linke frontale Referenz' },
  F4: { site: 'F4', position: [-34, 76, 42], role: 'rechte frontale Referenz' },
  C3: { site: 'C3', position: [42, 84, 12], role: 'linke zentrale Referenz' },
  C4: { site: 'C4', position: [-42, 84, 12], role: 'rechte zentrale Referenz' },
  P3: { site: 'P3', position: [34, 76, -32], role: 'linke parietale Referenz' },
  P4: { site: 'P4', position: [-34, 76, -32], role: 'rechte parietale Referenz' },
}

export const EEG_HEADSET_CONNECTIONS: Array<[EegSite, EegSite]> = [
  ['Fpz', 'Fz'],
  ['Fz', 'Cz'],
  ['Cz', 'Pz'],
  ['Pz', 'Oz'],
  ['F3', 'Fz'],
  ['Fz', 'F4'],
  ['C3', 'Cz'],
  ['Cz', 'C4'],
  ['P3', 'Pz'],
  ['Pz', 'P4'],
  ['F3', 'C3'],
  ['C3', 'P3'],
  ['F4', 'C4'],
  ['C4', 'P4'],
]

export function isEegSite(value: string | undefined): value is EegSite {
  return EEG_SITES.includes(value as EegSite)
}

export function erpSiteForScene(scene: Scene | null | undefined): EegSite | null {
  return erpSitesForScene(scene)?.primary ?? null
}

export function erpSitesForScene(scene: Scene | null | undefined): ErpSceneSites | null {
  if (!scene || scene.overlay.kind !== 'erp') return null
  const data = scene.overlay.data as { site?: string; topography?: { supportSites?: string[] } } | undefined
  if (!isEegSite(data?.site)) return null
  const seen = new Set<EegSite>([data.site])
  const support: EegSite[] = []
  for (const candidate of data.topography?.supportSites ?? []) {
    if (!isEegSite(candidate) || seen.has(candidate)) continue
    seen.add(candidate)
    support.push(candidate)
  }
  return { primary: data.site, support }
}
