/** Didaktische Timeline-Animationen zu den Kapitel-11-Abbildungen (exekutive Funktionen). */

import {
  TIMELINE_DOCUMENT_SCHEMA_VERSION,
  parseTimelineDocument,
  type TimelineDocument,
  type TimelineAnimationChannel,
} from './timelineDocument'
import type { SequenceTargetRef } from './sequenceTargetRef'

interface TimelineHighlightStep {
  ontologyNodeIds: string[]
  captionDe: string
}

export const BASAL_GANGLIA_TIMELINE_ID = 'basal-ganglia-loop'
export const BASAL_GANGLIA_CLIP_ID = `clip:${BASAL_GANGLIA_TIMELINE_ID}:highlight`
const DEFAULT_TIMELINE_COLLECTION_ID = 'taro'
const DEFAULT_TIMELINE_STEP_MS = 3800

const BG = (...names: string[]): string[] => names.flatMap((n) => [`left-${n}`, `right-${n}`])

function ontologyTarget(ontologyNodeId: string): SequenceTargetRef {
  return {
    targetKind: 'ontology-node',
    collectionId: DEFAULT_TIMELINE_COLLECTION_ID,
    ontologyNodeId,
  }
}

export function timelineHighlightBindingId(timelineId: string, stepIndex: number, ontologyNodeId: string): string {
  return `${timelineId}:step-${stepIndex + 1}:highlight:${ontologyNodeId}`
}

const BASAL_GANGLIA_STEPS: TimelineHighlightStep[] = [
    {
      ontologyNodeIds: BG('middle-frontal-gyrus', 'superior-frontal-gyrus'),
      captionDe:
        '1 — Praefrontaler Cortex (DLPFC): Der dorsolaterale Praefrontalcortex startet die Schleife und projiziert exzitatorisch (glutamaterg) ins Striatum.',
    },
    {
      ontologyNodeIds: BG('caudate-nucleus', 'putamen'),
      captionDe:
        '2 — Striatum (Nucleus caudatus + Putamen): Eingangsstation der Basalganglien, empfaengt die kortikale Projektion.',
    },
    {
      ontologyNodeIds: BG('globus-pallidus'),
      captionDe:
        '3 — Globus pallidus (internus): Ausgangsstation der Basalganglien, hemmt (GABAerg) tonisch den Thalamus.',
    },
    {
      ontologyNodeIds: BG('substantia-nigra'),
      captionDe:
        '4 — Substantia nigra: dopaminerge Modulation des Striatums (nigrostriatal) und — pars reticulata — zweiter hemmender Ausgang.',
    },
    {
      ontologyNodeIds: BG('ventral-anterior-nucleus').concat(
        'caudal-part-of-left-ventral-lateral-nucleus',
        'caudal-part-of-right-ventral-lateral-nucleus',
      ),
      captionDe:
        '5 — Thalamus (VA/VL): wird durch die Schleife enthemmt (Disinhibition) und aktiviert den Praefrontalcortex zurueck.',
    },
    {
      ontologyNodeIds: BG('middle-frontal-gyrus', 'superior-frontal-gyrus'),
      captionDe:
        'Schleife geschlossen: Cortex → Striatum → Pallidum/SN → Thalamus → Cortex. VMPFC- und ACC-Schleife laufen parallel durch eigene Territorien.',
    },
]

function highlightChannels(step: TimelineHighlightStep, stepIndex: number): TimelineAnimationChannel[] {
  return step.ontologyNodeIds.map((ontologyNodeId) => ({
    bindingId: timelineHighlightBindingId(BASAL_GANGLIA_TIMELINE_ID, stepIndex, ontologyNodeId),
    clipId: BASAL_GANGLIA_CLIP_ID,
    targetRef: ontologyTarget(ontologyNodeId),
    action: 'scrub',
    timeMs: 0,
    loop: false,
  }))
}

/** Abb. 11-4: Basalganglien-Schleife (DLPFC-Schleife als kanonisches Beispiel). */
export const BASAL_GANGLIA_TIMELINE: TimelineDocument = parseTimelineDocument({
  schemaVersion: TIMELINE_DOCUMENT_SCHEMA_VERSION,
  timelineId: BASAL_GANGLIA_TIMELINE_ID,
  title: 'Basalganglien-Schleife (DLPFC)',
  source: 'Abb. 11-4',
  restore: {
    stepId: `${BASAL_GANGLIA_TIMELINE_ID}-step-1`,
    keyframeId: `${BASAL_GANGLIA_TIMELINE_ID}-step-1-highlight`,
  },
  steps: BASAL_GANGLIA_STEPS.map((step, stepIndex) => {
    const stepNumber = stepIndex + 1
    const stepId = `${BASAL_GANGLIA_TIMELINE_ID}-step-${stepNumber}`
    return {
      stepId,
      order: stepIndex,
      durationMs: DEFAULT_TIMELINE_STEP_MS,
      keyframes: [
        {
          keyframeId: `${stepId}-highlight`,
          atMs: 0,
          holdMs: DEFAULT_TIMELINE_STEP_MS,
          channels: {
            overlay: {
              title: 'Basalganglien-Schleife (DLPFC)',
              body: step.captionDe,
            },
            animation: highlightChannels(step, stepIndex),
          },
        },
      ],
    }
  }),
})

export const ANIMATION_TIMELINES: TimelineDocument[] = [BASAL_GANGLIA_TIMELINE]

