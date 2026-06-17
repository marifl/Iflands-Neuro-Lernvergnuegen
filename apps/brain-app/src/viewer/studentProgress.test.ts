import { afterEach, describe, expect, it } from 'vitest'
import {
  STUDENT_PROGRESS_SCHEMA_VERSION,
  createStudentProgressState,
  markStudentStepSeen,
  parseStudentProgressState,
  recordStudentCheck,
  studentCompletionRatio,
  toStudentProgressStateJson,
  useStudentProgressStore,
  type StudentProgressStepSource,
} from './studentProgress'

const sources: StudentProgressStepSource[] = [
  {
    configName: 'wcst-frontoparietal',
    sceneId: 'wcst-frontoparietal',
    title: 'WCST: frontoparietales Kontrollnetzwerk',
    figure: '11-09',
  },
  {
    configName: 'fluency-foci',
    sceneId: 'fluency-foci',
    title: 'Flüssigkeitsaufgaben: fünf Aktivierungsfoki',
    figure: '11-10',
  },
]

describe('student progress contract', () => {
  afterEach(() => {
    useStudentProgressStore.getState().resetStudentProgress()
  })

  it('erstellt einen learning-only Progress-Plan aus Scene-Steps', () => {
    const state = createStudentProgressState('kapitel11-pfad', sources)

    expect(state).toEqual({
      schemaVersion: STUDENT_PROGRESS_SCHEMA_VERSION,
      sequenceKind: 'learning',
      sequenceName: 'kapitel11-pfad',
      currentConfigName: 'wcst-frontoparietal',
      steps: [
        {
          configName: 'wcst-frontoparietal',
          sceneId: 'wcst-frontoparietal',
          title: 'WCST: frontoparietales Kontrollnetzwerk',
          figure: '11-09',
          status: 'not-started',
        },
        {
          configName: 'fluency-foci',
          sceneId: 'fluency-foci',
          title: 'Flüssigkeitsaufgaben: fünf Aktivierungsfoki',
          figure: '11-10',
          status: 'not-started',
        },
      ],
    })
  })

  it('roundtript Progress-State ohne stille Defaults', () => {
    const state = recordStudentCheck(
      markStudentStepSeen(createStudentProgressState('kapitel11-pfad', sources), 'wcst-frontoparietal', '2026-06-16T20:00:00.000Z'),
      'wcst-frontoparietal',
      'wcst-sort-rule',
      'passed',
      '2026-06-16T20:01:00.000Z',
    )

    const json = toStudentProgressStateJson(state)

    expect(parseStudentProgressState(JSON.parse(json))).toEqual(state)
    expect(studentCompletionRatio(state)).toBe(0.5)
    expect(state.steps[0].checks).toEqual([
      {
        checkId: 'wcst-sort-rule',
        result: 'passed',
        attempts: 1,
        updatedAt: '2026-06-16T20:01:00.000Z',
      },
    ])
  })

  it('zaehlt Check-Versuche stabil hoch und ersetzt den letzten Ergebnisstand', () => {
    const initial = createStudentProgressState('kapitel11-pfad', sources)
    const first = recordStudentCheck(initial, 'fluency-foci', 'fluency-dlpfc', 'needs-review', '2026-06-16T20:02:00.000Z')
    const second = recordStudentCheck(first, 'fluency-foci', 'fluency-dlpfc', 'passed', '2026-06-16T20:03:00.000Z')

    expect(second.steps[1].status).toBe('checked')
    expect(second.steps[1].checks).toEqual([
      {
        checkId: 'fluency-dlpfc',
        result: 'passed',
        attempts: 2,
        updatedAt: '2026-06-16T20:03:00.000Z',
      },
    ])
  })

  it('weist kaputte Progress-Daten laut zurueck', () => {
    expect(() => parseStudentProgressState({ schemaVersion: 999 })).toThrow(/schemaVersion/)
    expect(() => createStudentProgressState('kapitel11-pfad', [
      sources[0],
      sources[0],
    ])).toThrow(/doppelte ID/)
    expect(() => parseStudentProgressState({
      schemaVersion: STUDENT_PROGRESS_SCHEMA_VERSION,
      sequenceKind: 'presentation',
      sequenceName: 'kapitel11-vorlesung',
      steps: [],
    })).toThrow(/sequenceKind/)
    expect(() => parseStudentProgressState({
      schemaVersion: STUDENT_PROGRESS_SCHEMA_VERSION,
      sequenceKind: 'learning',
      sequenceName: 'kapitel11-pfad',
      currentConfigName: 'ghost',
      steps: [],
    })).toThrow(/currentConfigName/)
  })

  it('persistiert nur geparsten State im Store', () => {
    const state = createStudentProgressState('kapitel11-pfad', sources)

    useStudentProgressStore.getState().setStudentProgress(state)

    expect(useStudentProgressStore.getState().progress).toEqual(state)

    useStudentProgressStore.getState().setStudentProgress(null)

    expect(useStudentProgressStore.getState().progress).toBeNull()
  })
})
