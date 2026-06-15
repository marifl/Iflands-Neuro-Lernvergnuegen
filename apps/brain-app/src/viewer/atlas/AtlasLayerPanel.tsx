import type { AtlasLayer } from './atlasAssets'

interface Props {
  layers: AtlasLayer[]
  active: string
  onSelect: (id: string) => void
  surface: 'pial' | 'inflated'
  onSurface: (s: 'pial' | 'inflated') => void
  showSub?: boolean
  onToggleSub: () => void
  picked: string
  hovered?: string
}

const AXIS_LABEL: Record<'macro' | 'cyto', string> = {
  macro: 'Makroanatomie',
  cyto: 'Zytoarchitektonik',
}

// Eine Zeile, die den Fachbegriff entjargonisiert (B6).
const AXIS_SUB: Record<'macro' | 'cyto', string> = {
  macro: 'Faltung — Gyri & Sulci',
  cyto: 'Zellaufbau — Areale',
}

/** Layer-Umschalt-Panel (oben links, ueber dem 3D-Canvas). Gruppiert nach Achse. */
export function AtlasLayerPanel({ layers, active, onSelect, surface, onSurface, showSub, onToggleSub, picked, hovered = '—' }: Props) {
  const macroLayers = layers.filter((l) => l.axis === 'macro')
  const cytoLayers = layers.filter((l) => l.axis === 'cyto')
  const hasHover = hovered !== '—'
  const hasPick = picked !== '—'
  const areaLabel = hasHover ? hovered : picked
  const groups: { axis: 'macro' | 'cyto'; items: AtlasLayer[] }[] = (
    [
      { axis: 'macro' as const, items: macroLayers },
      { axis: 'cyto' as const, items: cytoLayers },
    ] as const
  ).filter((g) => g.items.length > 0)

  return (
    <div
      className="ed-panel"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        padding: '10px 12px',
        minWidth: 180,
        borderRadius: 4,
        background: 'rgba(11,11,14,0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Rahmung: dieses Hirn ist NICHT das TARO-Lern-Hirn — sondern der Standardraum,
          in dem die Atlas-Areale exakt definiert sind (loest die „zwei Hirne"-Verwirrung). */}
      <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="eyebrow" style={{ marginBottom: 3 }}>Atlas · fsaverage</div>
        <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 9.5, color: 'var(--muted, #888)', lineHeight: 1.45 }}>
          Standardhirn — Regionen präzise.<br />Nicht das TARO-Lern-Hirn.
        </div>
      </div>
      {groups.map((group) => (
        <div key={group.axis} style={{ marginBottom: group.axis === 'macro' ? 10 : 0 }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>
            {AXIS_LABEL[group.axis]}
          </div>
          <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 9, color: 'var(--muted, #888)', marginBottom: 6 }}>
            {AXIS_SUB[group.axis]}
          </div>
          {group.items.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`ed-btn${active === layer.id ? ' active' : ''}`}
              onClick={() => onSelect(layer.id)}
              style={{ width: '100%', textAlign: 'left', padding: '5px 8px', marginBottom: 2 }}
            >
              {layer.label_de}
            </button>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Oberflaeche</div>
        <button
          type="button"
          className={`ed-btn${surface === 'inflated' ? ' active' : ''}`}
          onClick={() => onSurface('inflated')}
          style={{ width: '100%', textAlign: 'left', padding: '5px 8px', marginBottom: 2 }}
        >
          Inflated
        </button>
        <button
          type="button"
          className={`ed-btn${surface === 'pial' ? ' active' : ''}`}
          onClick={() => onSurface('pial')}
          style={{ width: '100%', textAlign: 'left', padding: '5px 8px', marginBottom: 2 }}
        >
          Pial
        </button>
      </div>
      {showSub !== undefined ? (
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Subkortex</div>
          <button
            type="button"
            className={`ed-btn${showSub ? ' active' : ''}`}
            onClick={onToggleSub}
            style={{ width: '100%', textAlign: 'left', padding: '5px 8px', marginBottom: 2 }}
          >
            Basalganglien/Thalamus
          </button>
          <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 8.5, color: 'var(--muted, #888)', marginTop: 2 }}>
            (nur Pial-Ansicht)
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Areal</div>
        {!hasHover && !hasPick ? (
          <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--muted, #888)', letterSpacing: '0.02em' }}>
            Bewege oder klicke auf eine Region
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 13, fontWeight: 600, color: hasHover ? 'var(--ink)' : 'var(--orange)', letterSpacing: '0.02em' }}>
              {areaLabel}
            </div>
            <div className="eyebrow" style={{ marginTop: 3, color: 'var(--muted, #888)' }}>
              {hasHover ? 'unter Cursor' : 'ausgewählt'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
