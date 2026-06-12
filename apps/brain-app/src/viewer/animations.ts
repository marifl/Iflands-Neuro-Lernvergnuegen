/** Didaktische 3D-Animationen zu den Kapitel-11-Abbildungen (exekutive Funktionen). */

export interface AnimationStep {
  /** Slugs der in diesem Schritt hervorgehobenen Strukturen. */
  structures: string[]
  captionDe: string
}

export interface Animation {
  id: string
  title: string
  /** Referenz auf die Lehrbuch-Abbildung (siehe docs/KAPITEL11_ABBILDUNGEN_MAPPING.md). */
  source: string
  steps: AnimationStep[]
}

const BG = (...names: string[]): string[] => names.flatMap((n) => [`left-${n}`, `right-${n}`])

/** Abb. 11-4: Basalganglien-Schleife (DLPFC-Schleife als kanonisches Beispiel). */
export const BASAL_GANGLIA_LOOP: Animation = {
  id: 'basal-ganglia-loop',
  title: 'Basalganglien-Schleife (DLPFC)',
  source: 'Abb. 11-4',
  steps: [
    {
      structures: BG('middle-frontal-gyrus', 'superior-frontal-gyrus'),
      captionDe:
        '1 — Praefrontaler Cortex (DLPFC): Der dorsolaterale Praefrontalcortex startet die Schleife und projiziert exzitatorisch (glutamaterg) ins Striatum.',
    },
    {
      structures: BG('caudate-nucleus', 'putamen'),
      captionDe:
        '2 — Striatum (Nucleus caudatus + Putamen): Eingangsstation der Basalganglien, empfaengt die kortikale Projektion.',
    },
    {
      structures: BG('globus-pallidus'),
      captionDe:
        '3 — Globus pallidus (internus): Ausgangsstation der Basalganglien, hemmt (GABAerg) tonisch den Thalamus.',
    },
    {
      structures: BG('substantia-nigra'),
      captionDe:
        '4 — Substantia nigra: dopaminerge Modulation des Striatums (nigrostriatal) und — pars reticulata — zweiter hemmender Ausgang.',
    },
    {
      structures: BG('ventral-anterior-nucleus').concat(
        'caudal-part-of-left-ventral-lateral-nucleus',
        'caudal-part-of-right-ventral-lateral-nucleus',
      ),
      captionDe:
        '5 — Thalamus (VA/VL): wird durch die Schleife enthemmt (Disinhibition) und aktiviert den Praefrontalcortex zurueck.',
    },
    {
      structures: BG('middle-frontal-gyrus', 'superior-frontal-gyrus'),
      captionDe:
        'Schleife geschlossen: Cortex → Striatum → Pallidum/SN → Thalamus → Cortex. VMPFC- und ACC-Schleife laufen parallel durch eigene Territorien.',
    },
  ],
}

export const ANIMATIONS: Animation[] = [BASAL_GANGLIA_LOOP]
