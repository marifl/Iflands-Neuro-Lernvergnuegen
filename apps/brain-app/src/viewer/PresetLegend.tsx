import { useViewerStore } from './viewerStore'
import { hueToHex } from './colorPresets'

/** Legende fuer das aktive Figur-Preset: Farbschwatch (exakt die Mesh-Farbe) + Funktionsgruppe.
 *  Macht die didaktische Faerbung selbsterklaerend (ersetzt die Buch-Abbildungs-Legende).
 *  Nur bei colorMode='preset' sichtbar; ueberlagert den 3D-Viewport bewusst minimal (Ecke). */
export default function PresetLegend() {
  const colorMode = useViewerStore((s) => s.colorMode)
  const preset = useViewerStore((s) => s.activePreset)
  if (colorMode !== 'preset' || !preset) return null
  return (
    <div
      className="ed-panel ed-frame"
      style={{ position: 'absolute', bottom: 16, left: 16, padding: '10px 13px', pointerEvents: 'none', maxWidth: 300 }}
    >
      <div className="eyebrow">Färbung</div>
      <div
        style={{
          fontFamily: 'var(--ed-display)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          fontSize: 14,
          color: 'var(--ink)',
          margin: '4px 0 8px',
          lineHeight: 1.15,
        }}
      >
        {preset.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {preset.groups.map((g) => (
          <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 11, height: 11, flex: '0 0 auto', background: hueToHex(g.hue), border: '1px solid var(--line-soft)' }}
            />
            <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 10.5, color: 'var(--g800)', letterSpacing: '0.01em' }}>
              {g.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
