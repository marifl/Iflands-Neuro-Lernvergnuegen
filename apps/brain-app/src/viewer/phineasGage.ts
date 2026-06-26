import { create } from 'zustand'
import type { SequenceTargetRef } from './sequenceTargetRef'
import { useViewerStore } from './viewerStore'

/**
 * Phineas-Gage-Szene (Kapitel 11, exekutive Funktionen): historisch-anatomische
 * Rekonstruktion des Stangen-Durchschusses von 1848 als didaktischer 3D-Layer.
 *
 * Koordinaten im finalen Viewer-Raum (BodyParts3D/TARO, rezentriert + Y-up):
 *   +X = links, +Y = superior, +Z = anterior. Landmarken aus den Schädel-Meshes
 *   abgeleitet (linkes Jochbein/Oberkiefer = Eintritt Wange, Stirnbein-Scheitel = Austritt).
 *
 * Quelle der Rekonstruktion: Van Horn, J. D., Irimia, A., Torgerson, C. M., Chambers,
 * M. C., Kikinis, R., & Toga, A. W. (2012). Mapping connectivity damage in the case of
 * Phineas Gage. PLoS ONE, 7(5), e37454. Klassische Läsionsanalyse: Damasio, H., Grabowski,
 * T., Frank, R., Galaburda, A. M., & Damasio, A. R. (1994). The return of Phineas Gage.
 * Science, 264(5162), 1102-1105.
 */

export interface CaseStudyStep {
  kick?: string
  title?: string
  body: string
  areas?: string[]
  note?: string
  highlight: string[]
  showSkull?: boolean
  skullOpacity?: number
  showRod?: boolean
  rodPhase?: number
}

export interface CaseStudy {
  id: string
  title: string
  collectionId: string
  steps: CaseStudyStep[]
  lesionStructures?: string[]
  source: string
}

export interface PhineasStep extends CaseStudyStep {
  showSkull: boolean
  skullOpacity: number
  showRod: boolean
  rodPhase: number
}

/** Stangen-Trajektorie (mm, finaler Viewer-Raum): Eintritt linke Wange -> Austritt Scheitel. */
export const ROD_ENTRY: [number, number, number] = [35.719045344841014, -19.013652801513672, 57.98141497183153]
export const ROD_EXIT: [number, number, number] = [-19.312936840134633, 132.98634719848633, 43.63028320842616]
/** Die reale Stange war länger als der Kopf -> über Eintritt/Austritt hinaus verlängern (mm). */
const ROD_OVERSHOOT = 38
/** Tampiereisen lief spitz zu: Spitze vorn, Schaft hinten. Radien in mm. */
export const ROD_RADIUS_TIP = 2.6
export const ROD_RADIUS_SHAFT = 7
/** Historische Maße nach Van Horn et al. 2012 / Bigelow 1850. */
export const HISTORICAL_ROD_LENGTH_MM = 1100
export const HISTORICAL_ROD_SHAFT_DIAMETER_MM = 32
export const HISTORICAL_ROD_TIP_DIAMETER_MM = 6.4
export const HISTORICAL_ROD_WEIGHT_KG = 5.9
export const PHINEAS_GAGE_ASSETS = {
  skullBase: '/assets/phineas/phineas-gage-skull-base.glb',
  skullCalvaria: '/assets/phineas/phineas-gage-skull-calvaria.glb',
  ironRod: '/assets/phineas/phineas-gage-iron-rod.glb',
} as const
export const PHINEAS_GAGE_TARGETS = {
  skullBase: {
    targetKind: 'asset-part',
    collectionId: 'case-phineas-gage',
    instanceId: 'phineas-gage-skull-base-01',
    partId: 'skull-base',
  },
  skullCalvaria: {
    targetKind: 'asset-part',
    collectionId: 'case-phineas-gage',
    instanceId: 'phineas-gage-skull-calvaria-01',
    partId: 'skull-calvaria',
  },
  ironRod: {
    targetKind: 'asset-part',
    collectionId: 'case-phineas-gage',
    instanceId: 'phineas-gage-iron-rod-01',
    partId: 'iron-rod',
  },
} as const satisfies Record<string, SequenceTargetRef>

const ROD_PHASE_ENTRY = 0.28
const ROD_PHASE_THROUGH = 0.68
const ROD_PHASE_EXIT = 1

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function subtract(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function addScaled(a: readonly [number, number, number], b: readonly [number, number, number], scale: number): [number, number, number] {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale]
}

function length(v: readonly [number, number, number]): number {
  return Math.hypot(v[0], v[1], v[2])
}

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const l = length(v)
  if (l === 0) return [0, 1, 0]
  return [v[0] / l, v[1] / l, v[2] / l]
}

export interface RodSegment {
  tail: [number, number, number]
  tip: [number, number, number]
  length: number
}

/** Sichtbarer Stangenabschnitt für die didaktische Penetrationsanimation. */
export function rodSegmentForPhase(phase: number): RodSegment {
  const clamped = clamp01(phase)
  const dir = normalize(subtract(ROD_EXIT, ROD_ENTRY))
  const tail = addScaled(ROD_ENTRY, dir, -ROD_OVERSHOOT)
  const finalTip = addScaled(ROD_EXIT, dir, ROD_OVERSHOOT)
  const path = subtract(finalTip, ROD_ENTRY)
  const tip = addScaled(ROD_ENTRY, path, clamped)
  return { tail, tip, length: length(subtract(tip, tail)) }
}

/** Linker ventromedialer Präfrontalcortex + orbitofrontaler Cortex — die zerstörte Region. */
export const LESION_STRUCTURES: string[] = [
  'left-straight-gyrus',
  'left-medial-orbital-gyrus',
  'left-medial-orbital-gyrus-v2',
  'left-anterior-orbital-gyrus',
  'left-posterior-orbital-gyrus',
  'left-lateral-orbital-gyrus',
  'left-subcallosal-area',
]

const LESION_STRUCTURE_LABELS: Record<string, string> = {
  'left-straight-gyrus': 'Gyrus rectus links',
  'left-medial-orbital-gyrus': 'medialer Orbitofrontalcortex links',
  'left-medial-orbital-gyrus-v2': 'medialer Orbitofrontalcortex links (zweites Parcel)',
  'left-anterior-orbital-gyrus': 'anteriorer Orbitofrontalcortex links',
  'left-posterior-orbital-gyrus': 'posteriorer Orbitofrontalcortex links',
  'left-lateral-orbital-gyrus': 'lateraler Orbitofrontalcortex links',
  'left-subcallosal-area': 'subkallosales Areal links',
}

function lesionStructureLabel(slug: string): string {
  const label = LESION_STRUCTURE_LABELS[slug]
  if (!label) throw new Error(`Phineas-Gage-Laesionslabel fehlt fuer Struktur "${slug}"`)
  return label
}

export const LESION_FOCUS_AREAS_DE = LESION_STRUCTURES.map(lesionStructureLabel)

export interface CaseStudyViewState {
  showSkull: boolean
  skullOpacity: number
  rodVisible: boolean
  rodPhase: number
}

const CASE_STUDY_VIEW_DEFAULTS: CaseStudyViewState = {
  showSkull: false,
  skullOpacity: 0.25,
  rodVisible: false,
  rodPhase: 0,
}

export const useCaseStudyViewStore = create<
  CaseStudyViewState & {
    setSkull: (visible: boolean, opacity?: number) => void
    setRodVisible: (visible: boolean) => void
    setRodPhase: (phase: number) => void
    reset: () => void
  }
>((set) => ({
  ...CASE_STUDY_VIEW_DEFAULTS,
  setSkull: (visible, opacity) =>
    set((s) => ({ showSkull: visible, skullOpacity: opacity ?? s.skullOpacity })),
  setRodVisible: (rodVisible) => set({ rodVisible }),
  setRodPhase: (phase) =>
    set({ rodPhase: Number.isNaN(phase) ? 0 : Math.min(1, Math.max(0, phase)) }),
  reset: () => set(CASE_STUDY_VIEW_DEFAULTS),
}))

export const PHINEAS_GAGE = {
  id: 'phineas-gage',
  title: 'Phineas Gage (1848)',
  collectionId: 'case-phineas-gage',
  source: 'Kap. 11 · Van Horn et al. 2012',
  lesionStructures: LESION_STRUCTURES,
  assetNoteDe: 'Aktueller Viewer: rendert die Standalone-Gage-GLBs aus /assets/phineas (Schädelbasis, Calvaria und generierte Eisenstange); Manifest und Transform-Vertrag pinnen Herkunft, Maße und Lizenzstatus.',
  trajectoryNoteDe: 'Trajektorie nach Van Horn et al. 2012 und Ratiu et al. 2004; die extrahierten Gage-Schädelteile sind per TARO-Fit-Matrix mit der generierten Eisenstange synchronisiert.',
  rodScaleNoteDe: 'Stange historisch ca. 1,1 m lang, 3,2 cm Schaftdurchmesser, ~6 kg; im Viewer wird das generierte Eisenstangen-GLB statt eines gekürzten Zylinder-Markers gerendert.',
  steps: [
    {
      body:
        '1 — 13. September 1848: Beim Sprengen einer Eisenbahntrasse treibt eine Explosion dem Vorarbeiter Phineas Gage eine 1,1 m lange Stopfstange (Tampiereisen, ~6 kg) durch den Kopf. Der Schädel als anatomischer Kontext.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.95,
      showRod: false,
      rodPhase: 0,
    },
    {
      body:
        '2 — Eintritt: Die Stange dringt mit der Spitze voran unter dem linken Jochbogen in die linke Wange ein (Oberkiefer-/Jochbein-Region), schräg nach oben gerichtet.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.4,
      showRod: true,
      rodPhase: ROD_PHASE_ENTRY,
    },
    {
      body:
        '3 — Durchtritt: hinter der linken Augenhöhle vorbei, durch den linken Frontallappen. Der Schädel ist hier transparent, damit der Weg durch das Hirn sichtbar wird.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.18,
      showRod: true,
      rodPhase: ROD_PHASE_THROUGH,
    },
    {
      body:
        '4 — Austritt: nahe der Mittellinie am hinteren Stirnbein (Nähe Sutura coronalis) tritt die Stange oben aus dem Schädeldach aus.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.18,
      showRod: true,
      rodPhase: ROD_PHASE_EXIT,
    },
    {
      body:
        '5 — Läsion: zerstört wurde vor allem der linke ventromediale Präfrontalcortex und der orbitofrontale Cortex. Die markierten Areale liegen links-frontal entlang der rekonstruierten Stangentrajektorie.',
      areas: LESION_FOCUS_AREAS_DE,
      highlight: LESION_STRUCTURES,
      showSkull: true,
      skullOpacity: 0.14,
      showRod: true,
      rodPhase: ROD_PHASE_EXIT,
    },
    {
      body:
        '6 — Bedeutung für Kapitel 11: Gage überlebte, doch Persönlichkeit, Sozialverhalten und Handlungsplanung veränderten sich drastisch ("no longer Gage"). Der Fall wurde zum Schlüsselbeleg für die Rolle des präfrontalen Cortex bei exekutiven Funktionen und sozialer Selbststeuerung.',
      areas: LESION_FOCUS_AREAS_DE,
      highlight: LESION_STRUCTURES,
      showSkull: true,
      skullOpacity: 0.12,
      showRod: true,
      rodPhase: ROD_PHASE_EXIT,
    },
  ] as PhineasStep[],
} satisfies CaseStudy & Record<string, unknown>

// ponytail: Moduswechsel weg von 'explore' deaktiviert die Case Study.
// activeCaseStudyId hinzufuegen wenn Case Study #2 kommt.
useViewerStore.subscribe((state, prev) => {
  if (state.appMode !== prev.appMode && state.appMode !== 'explore') {
    useCaseStudyViewStore.getState().reset()
  }
})
