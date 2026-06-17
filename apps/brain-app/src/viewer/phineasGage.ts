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

export interface PhineasStep {
  captionDe: string
  /** Hervorgehobene Hirn-Strukturen (Slugs) in diesem Schritt. */
  highlight: string[]
  showSkull: boolean
  /** Schädel-Deckkraft 0..1 (transparent = Hirn/Stange sichtbar). */
  skullOpacity: number
  showRod: boolean
  /** 0 = Spitze am Eintritt, 1 = Spitze über Austritt; wird weich animiert. */
  rodPhase: number
}

/** Stangen-Trajektorie (mm, finaler Viewer-Raum): Eintritt linke Wange -> Austritt Scheitel. */
export const ROD_ENTRY: [number, number, number] = [40, -55, 75]
export const ROD_EXIT: [number, number, number] = [5, 95, 40]
/** Die reale Stange war länger als der Kopf -> über Eintritt/Austritt hinaus verlängern (mm). */
export const ROD_OVERSHOOT = 38
/** Tampiereisen lief spitz zu: Spitze vorn, Schaft hinten. Radien in mm. */
export const ROD_RADIUS_TIP = 2.6
export const ROD_RADIUS_SHAFT = 7
/** Historische Maße nach Van Horn et al. 2012 / Bigelow 1850. */
export const HISTORICAL_ROD_LENGTH_MM = 1100
export const HISTORICAL_ROD_SHAFT_DIAMETER_MM = 32
export const HISTORICAL_ROD_TIP_DIAMETER_MM = 6.4
export const HISTORICAL_ROD_WEIGHT_KG = 5.9
export const PHINEAS_GAGE_ASSETS = {
  skull: '/assets/phineas/phineas-gage-skull-lod.glb',
  calvariumCut: '/assets/phineas/phineas-gage-skull-calvarium-cut-lod.glb',
  ironRod: '/assets/phineas/phineas-gage-iron-rod.glb',
} as const

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

export const PHINEAS_GAGE = {
  id: 'phineas-gage',
  title: 'Phineas Gage (1848)',
  source: 'Kap. 11 · Van Horn et al. 2012',
  assetNoteDe: 'Aktueller Viewer: rendert die Standalone-Gage-GLBs aus /assets/phineas (Schädel-LOD, Calvarium-Cut und Eisenstange); Lizenz/Attribution bleiben als Kandidat im Manifest markiert.',
  trajectoryNoteDe: 'Trajektorie nach Van Horn et al. 2012; die importierten Gage-Assets bleiben im eigenen Rekonstruktionsraum und ersetzen den früheren TARO-Kontextschädel.',
  rodScaleNoteDe: 'Stange historisch ca. 1,1 m lang, 3,2 cm Schaftdurchmesser, ~6 kg; im Viewer wird das importierte Eisenstangen-GLB statt eines gekürzten Zylinder-Markers gerendert.',
  steps: [
    {
      captionDe:
        '1 — 13. September 1848: Beim Sprengen einer Eisenbahntrasse treibt eine Explosion dem Vorarbeiter Phineas Gage eine 1,1 m lange Stopfstange (Tampiereisen, ~6 kg) durch den Kopf. Der Schädel als anatomischer Kontext.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.95,
      showRod: false,
      rodPhase: 0,
    },
    {
      captionDe:
        '2 — Eintritt: Die Stange dringt mit der Spitze voran unter dem linken Jochbogen in die linke Wange ein (Oberkiefer-/Jochbein-Region), schräg nach oben gerichtet.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.4,
      showRod: true,
      rodPhase: ROD_PHASE_ENTRY,
    },
    {
      captionDe:
        '3 — Durchtritt: hinter der linken Augenhöhle vorbei, durch den linken Frontallappen. Der Schädel ist hier transparent, damit der Weg durch das Hirn sichtbar wird.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.18,
      showRod: true,
      rodPhase: ROD_PHASE_THROUGH,
    },
    {
      captionDe:
        '4 — Austritt: nahe der Mittellinie am hinteren Stirnbein (Nähe Sutura coronalis) tritt die Stange oben aus dem Schädeldach aus.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.18,
      showRod: true,
      rodPhase: ROD_PHASE_EXIT,
    },
    {
      captionDe:
        '5 — Läsion: zerstört wurde vor allem der linke ventromediale Präfrontalcortex und der orbitofrontale Cortex (Gyrus rectus, Gyri orbitales, subkallosales Areal) — hier hervorgehoben.',
      highlight: LESION_STRUCTURES,
      showSkull: false,
      skullOpacity: 0,
      showRod: false,
      rodPhase: ROD_PHASE_EXIT,
    },
    {
      captionDe:
        '6 — Bedeutung für Kapitel 11: Gage überlebte, doch Persönlichkeit, Sozialverhalten und Handlungsplanung veränderten sich drastisch ("no longer Gage"). Der Fall wurde zum Schlüsselbeleg für die Rolle des präfrontalen Cortex bei exekutiven Funktionen und sozialer Selbststeuerung.',
      highlight: LESION_STRUCTURES,
      showSkull: false,
      skullOpacity: 0,
      showRod: false,
      rodPhase: ROD_PHASE_EXIT,
    },
  ] as PhineasStep[],
}
