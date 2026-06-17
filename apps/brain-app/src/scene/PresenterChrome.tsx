import { useSceneStore } from './sceneStore'
import { nextIndex, prevIndex } from './nav'

/** Szenen-Navigation als Kopfzeile der Inhalts-Sidebar (kein Overlay, keine fhead-Kollision).
 *  Vor/Zurück + Position + Sprung-Dropdown; nimmt die volle Spaltenbreite. */
export default function PresenterChrome() {
  const { scenes, index, step, goto } = useSceneStore()
  if (!scenes.length) return null
  const scene = scenes[index]
  const sequence = scene.sequence
  const nav: React.CSSProperties = { padding: '4px 9px', flex: 'none' }
  // Sichtbarer Fortschritt durch die Szenen-Sequenz (gegen Time-Blindness; Lernende sehen,
  // wie weit sie sind + dass es ein Ende gibt).
  const progress = ((sequence.stepIndex + 1) / sequence.stepCount) * 100
  const kindLabel = sequence.kind === 'presentation' ? 'Vortrag' : 'Lernpfad'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{kindLabel}</div>
          <div
            title={sequence.label}
            style={{
              marginTop: 3,
              fontFamily: 'var(--ed-mono)',
              fontSize: 11,
              color: 'var(--ink-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sequence.label}
          </div>
        </div>
        <div
          aria-label="Aktueller Vortragsschritt"
          style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, color: 'var(--ink)', whiteSpace: 'nowrap', flex: 'none' }}
        >
          Folie {sequence.stepIndex + 1} / {sequence.stepCount} · Step {step + 1}
        </div>
      </div>
      <div
        title={scene.title}
        style={{
          fontFamily: 'var(--ed-display)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ink)',
          lineHeight: 1.15,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {scene.title}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', minWidth: 0 }}>
        <button
          type="button"
          className="ed-btn"
          style={nav}
          onClick={() => goto(prevIndex(index))}
          disabled={index === 0}
          aria-label="Vorige Szene"
        >
          ◀
        </button>
        <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, color: 'var(--ink)', flex: 'none', whiteSpace: 'nowrap' }}>
          {sequence.stepIndex + 1} / {sequence.stepCount}
        </span>
        <button
          type="button"
          className="ed-btn"
          style={nav}
          onClick={() => goto(nextIndex(index, scenes.length))}
          disabled={index === scenes.length - 1}
          aria-label="Nächste Szene"
        >
          ▶
        </button>
        <select
          className="ed-btn"
          value={index}
          onChange={(e) => goto(Number(e.target.value))}
          aria-label="Szene springen"
          style={{ flex: 1, minWidth: 0, padding: '4px 8px' }}
        >
          {scenes.map((s, sceneIndex) => (
            <option key={s.configName} value={sceneIndex}>
              {s.sequence.stepIndex + 1}. {s.title}
            </option>
          ))}
        </select>
      </div>
      {/* Fortschrittsbalken: füllt sich mit jeder Szene; macht „wie weit / wie lang noch" konkret. */}
      <div
        role="progressbar"
        aria-valuenow={sequence.stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={sequence.stepCount}
        style={{ height: 3, width: '100%', background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--orange)', transition: 'width 220ms ease' }} />
      </div>
    </div>
  )
}
