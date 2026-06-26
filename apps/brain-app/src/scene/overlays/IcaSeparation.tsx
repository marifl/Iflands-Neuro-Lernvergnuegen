import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

export interface IcaSeparationNode {
  id: string
  label: string
  result: string
  color?: string
  site?: string
  source?: string
}

interface IcaSeparationProps {
  nodes: IcaSeparationNode[]
  evidence?: string
}

const PERIOD_MS = 3600
const SAMPLE_COUNT = 42
const CURVE_WIDTH = 128
const MIXED_Y = 35
const COMPONENT_START_Y = 86
const COMPONENT_GAP_Y = 45
const COMPONENT_X = 178
const MIXED_X = 12
const DEFAULT_COLORS = ['var(--viz-nogo)', 'var(--viz-novelty)', 'var(--viz-tertiary)']

function componentColor(node: IcaSeparationNode, index: number): string {
  return node.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

function waveValue(nodeId: string, index: number, phase: number): number {
  const x = index / (SAMPLE_COUNT - 1)
  const base = Math.sin((x * 2.2 + phase) * Math.PI * 2)
  const slow = Math.sin((x * 0.9 + phase * 0.62 + nodeId.length * 0.07) * Math.PI * 2)
  const p3Envelope = Math.exp(-Math.pow((x - 0.62) / 0.16, 2))
  const polarity = nodeId === 'p3b' ? 0.55 : nodeId === 'p3z' ? 0.78 : 1
  return base * 0.2 + slow * 0.18 + p3Envelope * polarity
}

export function icaWavePath(nodes: IcaSeparationNode[], mode: 'mixed' | 'component', phase: number, componentIndex = 0): string {
  if (nodes.length === 0) return ''
  const yBase = mode === 'mixed' ? MIXED_Y : COMPONENT_START_Y + componentIndex * COMPONENT_GAP_Y
  const xBase = mode === 'mixed' ? MIXED_X : COMPONENT_X
  const points = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const x = xBase + (index / (SAMPLE_COUNT - 1)) * CURVE_WIDTH
    const value = mode === 'mixed'
      ? nodes.reduce((sum, node) => sum + waveValue(node.id, index, phase), 0) / nodes.length
      : waveValue(nodes[componentIndex]?.id ?? nodes[0].id, index, phase)
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(yBase - value * 14).toFixed(1)}`
  })
  return points.join(' ')
}

function frameProgress(timestamp: number): number {
  return (timestamp % PERIOD_MS) / PERIOD_MS
}

export default function IcaSeparation({ nodes, evidence = 'Schematisch/didaktisch; keine Rohmesswerte' }: IcaSeparationProps) {
  const [playing, setPlaying] = useState(true)
  const [phase, setPhase] = useState(0)
  const mixedPath = useMemo(() => icaWavePath(nodes, 'mixed', phase), [nodes, phase])
  const cursorX = MIXED_X + phase * (COMPONENT_X + CURVE_WIDTH - MIXED_X)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16)
    const cancel = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : window.clearTimeout
    const tick = (timestamp: number): void => {
      setPhase(frameProgress(timestamp))
      frame = raf(tick)
    }
    frame = raf(tick)
    return () => cancel(frame)
  }, [playing])

  if (nodes.length === 0) throw new Error('IcaSeparation: keine Komponenten')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <svg viewBox="0 0 330 230" width="100%" role="img" aria-label="ICA-Komponententrennung">
        <text x="12" y="13" fontSize="8" fill="var(--g600)" fontFamily="var(--ed-mono)">Gemischtes VCPT-ERP</text>
        <text x="178" y="13" fontSize="8" fill="var(--g600)" fontFamily="var(--ed-mono)">ICA-Komponenten</text>
        <path d={mixedPath} fill="none" stroke="var(--line)" strokeWidth="2.3" />
        <path d="M149 35 C161 35 162 72 171 72" fill="none" stroke="var(--line-soft)" strokeWidth="1.4" />
        <path d="M149 35 C161 35 162 117 171 117" fill="none" stroke="var(--line-soft)" strokeWidth="1.4" />
        <path d="M149 35 C161 35 162 162 171 162" fill="none" stroke="var(--line-soft)" strokeWidth="1.4" />
        <line x1={cursorX} y1="22" x2={cursorX} y2="185" stroke="var(--orange)" strokeWidth="1.1" opacity="0.75" />
        <circle cx={cursorX} cy="35" r="3" fill="var(--orange)" />
        {nodes.map((node, index) => {
          const y = COMPONENT_START_Y + index * COMPONENT_GAP_Y
          const path = icaWavePath(nodes, 'component', phase, index)
          const color = componentColor(node, index)
          return (
            <g key={node.id}>
              <path d={path} fill="none" stroke={color} strokeWidth="2.1" />
              <circle cx="171" cy={y} r="3.4" fill={color} />
              <text x="178" y={y - 18} fontSize="8.5" fontWeight="700" fill="var(--ink)" fontFamily="var(--ed-mono)">{node.label}</text>
              <text x="178" y={y - 7} fontSize="8" fill="var(--g700)" fontFamily="var(--ed-display)">{node.result}</text>
              <text x="178" y={y + 22} fontSize="7.4" fill="var(--g500)" fontFamily="var(--ed-mono)">
                {node.site ? `${node.site} · ` : ''}{node.source ?? 'Quelle schematisch'}
              </text>
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <button
          type="button"
          className={playing ? 'ed-btn active' : 'ed-btn'}
          aria-label={playing ? 'ICA-Animation pausieren' : 'ICA-Animation abspielen'}
          title={playing ? 'ICA-Animation pausieren' : 'ICA-Animation abspielen'}
          onClick={() => setPlaying((value) => !value)}
          style={{ width: 34, height: 28, padding: 0, display: 'grid', placeItems: 'center' }}
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="ed-btn"
          aria-label="ICA-Animation zurücksetzen"
          title="ICA-Animation zurücksetzen"
          onClick={() => {
            setPhase(0)
            setPlaying(false)
          }}
          style={{ width: 34, height: 28, padding: 0, display: 'grid', placeItems: 'center' }}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        <span className="mono-xs" style={{ color: 'var(--g500)', lineHeight: 1.45 }}>
          {evidence}
        </span>
      </div>
    </div>
  )
}
