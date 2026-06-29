import { useEffect, useState } from 'react'
import type { RegularAppMode } from './appModeDefinitions'
import { useStudentProgressStore } from './studentProgress'
import { loadScenes, type LoadedScene } from '../scene/scenes'
import { replaceCanonicalLocation } from '../scene/router'

/** Resume-Index: bei vorhandenem Fortschritt der zuletzt aktive Schritt, sonst Pfad-Anfang.
 *  Kein stiller Fallback — ohne Fortschritt ist der Anfang der ehrliche Startzustand. */
export function resolveResumeIndex(scenes: LoadedScene[], currentConfigName?: string): number {
  if (scenes.length === 0) return 0
  if (!currentConfigName) return 0
  const found = scenes.findIndex((scene) => scene.configName === currentConfigName)
  return found >= 0 ? found : 0
}

/** Unified-Shell-Einstieg (V2): Resume statt Modus-Kachelgrid. Verankert auf dem aktiven
 *  Lernschritt des Kapitel-11-Pfads (Titel, Kapitel/Folie, Fortschritt, Kernbotschaft) und
 *  bietet als Primaeraktion das Fortsetzen/Starten. Sekundaer bleibt freies Erkunden.
 *  Liegt als Vollflaechen-Overlay ueber der App, bis ein Einstieg gewaehlt wurde. */
export default function ResumeLauncher({
  onEnter,
}: {
  onEnter: (mode: RegularAppMode) => void
}) {
  const [scenes, setScenes] = useState<LoadedScene[] | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const progress = useStudentProgressStore((s) => s.progress)

  useEffect(() => {
    let active = true
    loadScenes()
      .then((loaded) => {
        if (active) setScenes(loaded)
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error : new Error(String(error)))
      })
    return () => {
      active = false
    }
  }, [])

  const resumeIndex = scenes ? resolveResumeIndex(scenes, progress?.currentConfigName) : 0

  const seenCount = progress
    ? progress.steps.filter((step) => step.status !== 'not-started').length
    : 0
  const isResume = Boolean(progress && seenCount > 0)

  const enterStep = (scene: LoadedScene) => {
    replaceCanonicalLocation({ configName: scene.configName, sceneId: scene.id, step: 0 })
    onEnter('learn')
  }

  const scene = scenes?.[resumeIndex] ?? null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--app-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div className="ed-frame ed-panel" style={{ maxWidth: 560, width: '100%', padding: '26px 28px', boxSizing: 'border-box' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Iflands Neuro Lernvergnügen · Kapitel 11</div>

        {loadError ? (
          <div role="alert" style={{ color: 'var(--red)', lineHeight: 1.5 }}>
            <strong className="display-xl" style={{ display: 'block', marginBottom: 6 }}>
              Lernpfad konnte nicht geladen werden
            </strong>
            <span className="mono-base">{loadError.message}</span>
          </div>
        ) : scenes === null ? (
          <div role="status" className="mono-base" style={{ color: 'var(--g600)', padding: '14px 0' }}>
            Lernpfad wird geladen…
          </div>
        ) : !scene ? (
          <div role="alert" style={{ color: 'var(--red)', lineHeight: 1.5 }}>
            <strong className="display-xl" style={{ display: 'block', marginBottom: 6 }}>
              Kein Lernschritt verfügbar
            </strong>
            <span className="mono-base">Die Lernpfad-Sequenz enthält keine Szenen.</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="ed-btn ed-frame active"
              onClick={() => enterStep(scene)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '17px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                marginBottom: 12,
              }}
            >
              <span className="mono-xs" style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {isResume ? 'Fortsetzen' : 'Lernpfad starten'}
              </span>
              <span className="mono-sm" style={{ color: 'var(--g600)' }}>
                {scene.section}
                {scene.figure ? ` · Abb. ${scene.figure}` : ''}
              </span>
              <span className="display-xl" style={{ letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                {scene.title}
              </span>
              <span className="mono-sm" style={{ color: 'var(--g600)' }}>
                Schritt {resumeIndex + 1} von {scenes.length}
              </span>
              <span className="mono-base" style={{ lineHeight: 1.5 }}>
                {scene.companion.summary}
              </span>
            </button>

            {/* Progressbar als eigenes Element (nicht im Button): Screenreader ignorieren
                geschachtelte ARIA-Rollen im accessible name eines Buttons. */}
            <span
              role="progressbar"
              aria-label="Lernfortschritt"
              aria-valuemin={0}
              aria-valuemax={scenes.length}
              aria-valuenow={Math.min(seenCount, scenes.length)}
              style={{
                display: 'block',
                width: '100%',
                height: 4,
                borderRadius: 2,
                marginBottom: 14,
                background: 'var(--g200, rgba(127,127,127,0.25))',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${(Math.min(seenCount, scenes.length) / scenes.length) * 100}%`,
                  background: 'var(--orange, #e8651f)',
                }}
              />
            </span>

            <button
              type="button"
              className="ed-btn"
              onClick={() => onEnter('explore')}
              style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}
            >
              <span className="mono-sm" style={{ color: 'var(--g600)', textDecoration: 'underline' }}>
                Lieber frei erkunden →
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
