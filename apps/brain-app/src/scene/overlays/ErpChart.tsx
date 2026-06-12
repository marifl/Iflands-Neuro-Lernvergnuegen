import { useEffect } from 'react'
import type { Scene } from '../types'
import { toPolyline, type Point } from './erpGeometry'
import { useViewerStore } from '../../viewer/viewerStore'
import { ERP_PERIOD_MS, envelope } from '../../viewer/erpAnimation'

interface Series {
  label: string
  points: Point[]
  color?: string
}
const BOX = { w: 320, h: 140 }

/** y-Wert der skalierten Polylinie an x (lineare Interpolation) — fuer den Cursor-Punkt. */
function polylineYAt(poly: [number, number][], x: number): number {
  if (poly.length === 0) return BOX.h / 2
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, ay] = poly[i]
    const [bx, by] = poly[i + 1]
    if (x >= ax && x <= bx) {
      const f = bx === ax ? 0 : (x - ax) / (bx - ax)
      return ay + f * (by - ay)
    }
  }
  return poly[poly.length - 1][1]
}

export default function ErpChart({ scene }: { scene: Scene }) {
  const data = scene.overlay.data as
    | { x?: string; series?: Series[]; markers?: string[]; source?: string; site?: string }
    | undefined
  if (!data?.series?.length) throw new Error(`ErpChart: scene ${scene.id} hat keine overlay.data.series`)
  // Topografie ist szenenspezifisch (Quelle + Ableitort) — kein stiller ACC/Cz-Default.
  if (!data.source || !data.site) {
    throw new Error(`ErpChart: scene ${scene.id} braucht overlay.data.source + overlay.data.site (z.B. "Cz"/"Pz")`)
  }
  // Hotspot-Lage im Kopf-Schema: Cz fronto-zentral (oberhalb Mitte), Pz parieto-okzipital (unterhalb).
  const isPz = data.site === 'Pz'
  const hotspotCy = isPz ? 42 : 24
  const siteRegion = isPz ? 'parieto-okzipital' : 'fronto-zentral'

  const erpPhase = useViewerStore((s) => s.erpPhase)
  const erpPulse = useViewerStore((s) => s.erpPulse)
  const setErpActive = useViewerStore((s) => s.setErpActive)
  const setErpClock = useViewerStore((s) => s.setErpClock)

  // Erste Serie (No-go) treibt die Quellen-Huellkurve. rAF-Uhr setzt Phase + Puls in den Store;
  // Cursor (hier) und 3D-Quellen-Puls (SubParcels) lesen denselben Takt -> voll synchron.
  const sourcePoints = data.series[0].points
  useEffect(() => {
    setErpActive(true)
    let raf = 0
    const tick = (ts: number): void => {
      const t = (ts % ERP_PERIOD_MS) / ERP_PERIOD_MS
      setErpClock(t, envelope(sourcePoints, t))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      setErpActive(false)
    }
  }, [scene.id, sourcePoints, setErpActive, setErpClock])

  const cursorX = erpPhase * BOX.w
  const noGoPoly = toPolyline(sourcePoints, BOX)
  const cursorY = polylineYAt(noGoPoly, cursorX)

  return (
    <div>
      <svg viewBox={`0 0 ${BOX.w} ${BOX.h}`} width="100%" role="img" aria-label={`ERP ${scene.title}`}>
        <line x1="0" y1={BOX.h / 2} x2={BOX.w} y2={BOX.h / 2} stroke="var(--line-soft)" />
        {data.series.map((s, i) => (
          <polyline
            key={i}
            fill="none"
            strokeWidth={2}
            stroke={s.color ?? (i === 0 ? '#c0392b' : '#2e7d32')}
            points={toPolyline(s.points, BOX)
              .map((p) => p.join(','))
              .join(' ')}
          />
        ))}
        {/* Zeit-Cursor: laeuft synchron zum 3D-Quellen-Puls ueber die Kurve. */}
        <line x1={cursorX} y1="0" x2={cursorX} y2={BOX.h} stroke="var(--orange)" strokeWidth={1} opacity={0.7} />
        <circle cx={cursorX} cy={cursorY} r={3.5} fill="var(--orange)" />
      </svg>

      {/* Topografie: fronto-zentraler Hotspot (Cz), Intensitaet = Quellen-Aktivierung. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <svg viewBox="0 0 60 60" width="48" height="48" role="img" aria-label="ERP-Topografie">
          <circle cx="30" cy="32" r="24" fill="none" stroke="var(--line-soft)" strokeWidth="1.5" />
          <path d="M30 6 l-4 6 l8 0 z" fill="var(--line-soft)" />
          {/* Hotspot am szenenspezifischen Ableitort (Cz/Pz): Opacity folgt dem Puls. */}
          <circle cx="30" cy={hotspotCy} r="13" fill={data.series[0].color ?? '#c0392b'} opacity={0.15 + 0.7 * erpPulse} />
        </svg>
        <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 9, color: 'var(--g500)', lineHeight: 1.5 }}>
          <div>Topografie {siteRegion} ({data.site})</div>
          <div>Quelle: {data.source} leuchtet am Maximum</div>
        </div>
      </div>

      <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--g500)', marginTop: 6 }}>
        {data.series.map((s) => s.label).join(' · ')}
        {data.markers?.length ? ` — ${data.markers.join(', ')}` : ''}
      </div>
      <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 9, color: 'var(--g500)', marginTop: 4 }}>
        schematisch nach Müller et al. 2011 (keine Rohmesswerte)
      </div>
    </div>
  )
}
