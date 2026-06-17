import { EEG_ELECTRODES, isEegSite, type EegSite } from '../../viewer/eegElectrodes'

export interface ErpSourceTarget {
  label: string
  role?: string
}

export interface ErpTopographyData {
  component?: string
  site?: string
  source?: string
  sourceTargets?: ErpSourceTarget[]
  topography?: {
    region?: string
    supportSites?: string[]
    evidence?: string
  }
}

export interface ErpTopographyPoint {
  site: EegSite
  role: 'primary' | 'support' | 'reference'
  x: number
  y: number
}

export interface ResolvedErpTopography {
  component: string
  primarySite: EegSite
  region: string
  evidence: string
  points: ErpTopographyPoint[]
  sourceTargets: ErpSourceTarget[]
}

const SITE_POSITIONS: Record<EegSite, { x: number; y: number }> = {
  Fpz: { x: 36, y: 10 },
  Fz: { x: 36, y: 22 },
  Cz: { x: 36, y: 36 },
  Pz: { x: 36, y: 50 },
  Oz: { x: 36, y: 62 },
  F3: { x: 23, y: 25 },
  F4: { x: 49, y: 25 },
  C3: { x: 21, y: 36 },
  C4: { x: 51, y: 36 },
  P3: { x: 24, y: 49 },
  P4: { x: 48, y: 49 },
}

function sitePosition(site: EegSite): { x: number; y: number } {
  return SITE_POSITIONS[site]
}

function uniqueSupportSites(site: EegSite, supportSites: string[] | undefined, sceneId: string): EegSite[] {
  const out: EegSite[] = []
  const seen = new Set<EegSite>([site])
  for (const candidate of supportSites ?? []) {
    if (!isEegSite(candidate)) {
      throw new Error(`ErpChart: scene ${sceneId} hat unbekannte supportSite "${candidate}"`)
    }
    if (seen.has(candidate)) continue
    seen.add(candidate)
    out.push(candidate)
  }
  return out
}

export function resolveErpTopography(data: ErpTopographyData, sceneId: string): ResolvedErpTopography {
  if (!isEegSite(data.site)) {
    throw new Error(`ErpChart: scene ${sceneId} braucht eine bekannte overlay.data.site`)
  }
  const supportSites = uniqueSupportSites(data.site, data.topography?.supportSites, sceneId)
  const points: ErpTopographyPoint[] = [
    ...supportSites.map((site) => ({ site, role: 'support' as const, ...sitePosition(site) })),
    { site: data.site, role: 'primary', ...sitePosition(data.site) },
  ]
  const sourceTargets = data.sourceTargets?.length
    ? data.sourceTargets
    : data.source
      ? [{ label: data.source, role: 'Quelle' }]
      : []
  if (sourceTargets.length === 0) throw new Error(`ErpChart: scene ${sceneId} braucht overlay.data.source oder sourceTargets`)

  return {
    component: data.component ?? sceneId,
    primarySite: data.site,
    region: data.topography?.region ?? EEG_ELECTRODES[data.site].role,
    evidence: data.topography?.evidence ?? 'Schematisch/didaktisch, keine Rohmesswerte',
    points,
    sourceTargets,
  }
}
