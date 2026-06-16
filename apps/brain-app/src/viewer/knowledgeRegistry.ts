import { BONUS_CONTEXTS, type BonusContext } from './bonusContexts'

export const KNOWLEDGE_REGISTRY_SCHEMA_VERSION = 1

export type KnowledgeCollectionKind = 'base-ontology' | 'atlas' | 'object-set' | 'case-study' | 'device'
export type KnowledgeAssetFormat = 'glb' | 'gltf'
export type KnowledgeCollectionCapability =
  | 'tree'
  | 'load-3d-asset'
  | 'transform-gizmo'
  | 'positionable'
  | 'pickable-parts'
  | 'animatable'
  | 'sequence-state'

export interface KnowledgeAssetSlot {
  id: string
  label: string
  formats: KnowledgeAssetFormat[]
  optional: boolean
}

export interface KnowledgeCollection {
  id: string
  kind: KnowledgeCollectionKind
  label: string
  /** Aktuelle Explorer-Baum-Wurzel, falls diese Collection direkt im Strukturbaum sichtbar ist. */
  treeId?: string
  /** Aktueller sichtbarer Leaf-Count; Runtime kann spaeter aus dem Baum nachzaehlen. */
  count?: number
  visibleInExplorerTree: boolean
  capabilities: KnowledgeCollectionCapability[]
  assetSlots?: KnowledgeAssetSlot[]
  descriptionDe: string
}

export const KNOWLEDGE_COLLECTIONS: KnowledgeCollection[] = [
  {
    id: 'taro',
    kind: 'base-ontology',
    label: 'TARO',
    treeId: 'taro',
    count: 600,
    visibleInExplorerTree: true,
    capabilities: ['tree', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'Basis-Ontologie und TARO-Strukturbaum.',
  },
  {
    id: 'julich',
    kind: 'atlas',
    label: 'Jülich',
    treeId: 'julich',
    count: 292,
    visibleInExplorerTree: true,
    capabilities: ['tree', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'Jülich-Brain-Arealbaum als erweiterbare Atlas-Collection.',
  },
  {
    id: 'dkt',
    kind: 'atlas',
    label: 'DKT',
    treeId: 'dkt',
    count: 68,
    visibleInExplorerTree: true,
    capabilities: ['tree', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'DKT-Atlas-Collection.',
  },
  {
    id: 'brodmann',
    kind: 'atlas',
    label: 'Brodmann',
    treeId: 'brodmann',
    count: 80,
    visibleInExplorerTree: true,
    capabilities: ['tree', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'Brodmann-Atlas-Collection.',
  },
  {
    id: 'destrieux',
    kind: 'atlas',
    label: 'Destrieux',
    treeId: 'destrieux',
    count: 148,
    visibleInExplorerTree: true,
    capabilities: ['tree', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'Destrieux-Atlas-Collection.',
  },
  {
    id: 'context-full',
    kind: 'object-set',
    label: 'Kontext (Vollausbau)',
    treeId: 'context',
    count: 333,
    visibleInExplorerTree: true,
    capabilities: ['tree', 'load-3d-asset', 'positionable', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'Kontext-Objekte wie Schädel, Gefäße, Nerven und weitere BodyParts3D-Strukturen.',
  },
  {
    id: 'case-phineas-gage',
    kind: 'case-study',
    label: 'Phineas Gage',
    visibleInExplorerTree: false,
    capabilities: ['load-3d-asset', 'transform-gizmo', 'positionable', 'pickable-parts', 'animatable', 'sequence-state'],
    descriptionDe: 'Fallstudie als erweiterbare Collection statt Pflicht-Vortragsschritt.',
  },
  {
    id: 'device-eeg-10-20',
    kind: 'device',
    label: 'EEG 10-20',
    visibleInExplorerTree: false,
    capabilities: ['load-3d-asset', 'transform-gizmo', 'positionable', 'pickable-parts', 'animatable', 'sequence-state'],
    assetSlots: [
      {
        id: 'eeg-device-model',
        label: 'EEG-Device-Modell',
        formats: ['glb', 'gltf'],
        optional: true,
      },
    ],
    descriptionDe: 'EEG-Elektroden- und ERP-Kontext für VCPT/P3a und spätere Devices.',
  },
]

const collectionsById = new Map(KNOWLEDGE_COLLECTIONS.map((collection) => [collection.id, collection]))

export function topLevelKnowledgeCollections(): KnowledgeCollection[] {
  return KNOWLEDGE_COLLECTIONS.filter((collection) => collection.visibleInExplorerTree)
}

export function knowledgeCollectionById(id: string): KnowledgeCollection | null {
  return collectionsById.get(id) ?? null
}

export function collectionsWithCapability(capability: KnowledgeCollectionCapability): KnowledgeCollection[] {
  return KNOWLEDGE_COLLECTIONS.filter((collection) => collection.capabilities.includes(capability))
}

export function bonusContextsForCollection(collectionId: string): BonusContext[] {
  return BONUS_CONTEXTS.filter((context) => context.collectionIds.includes(collectionId))
}

export function validateKnowledgeRegistry(): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  for (const collection of KNOWLEDGE_COLLECTIONS) {
    if (seen.has(collection.id)) errors.push(`Doppelte Collection-ID: ${collection.id}`)
    seen.add(collection.id)
  }
  for (const context of BONUS_CONTEXTS) {
    for (const collectionId of context.collectionIds) {
      if (!collectionsById.has(collectionId)) {
        errors.push(`Bonus-Kontext ${context.id} referenziert unbekannte Collection ${collectionId}`)
      }
    }
  }
  return errors
}
