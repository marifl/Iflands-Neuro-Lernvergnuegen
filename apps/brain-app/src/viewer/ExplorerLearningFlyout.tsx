import { useEffect } from 'react'
import { bonusContextIdsForNode, resolveBonusContextIds, type BonusContext } from './bonusContexts'
import type { OntologyNode } from './ontology'
import { resolveRegistryLaunch, type RegistryLaunch } from './registryLaunch'

export interface ExplorerLearningTarget {
  mode: 'case-study'
  label: string
  actionLabel: string
  bonusContextId?: string
  launch?: RegistryLaunch
}

function launchForContext(context: BonusContext): RegistryLaunch | undefined {
  const collectionId = context.collectionIds[0]
  return collectionId ? resolveRegistryLaunch({ collectionId, contextId: context.id }) : undefined
}

export function learningTargetForNode(node: OntologyNode | null): ExplorerLearningTarget | null {
  if (!node?.k11Role) return null
  const bonusContexts = resolveBonusContextIds(bonusContextIdsForNode(node))
  const phineasContext = bonusContexts.find((context) => context.id === 'phineas-gage')
  if (phineasContext) {
    return {
      mode: 'case-study',
      label: `Bonus-Kontext: ${phineasContext.title}`,
      actionLabel: 'Bonus-Kontext öffnen',
      bonusContextId: phineasContext.id,
      launch: launchForContext(phineasContext),
    }
  }
  return null
}

interface ExplorerLearningFlyoutProps {
  node: OntologyNode
  target: ExplorerLearningTarget
  atlasAvailable: boolean
  compact?: boolean
  onClose: () => void
  onOpenAtlas: () => void
  onOpenTarget: (target: ExplorerLearningTarget) => void
}

export default function ExplorerLearningFlyout({
  node,
  target,
  atlasAvailable,
  compact = false,
  onClose,
  onOpenAtlas,
  onOpenTarget,
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
      aria-label={`Bonus-Kontext ${node.labels.de}`}
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
          <div className="eyebrow">Bonus-Kontext</div>
          {!compact ? (
            <div style={{ marginTop: 5, fontFamily: 'var(--ed-display)', fontWeight: 700, fontSize: 16, lineHeight: 1.2, color: 'var(--ink)' }}>
              {node.labels.de}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="ed-btn"
          aria-label="Bonus-Kontext schließen"
          onClick={onClose}
          style={{ flex: 'none', padding: '3px 8px' }}
        >
          X
        </button>
      </div>
      {!compact ? (
        <div>
          <span className="ed-pill orange">{node.k11Role}</span>
        </div>
      ) : null}
      <div style={{ fontFamily: 'var(--ed-mono)', fontSize: 10.5, lineHeight: 1.5, color: 'var(--g700)' }}>
        {target.label}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="ed-btn" style={{ padding: '5px 10px' }} onClick={() => onOpenTarget(target)}>
          {target.actionLabel}
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
