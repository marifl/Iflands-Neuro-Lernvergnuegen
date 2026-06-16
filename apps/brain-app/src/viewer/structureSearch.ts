import type { OntologyNode } from './ontology'

function canonicalSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizedSearchForms(value: string): string[] {
  const lower = value.trim().toLowerCase()
  if (!lower) return []
  const transliterated = lower
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
  return [...new Set([lower, transliterated].map(canonicalSearchText).filter(Boolean))]
}

function nodeSearchValues(node: OntologyNode): string[] {
  return [
    ...Object.values(node.labels),
    node.id,
    node.slug,
    node.fma,
    node.k11Role,
    ...(node.searchAliases ?? []),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

export function matchesStructureSearch(node: OntologyNode, query: string): boolean {
  const queryForms = normalizedSearchForms(query)
  if (!queryForms.length) return false
  return nodeSearchValues(node).some((value) => {
    const valueForms = normalizedSearchForms(value)
    return queryForms.some((queryForm) => valueForms.some((valueForm) => valueForm.includes(queryForm)))
  })
}

export function filterStructureSearch(nodes: OntologyNode[], query: string): OntologyNode[] {
  return nodes.filter((node) => matchesStructureSearch(node, query))
}
