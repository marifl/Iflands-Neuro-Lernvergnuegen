import { useCallback, useEffect, useRef, useState } from 'react'
import { PHINEAS_GAGE, useCaseStudyViewStore } from './phineasGage'
import { useViewerStore } from './viewerStore'

const STEP_MS = 5200

export default function PhineasGageScene({ inline = false, asMode = false }: { inline?: boolean; asMode?: boolean } = {}) {
  const scene = PHINEAS_GAGE
  const setHighlight = useViewerStore((s) => s.setHighlight)
  const setSkull = useCaseStudyViewStore((s) => s.setSkull)
  const setRodVisible = useCaseStudyViewStore((s) => s.setRodVisible)
  const setRodPhase = useCaseStudyViewStore((s) => s.setRodPhase)
  const resetCaseStudyView = useCaseStudyViewStore((s) => s.reset)
  const [active, setActive] = useState(asMode)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(asMode)
  const stepRef = useRef(step)
  stepRef.current = step

  const applyStep = useCallback((stepIndex: number) => {
    const s = scene.steps[stepIndex]
    setHighlight(s.highlight)
    setSkull(s.showSkull, s.skullOpacity)
    setRodVisible(s.showRod)
    setRodPhase(s.rodPhase)
  }, [scene, setHighlight, setSkull, setRodVisible, setRodPhase])

  const clearView = useCallback(() => {
    setHighlight([])
    resetCaseStudyView()
  }, [setHighlight, resetCaseStudyView])

  useEffect(() => {
    if (asMode) applyStep(0)
  }, [asMode, applyStep])

  useEffect(() => {
    if (!active || !playing) return
    const timer = setInterval(() => {
      const next = (stepRef.current + 1) % scene.steps.length
      setStep(next)
      applyStep(next)
    }, STEP_MS)
    return () => clearInterval(timer)
  }, [active, playing, scene.steps.length, applyStep])

  if (!active && !asMode) {
    return (
      <button
        type="button"
        className="ed-btn"
        onClick={() => {
          setActive(true)
          setStep(0)
          setPlaying(true)
          applyStep(0)
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
        inline || asMode
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
        {!asMode ? (
          <button type="button" className="ed-btn" onClick={() => { setActive(false); setPlaying(false); clearView() }}>
            Schliessen
          </button>
        ) : null}
      </div>

      <div style={{ fontFamily: 'var(--ed-display)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--g800)', minHeight: 84 }}>
        {current.body}
      </div>
      {current.areas?.length ? (
        <div
          style={{
            marginTop: 8,
            display: 'grid',
            gap: 4,
            fontFamily: 'var(--ed-mono)',
            fontSize: 10.5,
            lineHeight: 1.45,
            color: 'var(--g700)',
          }}
        >
          <span style={{ color: 'var(--orange)', fontWeight: 700 }}>Markierte Läsionsareale</span>
          <span>{current.areas.join(' · ')}</span>
        </div>
      ) : null}

      <div style={{ marginTop: 10, fontFamily: 'var(--ed-mono)', fontSize: 10.5, lineHeight: 1.45, color: 'var(--g600)' }}>
        {scene.trajectoryNoteDe}<br />
        {scene.assetNoteDe}<br />
        {scene.rodScaleNoteDe}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="ed-btn" onClick={() => { setStep(0); setPlaying(false); applyStep(0) }}>
          ⟲ Anfang
        </button>
        <button
          type="button"
          className="ed-btn"
          onClick={() => {
            const next = (step - 1 + scene.steps.length) % scene.steps.length
            setStep(next)
            applyStep(next)
          }}
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
          onClick={() => {
            const next = (step + 1) % scene.steps.length
            setStep(next)
            applyStep(next)
          }}
        >
          ▶
        </button>
      </div>

      {/* Fortschritt durch die Fallstudien-Schritte (konsistent mit dem Lern-Modus; macht den
          Autoplay-Verlauf sichtbar statt nur „Schritt x/6" als Text). */}
      <div
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={scene.steps.length}
        style={{ height: 3, width: '100%', marginTop: 12, background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${((step + 1) / scene.steps.length) * 100}%`, background: 'var(--orange)', transition: 'width 220ms ease' }} />
      </div>
    </div>
  )
}
