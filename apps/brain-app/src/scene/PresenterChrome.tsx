import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSceneStore } from './sceneStore'
import { nextIndex, prevIndex } from './nav'
import type { LoadedScene } from './scenes'

function stepOptionLabel(scene: LoadedScene) {
  return `${scene.sequence.stepIndex + 1}. ${scene.title}`
}

function searchValue(value: string) {
  return value.trim().toLowerCase()
}

function SceneJumpPicker({
  scenes,
  index,
  goto,
}: {
  scenes: LoadedScene[]
  index: number
  goto: (index: number, step?: number) => void
}) {
  const activeLabel = stepOptionLabel(scenes[index])
  const [query, setQuery] = useState(activeLabel)
  const [open, setOpen] = useState(false)
  const normalizedQuery = searchValue(query)
  const matches = useMemo(() => {
    if (!normalizedQuery) return scenes
    return scenes.filter((scene) => {
      const label = stepOptionLabel(scene)
      return searchValue(`${label} ${scene.configName} ${scene.figure ?? ''}`).includes(normalizedQuery)
    })
  }, [normalizedQuery, scenes])

  useEffect(() => {
    setQuery(activeLabel)
  }, [activeLabel])

  const selectScene = (next: number) => {
    goto(next)
    setOpen(false)
    setQuery(stepOptionLabel(scenes[next]))
  }

  return (
    <div
      onBlur={(event) => {
        const related = event.relatedTarget instanceof Node ? event.relatedTarget : null
        if (!event.currentTarget.contains(related)) {
          setOpen(false)
          setQuery(activeLabel)
        }
      }}
      style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}
    >
      <input
        className="ed-btn"
        value={query}
        onFocus={(event) => {
          setOpen(true)
          setQuery('')
          event.currentTarget.select()
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            setQuery(activeLabel)
          }
          if (event.key === 'Enter' && matches.length) {
            event.preventDefault()
            selectScene(scenes.indexOf(matches[0]))
          }
        }}
        aria-label="Szene springen"
        aria-controls="scene-jump-options"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        placeholder={activeLabel}
        style={{ width: '100%', minWidth: 0, padding: '4px 8px', textAlign: 'left' }}
      />
      {open ? (
        <div
          id="scene-jump-options"
          role="listbox"
          className="ed-panel"
          style={{
            maxHeight: 176,
            overflowY: 'auto',
            padding: 4,
            display: 'grid',
            gap: 3,
            border: '1px solid var(--line-soft)',
          }}
        >
          {matches.length ? (
            matches.map((scene) => {
              const sceneIndex = scenes.indexOf(scene)
              const label = stepOptionLabel(scene)
              return (
                <button
                  key={scene.configName}
                  type="button"
                  role="option"
                  aria-selected={sceneIndex === index}
                  className="ed-btn"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectScene(sceneIndex)}
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    whiteSpace: 'normal',
                    padding: '5px 8px',
                    color: sceneIndex === index ? 'var(--orange)' : 'var(--ink)',
                  }}
                >
                  {label}
                </button>
              )
            })
          ) : (
            <div role="status" style={{ padding: '6px 8px', fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--g600)' }}>
              Kein Schritt gefunden
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Szenen-Navigation als Kopfzeile der Inhalts-Sidebar (kein Overlay, keine fhead-Kollision).
 *  Vor/Zurück + Position + suchbarer Sprung; nimmt die volle Spaltenbreite. */
export default function PresenterChrome() {
  const { scenes, index, step, goto } = useSceneStore()
  if (!scenes.length) return null
  const scene = scenes[index]
  const sequence = scene.sequence
  const nav: CSSProperties = { padding: '4px 9px', flex: 'none' }
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
        <SceneJumpPicker scenes={scenes} index={index} goto={goto} />
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
