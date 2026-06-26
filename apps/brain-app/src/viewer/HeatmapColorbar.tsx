/**
 * HeatmapColorbar (wGWNtFmxljyc, Slice A).
 *
 * Legende fuer kontinuierliche Overlays: zeigt die Colormap als Gradient mit Min/Max,
 * Einheit und optionaler Threshold-Markierung. Teilt `colormapRgb` mit dem Surface-Shader,
 * damit Legende und Flaeche garantiert dieselbe Skala zeigen. Reines CSS, kein Three.js.
 */
import { colormapRgb, rgbToCss } from './heatmapColormap'
import type { ContinuousScale } from './overlayContract'

const GRADIENT_STOPS = 12

function gradientCss(colormap: ContinuousScale['colormap']): string {
  const stops = Array.from({ length: GRADIENT_STOPS }, (_, i) => {
    const u = i / (GRADIENT_STOPS - 1)
    return `${rgbToCss(colormapRgb(colormap, u))} ${Math.round(u * 100)}%`
  })
  return `linear-gradient(to right, ${stops.join(', ')})`
}

export function HeatmapColorbar({ scale }: { scale: ContinuousScale }) {
  const span = scale.max - scale.min
  const thresholdPct =
    scale.threshold !== undefined && span > 0
      ? Math.max(0, Math.min(1, (scale.threshold - scale.min) / span)) * 100
      : null

  return (
    <div className="heatmap-colorbar" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
      <div
        className="heatmap-colorbar__bar"
        role="img"
        aria-label={`Farbskala ${scale.colormap}, ${scale.min} bis ${scale.max} ${scale.unit}`}
        style={{ position: 'relative', height: 12, borderRadius: 3, background: gradientCss(scale.colormap) }}
      >
        {thresholdPct !== null && (
          <span
            className="heatmap-colorbar__threshold"
            style={{
              position: 'absolute',
              top: -2,
              bottom: -2,
              left: `${thresholdPct}%`,
              width: 2,
              background: 'var(--ed-fg, #111)',
            }}
          />
        )}
      </div>
      <div
        className="heatmap-colorbar__labels"
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.8 }}
      >
        <span>{scale.min}</span>
        <span>{scale.unit}</span>
        <span>{scale.max}</span>
      </div>
    </div>
  )
}
