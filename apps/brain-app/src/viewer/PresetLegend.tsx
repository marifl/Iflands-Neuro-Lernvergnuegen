import { useViewerStore } from './viewerStore'
import { hueToHex } from './colorPresets'
import ColorLegendPanel from './ColorLegendPanel'

/** Legende fuer das aktive Figur-Preset: Farbschwatch (exakt die Mesh-Farbe) + Funktionsgruppe.
 *  Macht die didaktische Faerbung selbsterklaerend (ersetzt die Buch-Abbildungs-Legende).
 *  Nur bei colorMode='preset' sichtbar; ueberlagert den 3D-Viewport bewusst minimal (Ecke). */
export default function PresetLegend() {
  const colorMode = useViewerStore((s) => s.colorMode)
  const preset = useViewerStore((s) => s.activePreset)
  if (colorMode !== 'preset' || !preset) return null
  return (
    <ColorLegendPanel
      title={preset.label}
      subtitle={(
        <>
          {preset.intent}
          {preset.coverage === 'partial' && preset.coverageNote ? (
            <div style={{ marginTop: 4, color: 'var(--orange)' }}>{preset.coverageNote}</div>
          ) : null}
        </>
      )}
      maxWidth={360}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {preset.groups.map((g) => (
          <div key={g.label} style={{ display: 'grid', gridTemplateColumns: '11px 1fr', columnGap: 8, alignItems: 'start' }}>
            <span
              data-color-group={g.label}
              style={{ width: 11, height: 11, marginTop: 2, background: hueToHex(g.hue), border: '1px solid var(--line-soft)' }}
            />
            <span>
              <span className="mono-sm" style={{ display: 'block', color: 'var(--g800)', letterSpacing: '0.01em' }}>
                {g.label}
              </span>
              <span className="mono-xs" style={{ display: 'block', lineHeight: 1.35, color: 'var(--g600)' }}>
                {g.meaning}
              </span>
            </span>
          </div>
        ))}
      </div>
    </ColorLegendPanel>
  )
}
