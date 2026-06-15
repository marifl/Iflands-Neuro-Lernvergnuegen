import { useEffect } from 'react'
import type { OntologyNode } from './ontology'
import type { AppMode } from './viewerStore'

export interface ExplorerLearningTarget {
  sceneId?: string
  configName?: string
  mode: Extract<AppMode, 'learn' | 'phineas'>
  label: string
  actionLabel?: string
}

const LEARNING_TARGETS = {
  p3a: { sceneId: 'p3a-konfliktmonitoring', configName: 'p3a-konfliktmonitoring', mode: 'learn', label: 'P3a - Konfliktmonitoring' },
  p3b: { sceneId: 'p3b-engagement', configName: 'p3b-engagement', mode: 'learn', label: 'P3b - Engagement' },
  p3z: { sceneId: 'p3z-inhibition', configName: 'p3z-inhibition', mode: 'learn', label: 'P3z - Inhibition' },
  phineas: { mode: 'phineas', label: 'Phineas Gage - OFC/vmPFC', actionLabel: 'Phineas öffnen' },
  summary: { sceneId: 'zusammenfassung', configName: 'zusammenfassung', mode: 'learn', label: 'Zusammenfassung - exekutive Funktionen' },
} satisfies Record<string, ExplorerLearningTarget>

export function learningTargetForNode(node: OntologyNode | null): ExplorerLearningTarget | null {
  if (!node?.k11Role) return null
  const text = [
    node.id,
    node.k11Role,
    node.labels.de,
    node.labels.en,
    node.labels.la,
  ].join(' ').toLowerCase()
  if (/acc|cingul|konflikt/.test(text)) return LEARNING_TARGETS.p3a
  if (/ofc|vmpfc|orbitofrontal|ventromedial|phineas/.test(text)) return LEARNING_TARGETS.phineas
  if (/sma|pre-sma|inhibition/.test(text)) return LEARNING_TARGETS.p3z
  if (/parietal|engagement|aufmerksamkeit/.test(text)) return LEARNING_TARGETS.p3b
  return LEARNING_TARGETS.summary
}

interface ExplorerLearningFlyoutProps {
  node: OntologyNode
  target: ExplorerLearningTarget
  atlasAvailable: boolean
  onClose: () => void
  onOpenAtlas: () => void
  onOpenLearn: (target: ExplorerLearningTarget) => void
}

export default function ExplorerLearningFlyout({
  node,
  target,
  atlasAvailable,
  onClose,
  onOpenAtlas,
  onOpenLearn,
}: ExplorerLearningFlyoutProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="ed-panel ed-frame"
      role="dialog"
      aria-label={`Lernbezug ${node.labels.de}`}
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        zIndex: 15,
        width: 300,
        maxWidth: 'calc(100% - 32px)',
        padding: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">Lernbezug</div>
          <div style={{ marginTop: 5, fontFamily: 'var(--ed-display)', fontWeight: 700, fontSize: 16, lineHeight: 1.2, color: 'var(--ink)' }}>
            {node.labels.de}
          </div>
        </div>
        <button
          type="button"
          className="ed-btn"
          aria-label="Lern-Flyout schließen"
          onClick={onClose}
          style={{ flex: 'none', padding: '3px 8px' }}
        >
          X
        </button>
      </div>
      <div>
        <span className="ed-pill orange">{node.k11Role}</span>
      </div>
      <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 10.5, lineHeight: 1.5, color: 'var(--g700)' }}>
        {target.label}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="ed-btn" style={{ padding: '5px 10px' }} onClick={() => onOpenLearn(target)}>
          {target.actionLabel ?? 'Lernen öffnen'}
        </button>
        {atlasAvailable ? (
          <button type="button" className="ed-btn" style={{ padding: '5px 10px' }} onClick={onOpenAtlas}>
            Atlas öffnen
          </button>
        ) : null}
      </div>
    </div>
  )
}
