import { useEffect, useMemo, useRef } from 'react'
import {
  filterK11,
  flattenStructures,
  isStructure,
  type OntologyNode,
} from './ontology'
import { useViewerStore } from './viewerStore'
import { useIsNarrow } from '../useMediaQuery'
import AnimationPlayer from './AnimationPlayer'

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
        onClick={() => select(node.id)}
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
  const expanded = useViewerStore((s) => s.expanded[node.id] ?? false)
  const toggle = useViewerStore((s) => s.toggleExpanded)
  const selected = useViewerStore((s) => s.selected)
  const leaves = useMemo(() => flattenStructures(node).map((n) => n.id), [node])
  const isSelected = selected === node.id // als Gruppe vom schwarzen Marker gewaehlt

  const headRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isSelected) headRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isSelected])

  return (
    <div>
      <div
        ref={headRef}
        className={`ed-row${isSelected ? ' sel' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingRight: 8,
        }}
      >
        <button
          type="button"
          onClick={() => toggle(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            padding: '6px 8px',
            paddingLeft: 8 + depth * 14,
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
          <span style={{ width: 12, color: 'var(--g500)' }}>{expanded ? '▾' : '▸'}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.labels[lang]}</span>
          <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--g500)' }}>{leaves.length}</span>
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

export default function StructureTree() {
  const ontology = useViewerStore((s) => s.ontology)
  const context = useViewerStore((s) => s.context)
  const julich = useViewerStore((s) => s.julich)
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
  const setCarveOverlay = useViewerStore((s) => s.setCarveOverlay)
  const isNarrow = useIsNarrow()

  const visibleTree = useMemo(() => {
    if (!ontology) return null
    return mode === 'k11' ? filterK11(ontology.tree) : ontology.tree
  }, [ontology, mode])

  const searchHits = useMemo(() => {
    if (!ontology || !search.trim()) return null
    const query = search.trim().toLowerCase()
    const brainPool = mode === 'k11' ? (visibleTree ? flattenStructures(visibleTree) : []) : flattenStructures(ontology.tree)
    const ctxPool = context ? flattenStructures(context) : []
    const julichPool = julich ? flattenStructures(julich) : []
    return [...brainPool, ...ctxPool, ...julichPool].filter((node) =>
      (['de', 'la', 'en'] as const).some((l) => node.labels[l].toLowerCase().includes(query)),
    )
  }, [ontology, context, julich, search, mode, visibleTree])

  if (!ontology || !visibleTree) return null

  const sm: React.CSSProperties = { padding: '4px 9px' }

  return (
    <div
      className="ed-panel scrollbar-thin"
      style={{
        // Breit: feste Spalte rechts. Schmal: volle Breite unter dem 3D.
        flex: isNarrow ? '1 1 auto' : 'none',
        width: isNarrow ? '100%' : 340,
        borderLeft: isNarrow ? undefined : '1.5px solid var(--line)',
        borderTop: isNarrow ? '1.5px solid var(--line)' : undefined,
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
            {/* Fuenf klare Ueber-Objekte: TARO · Jülich · DKT · Brodmann · Kontext (Vollausbau). */}
            <GroupRow
              node={{ id: 'taro', labels: { de: 'TARO', la: 'TARO', en: 'TARO' }, children: visibleTree.children ?? [] }}
              depth={0}
            />
            {mode === 'full' ? (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {julich ? <GroupRow node={julich} depth={0} /> : null}
                <PlaceholderObject label="DKT" />
                <PlaceholderObject label="Brodmann" />
                {context ? <GroupRow node={context} depth={0} /> : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Vertiefung: Animation — im Explorer-Modus hier in der Sidebar statt im Viewport. */}
      <div style={{ flex: 'none', borderTop: '1.5px solid var(--line)', padding: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Vertiefung</div>
        <AnimationPlayer inline />
      </div>
    </div>
  )
}
