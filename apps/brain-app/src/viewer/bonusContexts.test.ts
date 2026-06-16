import { describe, expect, it } from 'vitest'
import type { OntologyNode } from './ontology'
import {
  BONUS_CONTEXTS,
  bonusContextIdsForNode,
  bonusContextsForTarget,
  resolveBonusContextIds,
} from './bonusContexts'

const ofcNode: OntologyNode = {
  id: 'left-medial-orbital-gyrus',
  fma: 'left-medial-orbital-gyrus',
  labels: {
    de: 'Gyrus orbitalis medialis links',
    la: 'Gyrus orbitalis medialis sinister',
    en: 'Left medial orbital gyrus',
  },
  k11Role: 'VMPFC / OFC',
}

describe('bonusContexts', () => {
  it('heftet Phineas als Bonus-Kontext an OFC/vmPFC-Knoten', () => {
    const ids = bonusContextIdsForNode(ofcNode)

    expect(ids).toContain('phineas-gage')
    expect(resolveBonusContextIds(ids).find((context) => context.id === 'phineas-gage')).toMatchObject({
      kind: 'case-study',
      title: 'Phineas Gage (OFC/vmPFC)',
    })
  })

  it('stellt EEG/ERP-Kontexte ueber Scene und Elektroden-Ziele bereit', () => {
    expect(bonusContextsForTarget({ kind: 'scene', id: 'p3a-konfliktmonitoring' }).map((context) => context.id)).toContain(
      'eeg-erp-p3a-konfliktmonitoring',
    )
    expect(bonusContextsForTarget({ kind: 'eeg-site', id: 'Cz' }).map((context) => context.id)).toContain(
      'eeg-erp-p3a-konfliktmonitoring',
    )
  })

  it('ignoriert unbekannte Kontext-IDs beim Aufloesen fuer robuste Snapshots', () => {
    expect(resolveBonusContextIds(['phineas-gage', 'fehlt']).map((context) => context.id)).toEqual(['phineas-gage'])
  })

  it('haelt die initiale Registry klein und explizit', () => {
    expect(BONUS_CONTEXTS.map((context) => context.id)).toEqual([
      'phineas-gage',
      'eeg-erp-vcpt',
      'eeg-erp-p3a-konfliktmonitoring',
    ])
  })
})
