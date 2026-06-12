/**
 * Zeit-Modell der EEG/ERP-Animation. Die ERP-Kurve (z.B. No-go-P3a) ist zugleich die
 * Aktivierungs-Huellkurve der intrakortikalen Quelle: laeuft der Zeit-Cursor ueber die
 * Kurve, leuchtet die 3D-Quelle (ACC bei P3a) synchron am Kurven-Maximum am hellsten.
 * Das macht den didaktischen Punkt sichtbar: die Quelle erzeugt die Komponente.
 */

export type Point = [number, number] // [x (ms-Index), Amplitude]

/** Dauer eines Animations-Durchlaufs (Cursor von Anfang bis Ende der Kurve). */
export const ERP_PERIOD_MS = 2600

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** Amplitude der Kurve bei normalisierter Zeit t (0..1), linear interpoliert. */
export function sampleCurve(points: Point[], t01: number): number {
  if (points.length === 0) throw new Error('sampleCurve: keine Punkte')
  const xs = points.map((p) => p[0])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const x = x0 + clamp01(t01) * (x1 - x0)
  let a = points[0]
  let b = points[points.length - 1]
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i][0] && x <= points[i + 1][0]) {
      a = points[i]
      b = points[i + 1]
      break
    }
  }
  const span = b[0] - a[0]
  const f = span === 0 ? 0 : (x - a[0]) / span
  return a[1] + f * (b[1] - a[1])
}

/**
 * Quellen-Aktivierung (0..1) bei Zeit t: positive Amplitude der Kurve, normalisiert aufs
 * Kurven-Maximum. Negative Auslenkungen = keine Quellen-Aktivierung (auf 0 geklemmt).
 */
export function envelope(points: Point[], t01: number): number {
  const maxPos = Math.max(...points.map((p) => p[1]), 0.0001)
  return clamp01(Math.max(0, sampleCurve(points, t01)) / maxPos)
}
