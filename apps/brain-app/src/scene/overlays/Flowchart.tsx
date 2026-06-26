import type { Scene } from '../types'
import IcaSeparation, { type IcaSeparationNode } from './IcaSeparation'
import VcptSequence, { type VcptStimulus } from './VcptSequence'

interface FlowNode extends IcaSeparationNode {
  id: string
  label: string
  result: string
}

interface FlowchartData {
  mode?: string
  nodes?: FlowNode[]
  stimuli?: VcptStimulus[]
  evidence?: string
  heading?: string
}

export default function Flowchart({ scene }: { scene: Scene }) {
  const data = scene.overlay.data as FlowchartData | undefined
  if (data?.mode === 'vcpt-sequence') {
    if (!data.stimuli?.length) throw new Error(`Flowchart: scene ${scene.id} hat keine overlay.data.stimuli`)
    return <VcptSequence stimuli={data.stimuli} evidence={data.evidence} />
  }
  if (!data?.nodes?.length) throw new Error(`Flowchart: scene ${scene.id} hat keine overlay.data.nodes`)
  if (data.mode === 'ica-separation') return <IcaSeparation nodes={data.nodes} evidence={data.evidence} />
  const heading = data.heading?.trim()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {heading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0 8px', borderBottom: '2px solid var(--orange)' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--ed-display)', fontSize: 'var(--fs-xl)', lineHeight: 1.15, fontWeight: 800, color: 'var(--ink)' }}>
            {heading}
          </h3>
        </div>
      ) : null}
      {data.nodes.map((n) => (
        <div
          key={n.id}
          className="ed-frame"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 0.72fr) minmax(0, 1.8fr)',
            gap: 14,
            alignItems: 'start',
            padding: '8px 12px',
          }}
        >
          <span style={{ fontFamily: 'var(--ed-mono)', fontWeight: 700, color: 'var(--ink)', minWidth: 0, overflowWrap: 'anywhere' }}>{n.label}</span>
          <span style={{ fontFamily: 'var(--ed-display)', color: 'var(--g800)', minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}>{n.result}</span>
        </div>
      ))}
    </div>
  )
}
