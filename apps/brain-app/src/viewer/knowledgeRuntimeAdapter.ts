import {
  topLevelKnowledgeCollections,
  type KnowledgeCollection,
} from './knowledgeRegistry'
import type { Lang, OntologyNode } from './ontology'
import type { ViewMode } from './viewerStore'

export interface ExplorerTreeRootSource {
  visibleTree: OntologyNode
  mode: ViewMode
  julich: OntologyNode | null
  atlas3d: {
    dkt: OntologyNode | null
    brodmann: OntologyNode | null
    destrieux: OntologyNode | null
  }
  context: OntologyNode | null
}

export interface ExplorerTreeNodeRoot {
  kind: 'tree'
  collectionId: string
  treeId: string
  label: string
  node: OntologyNode
}

export interface ExplorerTreePlaceholderRoot {
  kind: 'placeholder'
  collectionId: string
  treeId: string
  label: string
}

export type ExplorerTreeRoot = ExplorerTreeNodeRoot | ExplorerTreePlaceholderRoot

const ATLAS_TREE_IDS = new Set(['julich', 'dkt', 'brodmann', 'destrieux'])

function labelsForRoot(label: string, runtimeLabels?: Record<Lang, string>): Record<Lang, string> {
  return {
    de: label,
    la: runtimeLabels?.la ?? label,
    en: runtimeLabels?.en ?? label,
  }
}

function normalizedRootNode(collection: KnowledgeCollection, node: OntologyNode): OntologyNode | null {
  if (!collection.treeId) return null
  return {
    ...node,
    id: collection.treeId,
    labels: labelsForRoot(collection.label, node.labels),
  }
}

function runtimeNodeForCollection(collection: KnowledgeCollection, source: ExplorerTreeRootSource): OntologyNode | null {
  switch (collection.treeId) {
    case 'taro':
      return {
        id: 'taro',
        labels: labelsForRoot(collection.label),
        children: source.visibleTree.children ?? [],
      }
    case 'julich':
      return source.julich
    case 'dkt':
      return source.atlas3d.dkt
    case 'brodmann':
      return source.atlas3d.brodmann
    case 'destrieux':
      return source.atlas3d.destrieux
    case 'context':
      return source.context
    default:
      return null
  }
}

function shouldShowPlaceholder(collection: KnowledgeCollection): boolean {
  return collection.treeId ? ATLAS_TREE_IDS.has(collection.treeId) : false
}

export function buildExplorerTreeRoots(source: ExplorerTreeRootSource): ExplorerTreeRoot[] {
  const roots: ExplorerTreeRoot[] = []
  for (const collection of topLevelKnowledgeCollections()) {
    if (!collection.treeId) continue
    if (source.mode !== 'full' && collection.treeId !== 'taro') continue

    const runtimeNode = runtimeNodeForCollection(collection, source)
    const node = runtimeNode ? normalizedRootNode(collection, runtimeNode) : null
    if (node) {
      roots.push({
        kind: 'tree',
        collectionId: collection.id,
        treeId: collection.treeId,
        label: collection.label,
        node,
      })
      continue
    }

    if (shouldShowPlaceholder(collection)) {
      roots.push({
        kind: 'placeholder',
        collectionId: collection.id,
        treeId: collection.treeId,
        label: collection.label,
      })
    }
  }
  return roots
}
