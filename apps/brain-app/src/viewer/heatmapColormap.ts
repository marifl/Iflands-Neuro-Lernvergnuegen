/**
 * Heatmap-Colormaps (wGWNtFmxljyc, Slice A).
 *
 * Mappt kontinuierliche Messwerte auf Farben fuer die Probability-/Z-Score-Overlays.
 * Reine Funktionen (kein Three.js) — werden vom CanonicalSurface-Shader (Slice B) und
 * von der HeatmapColorbar-Legende geteilt, damit Flaeche und Legende garantiert dieselbe
 * Skala zeigen.
 */
import type { ContinuousScale } from './overlayContract'

/** RGBA, jede Komponente 0..1. */
export type Rgba = [number, number, number, number]

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

// Viridis-Stuetzpunkte (perzeptuell uniform, Standard-Anker). Zwischen ihnen linear interpoliert.
const VIRIDIS: readonly [number, number, number][] = [
  [0.267, 0.005, 0.329],
  [0.283, 0.141, 0.458],
  [0.254, 0.265, 0.530],
  [0.207, 0.372, 0.553],
  [0.164, 0.471, 0.558],
  [0.128, 0.567, 0.551],
  [0.135, 0.659, 0.518],
  [0.267, 0.749, 0.441],
  [0.478, 0.821, 0.318],
  [0.741, 0.873, 0.150],
  [0.993, 0.906, 0.144],
]

function viridis(u: number): [number, number, number] {
  const x = clamp01(u) * (VIRIDIS.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = VIRIDIS[i]
  const b = VIRIDIS[Math.min(i + 1, VIRIDIS.length - 1)]
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]
}

/** Liefert die reine Colormap-Farbe (RGB 0..1) fuer eine normierte Position u in [0,1]. */
export function colormapRgb(colormap: ContinuousScale['colormap'], u: number): [number, number, number] {
  const t = clamp01(u)
  switch (colormap) {
    case 'grayscale':
      return [t, t, t]
    case 'hot':
      // schwarz -> rot -> gelb -> weiss
      return [clamp01(t * 3), clamp01(t * 3 - 1), clamp01(t * 3 - 2)]
    case 'diverging': {
      // blau -> weiss -> rot, durch Weiss in der Mitte
      const blue: [number, number, number] = [0.23, 0.30, 0.75]
      const white: [number, number, number] = [0.96, 0.96, 0.96]
      const red: [number, number, number] = [0.71, 0.09, 0.15]
      if (t < 0.5) {
        const f = t / 0.5
        return [lerp(blue[0], white[0], f), lerp(blue[1], white[1], f), lerp(blue[2], white[2], f)]
      }
      const f = (t - 0.5) / 0.5
      return [lerp(white[0], red[0], f), lerp(white[1], red[1], f), lerp(white[2], red[2], f)]
    }
    case 'viridis':
    default:
      return viridis(t)
  }
}

/**
 * Mappt einen Messwert auf RGBA gemaess Skala. Werte unterhalb des Thresholds (Betrag)
 * sind No-Data (alpha 0). `clamp` klemmt Werte ausserhalb [min,max] an die Skalenenden.
 */
export function applyColormap(value: number, scale: ContinuousScale): Rgba {
  if (scale.threshold !== undefined && Math.abs(value) < scale.threshold) {
    return [0, 0, 0, 0]
  }
  let t = (value - scale.min) / (scale.max - scale.min)
  if (scale.clamp) t = clamp01(t)
  const [r, g, b] = colormapRgb(scale.colormap, t)
  return [r, g, b, 1]
}

/** CSS-rgb()-String aus normierten 0..1-Komponenten. */
export function rgbToCss([r, g, b]: [number, number, number]): string {
  const to255 = (x: number): number => Math.round(clamp01(x) * 255)
  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`
}
