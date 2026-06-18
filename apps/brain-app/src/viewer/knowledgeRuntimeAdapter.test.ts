import { describe, expect, it } from 'vitest'
import { buildExplorerTreeRoots } from './knowledgeRuntimeAdapter'
import type { OntologyNode } from './ontology'

const labels = (value: string) => ({ de: value, la: value, en: value })

const tree = (id: string, label: string): OntologyNode => ({
  id,
  labels: labels(label),
  children: [
    { id: `${id}-leaf`, slug: `${id}-leaf`, fma: `${id}-leaf`, side: 'left', labels: labels(`${label} leaf`) },
  ],
})

describe('knowledgeRuntimeAdapter', () => {
  it('ordnet Explorer-Root-Baeume ueber die versionierte Registry statt ueber UI-Hardcodes', () => {
    const roots = buildExplorerTreeRoots({
      visibleTree: tree('brain', 'Brain'),
      mode: 'full',
      julich: null,
      atlas3d: {
        dkt: tree('dkt-runtime', 'DKT runtime'),
        brodmann: null,
        destrieux: tree('destrieux-runtime', 'Destrieux runtime'),
      },
      context: tree('context-runtime', 'Kontext runtime'),
    })

    expect(roots.map((root) => root.collectionId)).toEqual([
      'taro',
      'julich',
      'dkt',
      'brodmann',
      'destrieux',
      'context-full',
      'case-phineas-gage',
    ])
    expect(roots.map((root) => root.label)).toEqual([
      'TARO',
      'Jülich',
      'DKT',
      'Brodmann',
      'Destrieux',
      'Kontext (Vollausbau)',
      'Phineas Gage',
    ])
    expect(roots.map((root) => root.kind)).toEqual([
      'tree',
      'placeholder',
      'tree',
      'placeholder',
      'tree',
      'tree',
      'tree',
    ])
    expect(roots[0]).toMatchObject({
      kind: 'tree',
      treeId: 'taro',
      node: { id: 'taro', labels: labels('TARO') },
    })
    expect(roots[2]).toMatchObject({ kind: 'tree', treeId: 'dkt', node: { id: 'dkt' } })
    expect(roots[5]).toMatchObject({ kind: 'tree', treeId: 'context', node: { id: 'context' } })
    expect(roots[6]).toMatchObject({
      kind: 'tree',
      treeId: 'case-phineas-gage',
      node: {
        id: 'case-phineas-gage',
        children: [
          {
            id: 'target:asset-part:case-phineas-gage:phineas-gage-skull-base-01:skull-base',
            labels: labels('Gage-Schädelbasis'),
          },
          {
            id: 'target:asset-part:case-phineas-gage:phineas-gage-skull-calvaria-01:skull-calvaria',
            labels: labels('Gage-Calvaria'),
          },
          {
            id: 'target:asset-part:case-phineas-gage:phineas-gage-iron-rod-01:iron-rod',
            labels: labels('Gage-Eisenstange'),
          },
        ],
      },
    })
  })

  it('laesst Kapitel-11-Ansicht beim TARO-Baum und erzeugt keinen Kontext-Platzhalter', () => {
    const roots = buildExplorerTreeRoots({
      visibleTree: tree('brain', 'Brain'),
      mode: 'k11',
      julich: null,
      atlas3d: { dkt: null, brodmann: null, destrieux: null },
      context: null,
    })

    expect(roots.map((root) => root.collectionId)).toEqual(['taro'])
    expect(roots[0]).toMatchObject({ kind: 'tree', label: 'TARO' })
  })
})
