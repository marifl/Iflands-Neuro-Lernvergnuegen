import { useState } from 'react'
import type { AtlasCatalog, AtlasNode, GroupNode } from './atlasCatalog'
import {
  groupEnabledState, scopeKeyForArea, scopeKeyForGroup, scopeKeyForAtlas, scopeKeyForAxis,
  type TriState,
} from './treeState'

interface Props {
  catalog: AtlasCatalog
  isAreaEnabled: (areaId: string) => boolean
  onToggleScope: (scopeKey: string) => void
  onPickArea: (areaId: string) => void
  activeAtlas: string
  onSelectAtlas: (atlasId: string) => void
  pickedAreaId: string | null
}

const TRI_GLYPH: Record<TriState, string> = { all: '✓', some: '–', none: ' ' }

/** Tri-State-Kaestchen, klickbar (zyklischer Toggle des Scope-Keys). */
function TriBox({ state, onClick }: { state: TriState; onClick: (e: React.MouseEvent) => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-block', width: 13, height: 13, lineHeight: '13px', textAlign: 'center',
        fontSize: 10, marginRight: 6, borderRadius: 2, cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.25)',
        background: state === 'all' ? 'var(--orange, #e0792b)' : state === 'some' ? 'rgba(224,121,43,0.4)' : 'transparent',
        color: state === 'none' ? 'transparent' : '#111',
      }}
    >
      {TRI_GLYPH[state]}
    </span>
  )
}

const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '2px 0', fontSize: 11 }

/** Hierarchischer Katalog-Browser = Settings-Menue. Zeigt effektiven On/Off (Tri-State), Toggle
 *  schreibt den Scope-Key (ueber onToggleScope -> Store), Areal-Klick selektiert (Highlight/Kamera). */
export function AtlasTreeBrowser({
  catalog, isAreaEnabled, onToggleScope, onPickArea, activeAtlas, onSelectAtlas, pickedAreaId,
}: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggleOpen = (k: string) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k); else n.add(k)
    return n
  })

  const areaIdsOfGroup = (g: GroupNode) => g.areas.map((a) => a.id)
  const areaIdsOfAtlas = (a: AtlasNode) => a.groups.flatMap(areaIdsOfGroup)
  const areaIdsOfAxis = (axisId: string) =>
    catalog.atlases.filter((a) => a.axis === axisId).flatMap(areaIdsOfAtlas)

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      {catalog.axes.map((axis) => {
        const axisAtlases = catalog.atlases.filter((a) => a.axis === axis.id)
        if (axisAtlases.length === 0) return null
        const axisKey = `axis:${axis.id}`
        const axisOpen = open.has(axisKey)
        return (
          <div key={axis.id} style={{ marginBottom: 6 }}>
            <div style={ROW}>
              <TriBox state={groupEnabledState(areaIdsOfAxis(axis.id), isAreaEnabled)}
                onClick={(e) => { e.stopPropagation(); onToggleScope(scopeKeyForAxis(axis.id)) }} />
              <span className="eyebrow" style={{ cursor: 'pointer' }} onClick={() => toggleOpen(axisKey)}>
                {axisOpen ? '▾' : '▸'} {axis.label_de}
              </span>
            </div>
            {axisOpen && axisAtlases.map((atlas) => {
              const atlasKey = `atlas:${atlas.id}`
              const atlasOpen = open.has(atlasKey)
              return (
                <div key={atlas.id} style={{ marginLeft: 12 }}>
                  <div style={ROW}>
                    <TriBox state={groupEnabledState(areaIdsOfAtlas(atlas), isAreaEnabled)}
                      onClick={(e) => { e.stopPropagation(); onToggleScope(scopeKeyForAtlas(atlas.id)) }} />
                    <span
                      onClick={() => { onSelectAtlas(atlas.id); toggleOpen(atlasKey) }}
                      style={{ cursor: 'pointer', fontWeight: activeAtlas === atlas.id ? 700 : 400,
                        color: activeAtlas === atlas.id ? 'var(--orange, #e0792b)' : undefined }}
                    >
                      {atlasOpen ? '▾' : '▸'} {atlas.label_de}
                    </span>
                  </div>
                  {atlasOpen && atlas.groups.map((g) => {
                    const gKey = `group:${atlas.id}:${g.id}`
                    const gOpen = open.has(gKey)
                    return (
                      <div key={g.id} style={{ marginLeft: 12 }}>
                        <div style={ROW}>
                          <TriBox state={groupEnabledState(areaIdsOfGroup(g), isAreaEnabled)}
                            onClick={(e) => { e.stopPropagation(); onToggleScope(scopeKeyForGroup(atlas.id, g.id)) }} />
                          <span style={{ cursor: 'pointer' }} onClick={() => toggleOpen(gKey)}>
                            {gOpen ? '▾' : '▸'} {g.label_de}
                          </span>
                        </div>
                        {gOpen && g.areas.map((area) => (
                          <div key={area.id} style={{ ...ROW, marginLeft: 12 }}>
                            <TriBox state={isAreaEnabled(area.id) ? 'all' : 'none'}
                              onClick={(e) => { e.stopPropagation(); onToggleScope(scopeKeyForArea(area.id)) }} />
                            <span
                              onClick={() => onPickArea(area.id)}
                              style={{ cursor: 'pointer', fontFamily: 'var(--ed-mono)', fontSize: 10,
                                color: pickedAreaId === area.id ? 'var(--orange, #e0792b)' : 'var(--muted, #aaa)' }}
                            >
                              {area.label_de}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
