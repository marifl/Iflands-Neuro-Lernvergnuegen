/**
 * Phineas-Gage-Szene (Kapitel 11, exekutive Funktionen): historisch-anatomische
 * Rekonstruktion des Stangen-Durchschusses von 1848 als didaktischer 3D-Layer.
 *
 * Koordinaten im finalen Viewer-Raum (BodyParts3D/TARO, rezentriert + Y-up):
 *   +X = links, +Y = superior, +Z = anterior. Landmarken aus den Schaedel-Meshes
 *   abgeleitet (linkes Jochbein/Oberkiefer = Eintritt Wange, Stirnbein-Scheitel = Austritt).
 *
 * Quelle der Rekonstruktion: Van Horn, J. D., Irimia, A., Torgerson, C. M., Chambers,
 * M. C., Kikinis, R., & Toga, A. W. (2012). Mapping connectivity damage in the case of
 * Phineas Gage. PLoS ONE, 7(5), e37454. Klassische Laesionsanalyse: Damasio, H., Grabowski,
 * T., Frank, R., Galaburda, A. M., & Damasio, A. R. (1994). The return of Phineas Gage.
 * Science, 264(5162), 1102-1105.
 */

export interface PhineasStep {
  captionDe: string
  /** Hervorgehobene Hirn-Strukturen (Slugs) in diesem Schritt. */
  highlight: string[]
  showSkull: boolean
  /** Schaedel-Deckkraft 0..1 (transparent = Hirn/Stange sichtbar). */
  skullOpacity: number
  showRod: boolean
}

/** Stangen-Trajektorie (mm, finaler Viewer-Raum): Eintritt linke Wange -> Austritt Scheitel. */
export const ROD_ENTRY: [number, number, number] = [40, -55, 75]
export const ROD_EXIT: [number, number, number] = [5, 95, 40]
/** Die reale Stange war laenger als der Kopf -> ueber Eintritt/Austritt hinaus verlaengern (mm). */
export const ROD_OVERSHOOT = 38
/** Tampiereisen lief spitz zu (Eintritts-Ende duenn, hinteres Ende dick). Radien in mm. */
export const ROD_RADIUS_ENTRY = 2.6
export const ROD_RADIUS_EXIT = 7

/** Linker ventromedialer Praefrontalcortex + orbitofrontaler Cortex — die zerstoerte Region. */
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
  steps: [
    {
      captionDe:
        '1 — 13. September 1848: Beim Sprengen einer Eisenbahntrasse treibt eine Explosion dem Vorarbeiter Phineas Gage eine 1,1 m lange Stopfstange (Tampiereisen, ~6 kg) durch den Kopf. Der Schaedel als anatomischer Kontext.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.95,
      showRod: false,
    },
    {
      captionDe:
        '2 — Eintritt: Die Stange dringt mit der Spitze voran unter dem linken Jochbogen in die linke Wange ein (Oberkiefer-/Jochbein-Region), schraeg nach oben gerichtet.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.4,
      showRod: true,
    },
    {
      captionDe:
        '3 — Durchtritt: hinter der linken Augenhoehle vorbei, durch den linken Frontallappen. Der Schaedel ist hier transparent, damit der Weg durch das Hirn sichtbar wird.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.18,
      showRod: true,
    },
    {
      captionDe:
        '4 — Austritt: nahe der Mittellinie am hinteren Stirnbein (Naehe Sutura coronalis) tritt die Stange oben aus dem Schaedeldach aus.',
      highlight: [],
      showSkull: true,
      skullOpacity: 0.18,
      showRod: true,
    },
    {
      captionDe:
        '5 — Laesion: zerstoert wurde vor allem der linke ventromediale Praefrontalcortex und der orbitofrontale Cortex (Gyrus rectus, Gyri orbitales, subkallosales Areal) — hier hervorgehoben.',
      highlight: LESION_STRUCTURES,
      showSkull: false,
      skullOpacity: 0,
      showRod: false,
    },
    {
      captionDe:
        '6 — Bedeutung fuer Kapitel 11: Gage ueberlebte, doch Persoenlichkeit, Sozialverhalten und Handlungsplanung veraenderten sich drastisch ("no longer Gage"). Der Fall wurde zum Schluesselbeleg fuer die Rolle des praefrontalen Cortex bei exekutiven Funktionen und sozialer Selbststeuerung.',
      highlight: LESION_STRUCTURES,
      showSkull: false,
      skullOpacity: 0,
      showRod: false,
    },
  ] as PhineasStep[],
}
