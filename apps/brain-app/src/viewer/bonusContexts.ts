import type { EegSite } from './eegElectrodes'
import type { OntologyNode } from './ontology'
import { LESION_STRUCTURES } from './phineasGage'

export const BONUS_CONTEXTS_SCHEMA_VERSION = 1

export type BonusContextKind = 'case-study' | 'eeg-erp' | 'animation-hint' | 'snapshot-preset'

export type BonusContextTarget =
  | { kind: 'ontology-node'; id: string }
  | { kind: 'atlas-role'; id: string }
  | { kind: 'scene'; id: string }
  | { kind: 'eeg-site'; id: EegSite }
  | { kind: 'device-target'; collectionId: string; slotId: string; partId?: string }

export interface BonusContextAnimationHints {
  highlightSlugs?: string[]
  eegSites?: EegSite[]
  sceneId?: string
  configName?: string
}

export interface BonusContext {
  id: string
  kind: BonusContextKind
  /** Registry-Collections, zu denen dieser Record gehoert. */
  collectionIds: string[]
  title: string
  summaryDe: string
  targets: BonusContextTarget[]
  sourceRefs: string[]
  animationHints?: BonusContextAnimationHints
}

const phineasTargets: BonusContextTarget[] = [
  ...LESION_STRUCTURES.map((id): BonusContextTarget => ({ kind: 'ontology-node', id })),
  { kind: 'atlas-role', id: 'OFC' },
  { kind: 'atlas-role', id: 'VMPFC' },
]

export const BONUS_CONTEXTS: BonusContext[] = [
  {
    id: 'phineas-gage',
    kind: 'case-study',
    collectionIds: ['case-phineas-gage'],
    title: 'Phineas Gage (VMPFC/OFC)',
    summaryDe:
      'Fallstudie zur Rolle von orbitofrontalem und ventromedialem Präfrontalcortex für Handlungsplanung, Sozialverhalten und exekutive Kontrolle.',
    targets: phineasTargets,
    sourceRefs: [
      'apps/brain-app/src/viewer/phineasGage.ts',
      'Kapitel 11 · exekutive Funktionen',
      'Van Horn et al. 2012',
    ],
    animationHints: {
      highlightSlugs: LESION_STRUCTURES,
    },
  },
  {
    id: 'eeg-erp-vcpt',
    kind: 'eeg-erp',
    collectionIds: ['device-eeg-10-20'],
    title: 'VCPT: EEG/ERP-Aufgabe',
    summaryDe:
      'Bonus-Kontext für VCPT als Aufmerksamkeitstest mit EEG-/ERP-Auswertung und späteren Animationszuständen.',
    targets: [
      { kind: 'scene', id: 'vcpt' },
      { kind: 'eeg-site', id: 'Fz' },
      { kind: 'eeg-site', id: 'Cz' },
      { kind: 'eeg-site', id: 'Pz' },
      { kind: 'device-target', collectionId: 'device-eeg-10-20', slotId: 'eeg-device-model' },
    ],
    sourceRefs: [
      'apps/brain-app/public/scenes/vcpt.json',
      'raw/pptx/slides-text.md',
      'Kapitel 11 · VCPT / ERP',
    ],
    animationHints: {
      sceneId: 'vcpt',
      configName: 'vcpt',
      eegSites: ['Fz', 'Cz', 'Pz'],
    },
  },
  {
    id: 'eeg-erp-p3a-novelty',
    kind: 'eeg-erp',
    collectionIds: ['device-eeg-10-20'],
    title: 'P3a: fronto-zentrale Orientierungsantwort',
    summaryDe:
      'Kuratierter P3a-Kontext für fronto-zentrale Novelty-/Orientierungsantworten, getrennt vom allgemeineren Konfliktmonitoring-Pfad.',
    targets: [
      { kind: 'scene', id: 'p3a-konfliktmonitoring' },
      { kind: 'atlas-role', id: 'ACC' },
      { kind: 'eeg-site', id: 'Fz' },
      { kind: 'eeg-site', id: 'Cz' },
      { kind: 'device-target', collectionId: 'device-eeg-10-20', slotId: 'eeg-device-model' },
    ],
    sourceRefs: [
      'apps/brain-app/public/scenes/p3a-konfliktmonitoring.json',
      'apps/brain-app/src/viewer/eegElectrodes.ts',
      'Kapitel 11 · P3a / fronto-zentrale Orientierungsantwort',
    ],
    animationHints: {
      sceneId: 'p3a-konfliktmonitoring',
      configName: 'p3a-konfliktmonitoring',
      eegSites: ['Fz', 'Cz'],
    },
  },
  {
    id: 'eeg-erp-p3a-konfliktmonitoring',
    kind: 'eeg-erp',
    collectionIds: ['device-eeg-10-20'],
    title: 'Konfliktmonitoring: ACC und No-go-P3a',
    summaryDe:
      'ERP-Kontext für fronto-zentrale P3a-Aktivität im Konfliktmonitoring mit ACC-Bezug.',
    targets: [
      { kind: 'scene', id: 'p3a-konfliktmonitoring' },
      { kind: 'atlas-role', id: 'ACC' },
      { kind: 'ontology-node', id: 'left-anterior-cingulate-gyrus' },
      { kind: 'eeg-site', id: 'Cz' },
      { kind: 'device-target', collectionId: 'device-eeg-10-20', slotId: 'eeg-device-model' },
    ],
    sourceRefs: [
      'apps/brain-app/public/scenes/p3a-konfliktmonitoring.json',
      'apps/brain-app/src/viewer/eegElectrodes.ts',
      'Kapitel 11 · cinguläres Kontrollsystem',
    ],
    animationHints: {
      sceneId: 'p3a-konfliktmonitoring',
      configName: 'p3a-konfliktmonitoring',
      eegSites: ['Cz'],
    },
  },
]

const contextsById = new Map(BONUS_CONTEXTS.map((context) => [context.id, context]))

export function resolveBonusContextIds(ids: readonly string[]): BonusContext[] {
  const out: BonusContext[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) continue
    const context = contextsById.get(id)
    if (!context) continue
    seen.add(id)
    out.push(context)
  }
  return out
}

export function bonusContextsForTarget(target: BonusContextTarget): BonusContext[] {
  return BONUS_CONTEXTS.filter((context) =>
    context.targets.some((candidate) => sameBonusContextTarget(candidate, target)),
  )
}

function sameBonusContextTarget(a: BonusContextTarget, b: BonusContextTarget): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'ontology-node':
      return b.kind === 'ontology-node' && a.id === b.id
    case 'atlas-role':
      return b.kind === 'atlas-role' && a.id === b.id
    case 'scene':
      return b.kind === 'scene' && a.id === b.id
    case 'eeg-site':
      return b.kind === 'eeg-site' && a.id === b.id
    case 'device-target':
      return b.kind === 'device-target'
        && a.collectionId === b.collectionId
        && a.slotId === b.slotId
        && a.partId === b.partId
  }
}

export function bonusContextIdsForNode(node: OntologyNode): string[] {
  const ids = new Set<string>()
  for (const context of bonusContextsForTarget({ kind: 'ontology-node', id: node.id })) ids.add(context.id)
  const role = node.k11Role?.toLowerCase()
  if (role) {
    for (const context of BONUS_CONTEXTS) {
      for (const target of context.targets) {
        if (target.kind === 'atlas-role' && role.includes(target.id.toLowerCase())) ids.add(context.id)
      }
    }
  }
  return [...ids]
}
