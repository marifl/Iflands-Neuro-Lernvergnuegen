import type { CSSProperties } from 'react'
import { CUT_AXIS_COLORS } from './atlasColorSystem'
import { CUT_AXES, CUT_POS_MAX, type CutAxis } from './cutCapsMerged'
import { useViewerStore } from './viewerStore'

const CUT_LABEL: Record<CutAxis, string> = {
  sagittal: 'Sagittal',
  coronal: 'Coronal',
  axial: 'Axial',
}

const SMALL_BUTTON: CSSProperties = { padding: '4px 9px' }

function cssColor(hex: number, alpha: number) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function axisButtonStyle(axis: CutAxis, active: boolean): CSSProperties {
  return {
    ...SMALL_BUTTON,
    '--cut-axis-color': cssColor(CUT_AXIS_COLORS[axis], 0.92),
    borderColor: active ? 'var(--cut-axis-color)' : 'var(--line-soft)',
    boxShadow: 'inset 3px 0 0 var(--cut-axis-color)',
  } as CSSProperties
}

export function ExplorerSelectionActions() {
  const lang = useViewerStore((s) => s.lang)
  const selectedLabels = useViewerStore((s) => s.selectedLabels)
  const selected = useViewerStore((s) => s.selected)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const hidden = useViewerStore((s) => s.hidden)
  const isolated = useViewerStore((s) => s.isolated)
  const setHidden = useViewerStore((s) => s.setHidden)
  const clearHidden = useViewerStore((s) => s.clearHidden)
  const setIsolated = useViewerStore((s) => s.setIsolated)
  const selectedSlugList = [...selectedSlugs]
  const hasSelection = selectedSlugList.length > 0
  const selectionHasVisibleSlugs = selectedSlugList.some((slug) => !hidden.has(slug))
  const selectionLabel = selectedLabels?.[lang] ?? 'Keine Struktur ausgewählt'

  return (
    <div
      role="group"
      aria-label="Auswahlaktionen"
      style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10, display: 'grid', gap: 7 }}
    >
      <div className="eyebrow">Auswahl</div>
      <div
        title={selectionLabel}
        style={{
          fontFamily: 'var(--ed-mono)',
          fontSize: 11,
          color: hasSelection ? 'var(--ink)' : 'var(--g500)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {selectionLabel}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          className="ed-btn"
          disabled={!hasSelection}
          style={SMALL_BUTTON}
          onClick={() => setHidden(selectedSlugList, selectionHasVisibleSlugs)}
        >
          {selectionHasVisibleSlugs ? 'Auswahl ausblenden' : 'Auswahl einblenden'}
        </button>
        <button
          type="button"
          className="ed-btn"
          disabled={!hasSelection}
          style={SMALL_BUTTON}
          onClick={() => setIsolated(selected)}
        >
          Auswahl isolieren
        </button>
        <button type="button" className="ed-btn" style={SMALL_BUTTON} onClick={clearHidden}>
          Alles zeigen
        </button>
        <button
          type="button"
          className="ed-btn"
          disabled={!isolated}
          style={SMALL_BUTTON}
          onClick={() => setIsolated(null)}
        >
          Isolation aus
        </button>
      </div>
    </div>
  )
}

export function ExplorerCutControls() {
  const cuts = useViewerStore((s) => s.cuts)
  const setCut = useViewerStore((s) => s.setCut)
  const cutMode = useViewerStore((s) => s.cutMode)
  const setCutMode = useViewerStore((s) => s.setCutMode)
  const clipAtlasOverlay = useViewerStore((s) => s.clipAtlasOverlay)
  const setClipAtlasOverlay = useViewerStore((s) => s.setClipAtlasOverlay)

  return (
    <div
      role="group"
      aria-label="Schnitte"
      style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10, display: 'grid', gap: 8 }}
    >
      <div className="eyebrow">Schnitte</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          className={`ed-btn${cutMode === 'slice' ? ' active' : ''}`}
          style={SMALL_BUTTON}
          onClick={() => setCutMode('slice')}
        >
          Schneiden
        </button>
        <button
          type="button"
          className={`ed-btn${cutMode === 'hide' ? ' active' : ''}`}
          style={SMALL_BUTTON}
          onClick={() => setCutMode('hide')}
        >
          Ausblenden
        </button>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {CUT_AXES.map((axis) => (
          <div key={axis} style={{ display: 'grid', gap: 4 }}>
            <button
              type="button"
              className={`ed-btn${cuts[axis].on ? ' active' : ''}`}
              data-cut-axis={axis}
              style={axisButtonStyle(axis, cuts[axis].on)}
              onClick={() => setCut(axis, { on: !cuts[axis].on, pos: cuts[axis].pos })}
            >
              {CUT_LABEL[axis]}
            </button>
            {cuts[axis].on ? (
              <input
                type="range"
                min={-CUT_POS_MAX}
                max={CUT_POS_MAX}
                value={cuts[axis].pos}
                onChange={(event) => setCut(axis, { on: true, pos: Number(event.target.value) })}
                aria-label={`Schnittposition ${CUT_LABEL[axis]}`}
                style={{ width: '100%', accentColor: cssColor(CUT_AXIS_COLORS[axis], 0.92), cursor: 'ew-resize' }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          className={`ed-btn${clipAtlasOverlay ? ' active' : ''}`}
          style={SMALL_BUTTON}
          onClick={() => setClipAtlasOverlay(true)}
        >
          Atlas mitschneiden
        </button>
        <button
          type="button"
          className={`ed-btn${!clipAtlasOverlay ? ' active' : ''}`}
          style={SMALL_BUTTON}
          onClick={() => setClipAtlasOverlay(false)}
        >
          Atlas ausnehmen
        </button>
      </div>
    </div>
  )
}
