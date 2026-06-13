import { useSceneStore } from './sceneStore'
import { nextIndex, prevIndex } from './nav'

/** Szenen-Navigation als Kopfzeile der Inhalts-Sidebar (kein Overlay, keine fhead-Kollision).
 *  Vor/Zurueck + Position + Sprung-Dropdown; nimmt die volle Spaltenbreite. */
export default function PresenterChrome() {
  const { scenes, index, goto } = useSceneStore()
  if (!scenes.length) return null
  const nav: React.CSSProperties = { padding: '4px 9px', flex: 'none' }
  // Sichtbarer Fortschritt durch die Szenen-Sequenz (gegen Time-Blindness; Lernende sehen,
  // wie weit sie sind + dass es ein Ende gibt).
  const progress = ((index + 1) / scenes.length) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
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
        {index + 1} / {scenes.length}
      </span>
      <button
        type="button"
        className="ed-btn"
        style={nav}
        onClick={() => goto(nextIndex(index, scenes.length))}
        disabled={index === scenes.length - 1}
        aria-label="Naechste Szene"
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
        {scenes.map((s, i) => (
          <option key={s.id} value={i}>
            {i + 1}. {s.title}
          </option>
        ))}
      </select>
    </div>
      {/* Fortschrittsbalken: fuellt sich mit jeder Szene; macht „wie weit / wie lang noch" konkret. */}
      <div
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={scenes.length}
        style={{ height: 3, width: '100%', background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--orange)', transition: 'width 220ms ease' }} />
      </div>
    </div>
  )
}
