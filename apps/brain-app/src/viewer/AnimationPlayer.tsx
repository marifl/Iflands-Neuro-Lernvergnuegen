import { useEffect, useMemo, useState } from 'react'
import { BASAL_GANGLIA_LOOP } from './animations'
import { ontologyNodeTargetsForTimelineStep, timelineDocumentFromAnimation } from './animationSystem'
import { useViewerStore } from './viewerStore'

const STEP_MS = 3800

export default function AnimationPlayer({ inline = false }: { inline?: boolean } = {}) {
  const animation = BASAL_GANGLIA_LOOP
  const timeline = useMemo(() => timelineDocumentFromAnimation(animation), [animation])
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
    const timer = setInterval(() => setStep((s) => (s + 1) % animation.steps.length), STEP_MS)
    return () => clearInterval(timer)
  }, [active, playing, animation.steps.length])

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
        <span style={{ color: 'var(--orange)' }}>▶</span> Animation · {animation.title} · {animation.source}
      </button>
    )
  }

  const current = animation.steps[step] ?? animation.steps[0]
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
        <span style={{ fontFamily: 'var(--ed-display)', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 14, color: 'var(--ink)' }}>
          {animation.title}
        </span>
        <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--g500)' }}>
          {animation.source} · Schritt {step + 1}/{animation.steps.length}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="ed-btn" onClick={() => { setActive(false); setPlaying(false) }}>
          Schliessen
        </button>
      </div>

      <div style={{ fontFamily: 'var(--ed-display)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--g800)', minHeight: 64 }}>
        {current.captionDe}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="ed-btn" onClick={() => { setStep(0); setPlaying(false) }}>
          ⟲ Anfang
        </button>
        <button
          type="button"
          className="ed-btn"
          onClick={() => setStep((s) => (s - 1 + animation.steps.length) % animation.steps.length)}
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
          onClick={() => setStep((s) => (s + 1) % animation.steps.length)}
        >
          ▶
        </button>
      </div>
    </div>
  )
}
