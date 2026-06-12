import type { Scene } from '../types'
import { toPolyline, type Point } from './erpGeometry'

interface Series {
  label: string
  points: Point[]
  color?: string
}
const BOX = { w: 320, h: 140 }

export default function ErpChart({ scene }: { scene: Scene }) {
  const data = scene.overlay.data as { x?: string; series?: Series[]; markers?: string[] } | undefined
  if (!data?.series?.length) throw new Error(`ErpChart: scene ${scene.id} hat keine overlay.data.series`)
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
      </svg>
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
