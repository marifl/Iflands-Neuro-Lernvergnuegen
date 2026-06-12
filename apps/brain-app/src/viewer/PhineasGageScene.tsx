import { useEffect, useState } from 'react'
import { PHINEAS_GAGE } from './phineasGage'
import { useViewerStore } from './viewerStore'

const STEP_MS = 5200

export default function PhineasGageScene({ inline = false }: { inline?: boolean } = {}) {
  const scene = PHINEAS_GAGE
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setSkull = useViewerStore((s) => s.setSkull)
  const setRodVisible = useViewerStore((s) => s.setRodVisible)
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Aktiven Schritt in Highlight + Schaedel + Stange spiegeln; beim Schliessen zuruecksetzen.
  useEffect(() => {
    if (!active) {
      setHighlight([])
      setSkull(false)
      setRodVisible(false)
      return
    }
    const s = scene.steps[step]
    setHighlight(s.highlight)
    setSkull(s.showSkull, s.skullOpacity)
    setRodVisible(s.showRod)
  }, [active, step, scene, setHighlight, setSkull, setRodVisible])

  useEffect(() => {
    if (!active || !playing) return
    const timer = setInterval(() => setStep((s) => (s + 1) % scene.steps.length), STEP_MS)
    return () => clearInterval(timer)
  }, [active, playing, scene.steps.length])

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
            : { position: 'absolute', bottom: 16, left: 16, maxWidth: 'calc(100% - 32px)', whiteSpace: 'normal', lineHeight: 1.4, padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--line)' }
        }
      >
        <span style={{ color: 'var(--orange)' }}>▶</span> Fallstudie · {scene.title}
      </button>
    )
  }

  const current = scene.steps[step]
  return (
    <div
      className="ed-panel ed-frame"
      style={
        inline
          ? { padding: 14 }
          : { position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', width: 'min(640px, 90%)', padding: 16 }
      }
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span className="eyebrow">Fallstudie</span>
        <span style={{ fontFamily: 'var(--ed-display)', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 14, color: 'var(--ink)' }}>
          {scene.title}
        </span>
        <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--g500)' }}>
          {scene.source} · Schritt {step + 1}/{scene.steps.length}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="ed-btn" onClick={() => { setActive(false); setPlaying(false) }}>
          Schliessen
        </button>
      </div>

      <div style={{ fontFamily: 'var(--ed-display)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--g800)', minHeight: 84 }}>
        {current.captionDe}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="ed-btn" onClick={() => { setStep(0); setPlaying(false) }}>
          ⟲ Anfang
        </button>
        <button
          type="button"
          className="ed-btn"
          onClick={() => setStep((s) => (s - 1 + scene.steps.length) % scene.steps.length)}
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
          onClick={() => setStep((s) => (s + 1) % scene.steps.length)}
        >
          ▶
        </button>
      </div>
    </div>
  )
}
