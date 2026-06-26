import { useEffect, useState } from 'react'
import { BASAL_GANGLIA_TIMELINE } from './animations'
import { ontologyNodeTargetsForTimelineStep } from './animationSystem'
import { useViewerStore } from './viewerStore'

export default function AnimationPlayer({ inline = false }: { inline?: boolean } = {}) {
  const timeline = BASAL_GANGLIA_TIMELINE
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Aktiven Schritt ins 3D-Highlight spiegeln; beim Schliessen leeren.
  useEffect(() => {
    const timelineStep = timeline.steps[step]
    if (active && timelineStep) setHighlight(ontologyNodeTargetsForTimelineStep(timelineStep))
    else setHighlight([])
  }, [active, step, setHighlight, timeline])

  // Auto-Advance waehrend Play.
  useEffect(() => {
    if (!active || !playing) return
    const durationMs = timeline.steps[step]?.durationMs ?? timeline.steps[0]?.durationMs ?? 3800
    const timer = setInterval(() => setStep((s) => (s + 1) % timeline.steps.length), durationMs)
    return () => clearInterval(timer)
  }, [active, playing, step, timeline])

  if (!active) {
    return (
      <button
        type="button"
        className="ed-btn"
        onClick={() => {
          setActive(true)
          setStep(0)
          setPlaying(true)
        }}
        style={
          inline
            ? { width: '100%', textAlign: 'left', padding: '9px 12px', background: 'var(--paper)', border: '1px solid var(--line)', whiteSpace: 'normal', lineHeight: 1.4 }
            : { position: 'absolute', bottom: 54, left: 16, maxWidth: 'calc(100% - 32px)', whiteSpace: 'normal', lineHeight: 1.4, padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--line)' }
        }
      >
        <span style={{ color: 'var(--orange)' }}>▶</span> Animation · {timeline.title} · {timeline.source}
      </button>
    )
  }

  const current = timeline.steps[step] ?? timeline.steps[0]
  const currentKeyframe = current?.keyframes[0]
  const currentBody = currentKeyframe?.channels.overlay?.body
  if (!current) return null
  return (
    <div
      className="ed-panel ed-frame"
      style={
        inline
          ? { padding: 14 }
          : { position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', width: 'min(620px, 90%)', padding: 16 }
      }
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span className="eyebrow">Animation</span>
        <span className="display-lg" style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          {timeline.title}
        </span>
        <span className="mono-xs" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--g500)' }}>
          {timeline.source} · Schritt {step + 1}/{timeline.steps.length}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="ed-btn" onClick={() => { setActive(false); setPlaying(false) }}>
          Schliessen
        </button>
      </div>

      <div style={{ fontFamily: 'var(--ed-display)', fontSize: 'var(--fs-lg)', lineHeight: 1.55, color: 'var(--g800)', minHeight: 64 }}>
        {currentBody}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="ed-btn" onClick={() => { setStep(0); setPlaying(false) }}>
          ⟲ Anfang
        </button>
        <button
          type="button"
          className="ed-btn"
          onClick={() => setStep((s) => (s - 1 + timeline.steps.length) % timeline.steps.length)}
        >
          ◀
        </button>
        <button
          type="button"
          className="ed-btn active"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          className="ed-btn"
          onClick={() => setStep((s) => (s + 1) % timeline.steps.length)}
        >
          ▶
        </button>
      </div>
    </div>
  )
}
