import { useEffect, useMemo, useRef } from 'react'
import {
  filterK11,
  flattenStructures,
  isStructure,
  type OntologyNode,
} from './ontology'
import { useViewerStore } from './viewerStore'
import { filterStructureSearch } from './structureSearch'
import { useIsNarrow, useIsTouchLandscape } from '../useMediaQuery'
import { buildExplorerTreeRoots, type ExplorerTreeRoot } from './knowledgeRuntimeAdapter'
import { responsiveShellMode, sidePanelBorder, sidePanelFlex, sidePanelWidth } from './explorerShellLayout'

const ACCENT = 'var(--orange)'

/** Isolations-Schalter: fokussiert diesen Knoten (er + Kinder aktiv, Rest transparent). */
function IsoToggle({ id }: { id: string }) {
  const isolated = useViewerStore((s) => s.isolated)
  const setIsolated = useViewerStore((s) => s.setIsolated)
  const active = isolated === id
  return (
    <span
      role="button"
      title={active ? 'Isolation verlassen' : 'Isolieren (nur dies + Kinder)'}
      onClick={(event) => {
        event.stopPropagation()
        setIsolated(active ? null : id)
      }}
      style={{
        cursor: 'pointer',
        fontSize: 12,
        width: 18,
        textAlign: 'center',
        color: active ? ACCENT : 'var(--g600)',
        opacity: active ? 1 : 0.7,
        flexShrink: 0,
      }}
    >
      {active ? '◉' : '◎'}
    </span>
  )
}

/** Sichtbarkeits-Schalter fuer einen Knoten (kaskadiert auf alle Struktur-Blaetter darunter). */
function VisToggle({ leaves }: { leaves: string[] }) {
  const hidden = useViewerStore((s) => s.hidden)
  const setHidden = useViewerStore((s) => s.setHidden)
  const visibleCount = leaves.reduce((n, id) => n + (hidden.has(id) ? 0 : 1), 0)
  const state = visibleCount === 0 ? 'off' : visibleCount === leaves.length ? 'on' : 'partial'
  // Quadratische Sichtbarkeits-Box (editorial): gefuellt=sichtbar, leer=aus, halb=teilweise.
  return (
    <span
      role="button"
      title={state === 'off' ? 'Einblenden' : 'Ausblenden'}
      onClick={(event) => {
        event.stopPropagation()
        setHidden(leaves, visibleCount > 0) // sichtbar -> alles ausblenden, sonst einblenden
      }}
      style={{
        cursor: 'pointer',
        width: 18,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <span className={`ed-box${state === 'on' ? ' on' : state === 'partial' ? ' partial' : ''}`} />
    </span>
  )
}

function StructureRow({ node, depth }: { node: OntologyNode; depth: number }) {
  const lang = useViewerStore((s) => s.lang)
  const selected = useViewerStore((s) => s.selected)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const select = useViewerStore((s) => s.select)
  const setHovered = useViewerStore((s) => s.setHovered)
  const isSelected = selected === node.id
  // Beide Auswahl-Werkzeuge markieren ihre Strukturen: das gewaehlte Blatt stark, die
  // Mitglieder einer Gruppen-Auswahl schwach.
  const isMember = !isSelected && selectedSlugs.has(node.id)

  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isSelected])

  return (
    <div
      ref={rowRef}
      className={`ed-row${isSelected ? ' sel' : isMember ? ' member' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingRight: 8,
      }}
    >
      <button
        type="button"
        onClick={(event) => select(node.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey })}
        onMouseEnter={() => setHovered(node.id)}
        onMouseLeave={() => setHovered(null)}
        title={node.lateralityNote ?? undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          padding: '5px 8px',
          paddingLeft: 8 + depth * 14,
          border: 'none',
          background: 'transparent',
          color: isSelected ? ACCENT : 'var(--g800)',
          fontFamily: 'var(--ed-display)',
          fontSize: 13,
          fontWeight: isSelected ? 600 : 400,
          lineHeight: 1.35,
          cursor: 'pointer',
        }}
      >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.labels[lang]}</span>
      {node.k11Role ? (
        <span className="ed-pill orange">{node.k11Role}</span>
      ) : null}
      {node.mirrored || node.reconstructed ? (
        <span className="ed-pill out" title={node.lateralityNote ?? undefined}>gespiegelt</span>
      ) : node.lateralityNote ? (
        <span className="ed-pill solid" title={node.lateralityNote}>einseitig</span>
      ) : null}
      </button>
      <IsoToggle id={node.id} />
      <VisToggle leaves={[node.id]} />
    </div>
  )
}

function GroupRow({ node, depth }: { node: OntologyNode; depth: number }) {
  const lang = useViewerStore((s) => s.lang)
  const isNarrow = useIsNarrow()
  const expanded = useViewerStore((s) => s.expanded[node.id] ?? false)
  const toggle = useViewerStore((s) => s.toggleExpanded)
  const selected = useViewerStore((s) => s.selected)
  const selectedSlugs = useViewerStore((s) => s.selectedSlugs)
  const select = useViewerStore((s) => s.select)
  const leaves = useMemo(() => flattenStructures(node).map((n) => n.id), [node])
  const isSelected = selected === node.id // als Gruppe vom schwarzen Marker gewaehlt
  const selectedLeafCount = leaves.reduce((count, id) => count + (selectedSlugs.has(id) ? 1 : 0), 0)
  const isMember = !isSelected && selectedLeafCount > 0
  const selectionState = selectedLeafCount === 0 ? 'none' : selectedLeafCount === leaves.length ? 'all' : 'partial'
  const expandHitSize = isNarrow ? 44 : 24

  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isSelected) headRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isSelected])

  return (
    <div>
      <div
        ref={headRef}
        className={`ed-row${isSelected ? ' sel' : isMember ? ' member' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: isNarrow ? 44 : undefined,
          paddingRight: 8,
        }}
      >
        <button
          type="button"
          className="structure-expand-hit"
          aria-label={`${expanded ? 'Einklappen' : 'Aufklappen'} ${node.labels[lang]}`}
          onClick={() => toggle(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: expandHitSize,
            minHeight: isNarrow ? 44 : undefined,
            flex: 'none',
            padding: isNarrow ? 0 : '6px 0',
            marginLeft: 8 + depth * 14,
            border: 'none',
            borderRight: isNarrow ? '1px solid var(--line-soft)' : 'none',
            background: 'transparent',
            color: 'var(--g500)',
            fontFamily: 'var(--ed-display)',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.35,
            cursor: 'pointer',
          }}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <button
          type="button"
          className="structure-label-hit"
          aria-pressed={selectionState === 'partial' ? 'mixed' : selectionState === 'all'}
          onClick={(event) => select(node.id, { additive: event.shiftKey || event.metaKey || event.ctrlKey })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            minWidth: 0,
            minHeight: isNarrow ? 44 : undefined,
            textAlign: 'left',
            padding: isNarrow ? '8px 8px 8px 10px' : '6px 8px',
            border: 'none',
            background: 'transparent',
            color: isSelected ? 'var(--orange)' : 'var(--g700)',
            fontFamily: 'var(--ed-display)',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.35,
            cursor: 'pointer',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.labels[lang]}</span>
          <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--g500)' }}>{leaves.length}</span>
          {selectionState !== 'none' ? (
            <span className={`ed-pill ${selectionState === 'all' ? 'orange' : 'out'}`}>
              {selectionState === 'all' ? 'aktiv' : 'teilweise'}
            </span>
          ) : null}
        </button>
        <IsoToggle id={node.id} />
        <VisToggle leaves={leaves} />
      </div>
      {expanded
        ? (node.children ?? []).map((child) =>
            isStructure(child) ? (
              <StructureRow key={child.id} node={child} depth={depth + 1} />
            ) : (
              <GroupRow key={child.id} node={child} depth={depth + 1} />
            ),
          )
        : null}
    </div>
  )
}

/** Platzhalter-Ueberobjekt (DKT/Brodmann): noch ohne Inhalt, aber als klares Top-Level sichtbar. */
function PlaceholderObject({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', opacity: 0.45 }}>
      <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 13, color: 'var(--ink)' }}>▸ {label}</span>
      <span className="eyebrow" style={{ fontSize: 9 }}>Inhalt folgt</span>
    </div>
  )
}

function ExplorerTreeRootRow({ root }: { root: ExplorerTreeRoot }) {
  return root.kind === 'tree' ? <GroupRow node={root.node} depth={0} /> : <PlaceholderObject label={root.label} />
}

export default function StructureTree() {
  const ontology = useViewerStore((s) => s.ontology)
  const context = useViewerStore((s) => s.context)
  const julich = useViewerStore((s) => s.julich)
  const atlas3d = useViewerStore((s) => s.atlas3d)
  const lang = useViewerStore((s) => s.lang)
  const mode = useViewerStore((s) => s.mode)
  const search = useViewerStore((s) => s.search)
  const setLang = useViewerStore((s) => s.setLang)
  const setMode = useViewerStore((s) => s.setMode)
  const setSearch = useViewerStore((s) => s.setSearch)
  const showAtlasJulich = useViewerStore((s) => s.showAtlasJulich)
  const showAtlasDkt = useViewerStore((s) => s.showAtlasDkt)
  const setAtlasOverlay = useViewerStore((s) => s.setAtlasOverlay)
  const showCarveJulich = useViewerStore((s) => s.showCarveJulich)
  const showCarveDkt = useViewerStore((s) => s.showCarveDkt)
  const showCarveBrodmann = useViewerStore((s) => s.showCarveBrodmann)
  const setCarveOverlay = useViewerStore((s) => s.setCarveOverlay)
  const isNarrow = useIsNarrow()
  const isTouchLandscape = useIsTouchLandscape()
  const shellMode = responsiveShellMode({ isNarrow, isTouchLandscape })

  const visibleTree = useMemo(() => {
    if (!ontology) return null
    return mode === 'k11' ? filterK11(ontology.tree) : ontology.tree
  }, [ontology, mode])

  const searchHits = useMemo(() => {
    if (!ontology || !search.trim()) return null
    const brainPool = mode === 'k11' ? (visibleTree ? flattenStructures(visibleTree) : []) : flattenStructures(ontology.tree)
    const ctxPool = context ? flattenStructures(context) : []
    const atlasPools = [julich, atlas3d.dkt, atlas3d.brodmann, atlas3d.destrieux].flatMap((t) => (t ? flattenStructures(t) : []))
    return filterStructureSearch([...brainPool, ...ctxPool, ...atlasPools], search)
  }, [ontology, context, julich, atlas3d, search, mode, visibleTree])

  const explorerRoots = useMemo(() => {
    if (!visibleTree) return []
    return buildExplorerTreeRoots({ visibleTree, mode, julich, atlas3d, context })
  }, [visibleTree, mode, julich, atlas3d, context])

  if (!ontology || !visibleTree) return null

  const sm: React.CSSProperties = { padding: '4px 9px' }

  return (
    <div
      className="ed-panel scrollbar-thin"
      data-testid="structure-tree-panel"
      style={{
        // Portrait: volle Breite unter dem 3D. Landscape/Desktop: rechte Rail.
        flex: sidePanelFlex(shellMode),
        width: sidePanelWidth({ shellMode, desktopWidth: shellMode === 'landscape-rail' ? 520 : 340 }),
        ...sidePanelBorder({ shellMode }),
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div style={{ padding: 14, borderBottom: '1.5px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div className="ed-block-label">Strukturbaum</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="eyebrow" style={{ color: 'var(--g500)', marginRight: 2 }}>Ansicht</span>
          <button type="button" className={`ed-btn${mode === 'full' ? ' active' : ''}`} style={sm} onClick={() => setMode('full')}>
            Voller Atlas
          </button>
          <button type="button" className={`ed-btn${mode === 'k11' ? ' active' : ''}`} style={sm} onClick={() => setMode('k11')}>
            Kapitel 11
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="group" aria-label="Sprache">
          <span className="eyebrow" style={{ color: 'var(--g500)', marginRight: 2 }}>Sprache</span>
          {(['de', 'la', 'en'] as const).map((l) => (
            <button key={l} type="button" className={`ed-btn${lang === l ? ' active' : ''}`} style={sm} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          className="ed-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Struktur suchen…"
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="group" aria-label="Roh-Atlas-Overlay">
          <span className="eyebrow" style={{ color: 'var(--g500)', marginRight: 2 }}>Atlas roh</span>
          <button
            type="button"
            className={`ed-btn${showAtlasJulich ? ' active' : ''}`}
            style={sm}
            title="Original-Julich-Areale (Affine-transformiert) ueber TARO ein-/ausblenden — zeigt den Rest-Drift"
            onClick={() => setAtlasOverlay('julich', !showAtlasJulich)}
          >
            Julich
          </button>
          <button
            type="button"
            className={`ed-btn${showAtlasDkt ? ' active' : ''}`}
            style={sm}
            title="Original-DKT-Areale (Affine-transformiert) ueber TARO ein-/ausblenden — zeigt den Rest-Drift"
            onClick={() => setAtlasOverlay('dkt', !showAtlasDkt)}
          >
            DKT
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} role="group" aria-label="Carve-Atlas-Overlay">
          <span className="eyebrow" style={{ color: 'var(--g500)', marginRight: 2 }}>Atlas Carve</span>
          <button
            type="button"
            className={`ed-btn${showCarveJulich ? ' active' : ''}`}
            style={sm}
            title="Julich-Parzellen aus TARO-eigenen Vertices gecarvt (0 mm Drift) ein-/ausblenden — liegt exakt auf TARO"
            onClick={() => setCarveOverlay('julich', !showCarveJulich)}
          >
            Julich
          </button>
          <button
            type="button"
            className={`ed-btn${showCarveDkt ? ' active' : ''}`}
            style={sm}
            title="DKT-Parzellen aus TARO-eigenen Vertices gecarvt (0 mm Drift) ein-/ausblenden — liegt exakt auf TARO"
            onClick={() => setCarveOverlay('dkt', !showCarveDkt)}
          >
            DKT
          </button>
          <button
            type="button"
            className={`ed-btn${showCarveBrodmann ? ' active' : ''}`}
            style={sm}
            title="Brodmann-Areale aus TARO-eigenen Vertices gecarvt (0 mm Drift) ein-/ausblenden — liegt exakt auf TARO"
            onClick={() => setCarveOverlay('brodmann', !showCarveBrodmann)}
          >
            Brodmann
          </button>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', padding: 8, minHeight: 0 }}>
        {searchHits ? (
          searchHits.length ? (
            searchHits.map((node) => <StructureRow key={node.id} node={node} depth={0} />)
          ) : (
            <div style={{ padding: 12, color: 'var(--g500)', fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.04em' }}>
              Keine Treffer.
            </div>
          )
        ) : (
          <>
            {explorerRoots[0] ? <ExplorerTreeRootRow root={explorerRoots[0]} /> : null}
            {explorerRoots.length > 1 ? (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {explorerRoots.slice(1).map((root) => (
                  <ExplorerTreeRootRow key={root.collectionId} root={root} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

    </div>
  )
}
