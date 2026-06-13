import type { AtlasLayer } from './atlasAssets'

interface Props {
  layers: AtlasLayer[]
  active: string
  onSelect: (id: string) => void
  picked: string
}

const AXIS_LABEL: Record<'macro' | 'cyto', string> = {
  macro: 'Makroanatomie',
  cyto: 'Zytoarchitektonik',
}

/** Layer-Umschalt-Panel (oben links, ueber dem 3D-Canvas). Gruppiert nach Achse. */
export function AtlasLayerPanel({ layers, active, onSelect, picked }: Props) {
  const macroLayers = layers.filter((l) => l.axis === 'macro')
  const cytoLayers = layers.filter((l) => l.axis === 'cyto')
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
        position: 'fixed',
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
      {groups.map((group) => (
        <div key={group.axis} style={{ marginBottom: group.axis === 'macro' ? 10 : 0 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {AXIS_LABEL[group.axis]}
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
        <div className="eyebrow" style={{ marginBottom: 4 }}>Areal</div>
        <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--ink)', letterSpacing: '0.04em' }}>
          {picked}
        </div>
      </div>
    </div>
  )
}
