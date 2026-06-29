import type { AreaContext, AreaNode } from './atlasCatalog'

interface Props {
  area: AreaNode | null
}

type ContextDisplayKey = keyof Pick<AreaContext, 'clinic' | 'function' | 'chapter'>

const CONTEXT_DISPLAY_KEYS: ContextDisplayKey[] = ['clinic', 'function', 'chapter']

const FACET_LABEL: Record<ContextDisplayKey, string> = {
  clinic: 'Klinik',
  function: 'Funktion',
  chapter: 'Kapitel',
}

/** Facetten-Panel: zeigt Context (Klinik/Funktion/Kapitel) + Provenienz des gepickten Areals.
 *  Context ist bis SP2 leer -> explizit "keine kuratierten Daten" (dokumentierte Abwesenheit,
 *  KEIN maskierender Fallback). Provenienz existiert immer (SP1-Garantie). */
export function AtlasFacetPanel({ area }: Props) {
  if (!area) return null
  const contextKeys = CONTEXT_DISPLAY_KEYS.filter((key) => area.context[key])

  return (
    <div className="ed-panel" style={{ padding: '10px 12px', minWidth: 200 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{area.label_de}</div>

      <div style={{ marginBottom: 8 }}>
        {contextKeys.length === 0 ? (
          <div className="mono-sm" style={{ color: 'var(--muted)' }}>
            Keine kuratierten Daten (Kontext folgt mit SP2).
          </div>
        ) : (
          contextKeys.map((k) => (
            <div key={k} style={{ marginBottom: 4 }}>
              <span className="eyebrow">{FACET_LABEL[k] ?? k}</span>
              <div style={{ fontSize: 'var(--fs-base)', color: 'var(--fg)' }}>{area.context[k]}</div>
            </div>
          ))
        )}
      </div>

      {area.coords ? (
        <div style={{ borderTop: '1px solid var(--atlas-overlay-border)', paddingTop: 6, marginBottom: 6 }}>
          <div className="eyebrow" style={{ marginBottom: 3 }}>MNI-Koordinaten</div>
          <div className="mono-xs" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            Zentroid: [{area.coords.centroid.join(', ')}]<br />
            BBox-Min: [{area.coords.bbox.min.join(', ')}]<br />
            BBox-Max: [{area.coords.bbox.max.join(', ')}]
          </div>
        </div>
      ) : null}

      <div style={{ borderTop: '1px solid var(--atlas-overlay-border)', paddingTop: 6 }}>
        <div className="eyebrow" style={{ marginBottom: 3 }}>Provenienz</div>
        <div className="mono-xs" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Quelle: {area.provenance.source}<br />
          Affine-Det: {area.provenance.affine_det ?? '—'}
          {area.provenance.backfill ? <><br />Backfill-Patch</> : null}
          <br />TARO: {area.taro_present ? 'vorhanden' : 'nur fsaverage'}
        </div>
      </div>
    </div>
  )
}
