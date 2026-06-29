import { useViewerStore } from '../viewer/viewerStore'
import { useSceneStore } from './sceneStore'
import { ROUTE_CHANGE_EVENT } from './router'

/** Praesentationszustand des Unified Mode (PresenterFrame): Sprechernotiz zur aktiven Folie
 *  plus Rueckweg zum Lernpfad. Kein eigener AppMode-Silo — rendert nur, wenn die aktive
 *  Sequenz eine Praesentation ist (sonst null). */
export default function PresenterNotes() {
  const scene = useSceneStore((s) => s.scenes[s.index])
  const setAppMode = useViewerStore((s) => s.setAppMode)
  if (!scene || scene.sequence.kind !== 'presentation') return null

  // Rueckweg: Praesentation verlassen -> zurueck in den Lernpfad (Default-Sequenz). Sequence-Wechsel
  // in der URL laedt die Lern-Szenen neu (LearnSidebar.syncFromRoute).
  const leavePresentation = () => {
    window.history.replaceState(null, '', '?mode=learn')
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
    setAppMode('learn')
  }

  return (
    <section className="ed-panel ed-frame" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span className="eyebrow" style={{ color: 'var(--orange)' }}>Sprechernotiz</span>
        <button type="button" className="ed-btn" style={{ padding: '5px 11px', minHeight: 44 }} onClick={leavePresentation}>
          Vortrag verlassen
        </button>
      </div>
      <p style={{ fontFamily: 'var(--ed-display)', fontSize: 'var(--fs-md)', lineHeight: 1.55, color: 'var(--ink)', margin: 0 }}>
        {scene.companion.summary}
      </p>
      {scene.companion.sources.length ? (
        <div className="mono-xs" style={{ color: 'var(--g500)' }}>
          Quellen: {scene.companion.sources.map((source) => source.key).join(' · ')}
        </div>
      ) : null}
    </section>
  )
}
