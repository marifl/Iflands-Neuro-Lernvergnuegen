import type { Scene } from '../types'
import IcaSeparation, { type IcaSeparationNode } from './IcaSeparation'

interface FlowNode extends IcaSeparationNode {
  id: string
  label: string
  result: string
}

export default function Flowchart({ scene }: { scene: Scene }) {
  const data = scene.overlay.data as { mode?: string; nodes?: FlowNode[]; evidence?: string } | undefined
  if (!data?.nodes?.length) throw new Error(`Flowchart: scene ${scene.id} hat keine overlay.data.nodes`)
  if (data.mode === 'ica-separation') return <IcaSeparation nodes={data.nodes} evidence={data.evidence} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.nodes.map((n) => (
        <div key={n.id} className="ed-frame" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px' }}>
          <span style={{ fontFamily: 'var(--ed-mono)', fontWeight: 700, color: 'var(--ink)' }}>{n.label}</span>
          <span style={{ fontFamily: 'var(--ed-display)', color: 'var(--g800)' }}>{n.result}</span>
        </div>
      ))}
    </div>
  )
}
