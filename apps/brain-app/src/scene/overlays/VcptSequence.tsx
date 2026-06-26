import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

export type VcptOutcome = 'hit' | 'correct-reject' | 'commission-error' | 'omission-error'
export type VcptStimulusKind = 'go' | 'nogo' | 'ignore' | 'novelty'

export interface VcptStimulus {
  id: string
  cue: string
  probe: string
  kind: VcptStimulusKind
  expected: string
  outcome: VcptOutcome
}

interface VcptSequenceProps {
  stimuli: VcptStimulus[]
  evidence?: string
}

const STEP_MS = 1500

const OUTCOME_LABELS: Record<VcptOutcome, string> = {
  hit: 'korrekte Go-Reaktion',
  'correct-reject': 'korrekte Hemmung',
  'commission-error': 'Kommissionsfehler',
  'omission-error': 'Auslassungsfehler',
}

const KIND_LABELS: Record<VcptStimulusKind, string> = {
  go: 'Go',
  nogo: 'No-go',
  ignore: 'Kontrolle',
  novelty: 'Novelty',
}

const KIND_COLORS: Record<VcptStimulusKind, string> = {
  go: 'var(--viz-go)',
  nogo: 'var(--viz-nogo)',
  ignore: 'var(--viz-neutral)',
  novelty: 'var(--viz-novelty)',
}

export function vcptStepForPhase(stimuli: readonly VcptStimulus[], phase: number): VcptStimulus {
  if (stimuli.length === 0) throw new Error('VcptSequence: keine Stimuli')
  const normalized = Number.isFinite(phase) ? Math.max(0, Math.min(1, phase)) : 0
  const index = Math.min(stimuli.length - 1, Math.floor(normalized * stimuli.length))
  return stimuli[index]
}

function stepPhase(index: number, count: number): number {
  if (count <= 1) return 0
  return index / (count - 1)
}

function outcomeColor(outcome: VcptOutcome): string {
  return outcome.endsWith('error') ? 'var(--viz-nogo)' : 'var(--viz-go)'
}

function StimulusCard({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div
      className="ed-frame"
      style={{
        flex: 1,
        minWidth: 0,
        aspectRatio: '1 / 0.72',
        display: 'grid',
        placeItems: 'center',
        background: active ? 'var(--orange-wash-soft)' : 'var(--paper-raised)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="mono-xs" style={{ color: 'var(--g500)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: 'var(--ed-display)', fontWeight: 700, fontSize: 'var(--fs-2xl)', color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  )
}

export default function VcptSequence({ stimuli, evidence = 'Schematisch/didaktisch; keine Rohmesswerte' }: VcptSequenceProps) {
  const [playing, setPlaying] = useState(true)
  const [index, setIndex] = useState(0)
  const current = stimuli[index] ?? stimuli[0]
  const phase = useMemo(() => stepPhase(index, stimuli.length), [index, stimuli.length])

  useEffect(() => {
    if (!playing || stimuli.length <= 1) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % stimuli.length), STEP_MS)
    return () => window.clearInterval(timer)
  }, [playing, stimuli.length])

  if (!current) throw new Error('VcptSequence: keine Stimuli')

  const kindColor = KIND_COLORS[current.kind]
  const outcome = OUTCOME_LABELS[current.outcome]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="VCPT-Stimulusfolge">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="ed-tag" style={{ color: kindColor }}>{KIND_LABELS[current.kind]}</span>
        <span style={{ flex: 1 }} />
        <span className="mono-xs" style={{ color: 'var(--g500)' }}>
          Reiz {index + 1}/{stimuli.length}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
        <StimulusCard label="Cue" value={current.cue} />
        <StimulusCard label="Probe" value={current.probe} active />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="ed-frame" style={{ padding: '8px 10px', minWidth: 0 }}>
          <div className="ed-block-label">Regel</div>
          <div style={{ fontFamily: 'var(--ed-display)', fontSize: 'var(--fs-md)', lineHeight: 1.35, color: 'var(--g800)', marginTop: 7 }}>
            {current.expected}
          </div>
        </div>
        <div className="ed-frame" style={{ padding: '8px 10px', minWidth: 0, borderColor: outcomeColor(current.outcome) }}>
          <div className="ed-block-label">Antwort</div>
          <div style={{ fontFamily: 'var(--ed-display)', fontSize: 'var(--fs-md)', lineHeight: 1.35, color: outcomeColor(current.outcome), marginTop: 7 }}>
            {outcome}
          </div>
        </div>
      </div>

      <div style={{ height: 7, border: '1px solid var(--line-soft)', position: 'relative', background: 'var(--field-bg)' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${Math.max(3, phase * 100)}%`, background: 'var(--orange)' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="ed-tag">Fehler</span>
        <span className="mono-xs" style={{ color: 'var(--viz-nogo)' }}>Kommissionsfehler: No-go gedrückt</span>
        <span className="mono-xs" style={{ color: 'var(--viz-nogo)' }}>Auslassungsfehler: Go verpasst</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <button
          type="button"
          className={playing ? 'ed-btn active' : 'ed-btn'}
          aria-label={playing ? 'VCPT-Animation pausieren' : 'VCPT-Animation abspielen'}
          title={playing ? 'VCPT-Animation pausieren' : 'VCPT-Animation abspielen'}
          onClick={() => setPlaying((value) => !value)}
          style={{ width: 34, height: 28, padding: 0, display: 'grid', placeItems: 'center' }}
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="ed-btn"
          aria-label="VCPT-Animation zurücksetzen"
          title="VCPT-Animation zurücksetzen"
          onClick={() => {
            setIndex(0)
            setPlaying(false)
          }}
          style={{ width: 34, height: 28, padding: 0, display: 'grid', placeItems: 'center' }}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        <input
          aria-label="VCPT-Stimulus wählen"
          type="range"
          min={0}
          max={stimuli.length - 1}
          step={1}
          value={index}
          onChange={(event) => {
            setPlaying(false)
            setIndex(Number(event.currentTarget.value))
          }}
          style={{ minWidth: 0, flex: 1 }}
        />
      </div>

      <div className="mono-xs" style={{ color: 'var(--g500)', lineHeight: 1.45 }}>
        {evidence}
      </div>
    </div>
  )
}
