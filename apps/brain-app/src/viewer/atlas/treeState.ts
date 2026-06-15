// Reine Tree-Aggregat-Logik: Tri-State pro Gruppen/Atlas/Achsen-Knoten + Scope-Key-Bau.
// Konsumiert von AtlasTreeBrowser; keine React-/Katalog-Abhaengigkeit.

export type TriState = 'all' | 'some' | 'none'

/** Aggregiert den On/Off-Zustand der enthaltenen Areale zu all/some/none. */
export function groupEnabledState(areaIds: string[], isEnabled: (id: string) => boolean): TriState {
  if (areaIds.length === 0) return 'none'
  let on = 0
  for (const id of areaIds) if (isEnabled(id)) on++
  if (on === 0) return 'none'
  if (on === areaIds.length) return 'all'
  return 'some'
}

export function scopeKeyForArea(areaId: string): string { return `area:${areaId}` }
export function scopeKeyForGroup(atlas: string, lobe: string): string { return `group:${atlas}:${lobe}` }
export function scopeKeyForAtlas(atlas: string): string { return `atlas:${atlas}` }
export function scopeKeyForAxis(axis: string): string { return `axis:${axis}` }
