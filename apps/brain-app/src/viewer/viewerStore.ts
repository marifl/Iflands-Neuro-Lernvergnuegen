import { create } from 'zustand'
import { ancestorMap, flattenStructures, nodeChain, type Lang, type Ontology, type OntologyNode } from './ontology'

export interface IsolationCrumb {
  id: string
  labels: Record<Lang, string>
}

export type ViewMode = 'full' | 'k11'
/** Auswahl-Werkzeug wie in Illustrator: 'group' = schwarzer Pfeil (hierarchisch grob->fein),
 *  'direct' = weisser Pfeil (Hierarchie uebergehen, direkt die Einzelstruktur). */
export type SelectMode = 'group' | 'direct'
export type AppMode = 'learn' | 'explore' | 'phineas'

interface ViewerState {
  ontology: Ontology | null
  ancestors: Map<string, string[]>
  /** Kontext-Vollausbau (Schaedel + Kopf), aus den Manifesten gebauter Teilbaum. */
  context: OntologyNode | null
  /** Slugs, die im 3D-View ausgeblendet sind (hierarchisches Ein-/Ausblenden). */
  hidden: Set<string>
  selected: string | null
  /** Slugs der aktuellen Auswahl (bei Gruppen-Auswahl alle Blaetter; sonst genau eines). */
  selectedSlugs: Set<string>
  /** Label der Auswahl (auch fuer Gruppen, die nicht im slug->node-Index stehen). */
  selectedLabels: Record<Lang, string> | null
  selectMode: SelectMode
  hovered: string | null
  /** Von der Animation gesteuertes Highlight-Set (Slugs der aktiven Strukturen). */
  highlight: string[]
  lang: Lang
  mode: ViewMode
  /** Aktiver Grundmodus (Lernen/Explorer/Phineas) — steuert Sidebar + Fussleiste. */
  appMode: AppMode
  search: string
  expanded: Record<string, boolean>
  /** Isolationsmodus (Illustrator-artig): fokussierter Knoten + sein aktives Slug-Set + Breadcrumb. */
  isolated: string | null
  isolatedSlugs: Set<string>
  isolationPath: IsolationCrumb[]
  /** Kontext-Schaedel-Layer (Phineas-Gage): default versteckt. */
  showSkull: boolean
  skullOpacity: number
  /** Stange sichtbar (von der Phineas-Gage-Szene gesteuert). */
  rodVisible: boolean

  setOntology: (ontology: Ontology) => void
  /** Kontext-Teilbaum setzen; alle Kontext-Strukturen starten ausgeblendet. */
  setContext: (context: OntologyNode, slugs: string[]) => void
  /** Slugs ein-/ausblenden (Kaskade aus dem Tree). */
  setHidden: (slugs: string[], hide: boolean) => void
  /** Alles wieder sichtbar machen (Shift+H). */
  clearHidden: () => void
  /** Eine Isolations-Ebene hoch (Esc); auf oberster Ebene Isolation verlassen. */
  isolateUp: () => void
  /** Auswahl setzen und die Eltern-Gruppen aufklappen (fuer Tree-Sync nach 3D-Klick). */
  select: (id: string | null) => void
  setSelectMode: (mode: SelectMode) => void
  /** 3D-Klick: respektiert selectMode (group = Gruppe der aktuellen Ebene, direct = Blatt). */
  pick: (meshName: string) => void
  /** 3D-Doppelklick: group = eine Ebene tiefer betreten (isolieren), direct = Blatt isolieren. */
  drill: (meshName: string) => void
  setHovered: (id: string | null) => void
  setHighlight: (slugs: string[]) => void
  setLang: (lang: Lang) => void
  setMode: (mode: ViewMode) => void
  /** Grundmodus wechseln; raeumt modus-fremde States (highlight/skull/rod) auf. */
  setAppMode: (mode: AppMode) => void
  setSearch: (search: string) => void
  toggleExpanded: (id: string) => void
  setSkull: (visible: boolean, opacity?: number) => void
  setRodVisible: (visible: boolean) => void
  /** Auf einen Knoten isolieren (er + seine Kinder bleiben aktiv, Rest transparent). null = aus. */
  setIsolated: (id: string | null) => void
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  ontology: null,
  ancestors: new Map(),
  context: null,
  hidden: new Set(),
  selected: null,
  selectedSlugs: new Set(),
  selectedLabels: null,
  selectMode: 'group',
  hovered: null,
  highlight: [],
  lang: 'de',
  mode: 'full',
  appMode: 'learn',
  search: '',
  expanded: { brain: true, telencephalon: true, diencephalon: true, brainstem: true },
  isolated: null,
  isolatedSlugs: new Set(),
  isolationPath: [],
  showSkull: false,
  skullOpacity: 0.25,
  rodVisible: false,

  setOntology: (ontology) => set({ ontology, ancestors: ancestorMap(ontology.tree) }),
  setContext: (context, slugs) =>
    set((state) => {
      const next = new Set(state.hidden)
      for (const s of slugs) next.add(s) // Kontext startet ausgeblendet
      return { context, hidden: next }
    }),
  setHidden: (slugs, hide) =>
    set((state) => {
      const next = new Set(state.hidden)
      for (const s of slugs) (hide ? next.add(s) : next.delete(s))
      return { hidden: next }
    }),
  clearHidden: () => set({ hidden: new Set() }),
  isolateUp: () => {
    const st = get()
    const path = st.isolationPath
    // path[0] ist die Baum-Wurzel (kein Isolations-Ziel) -> ab Laenge>2 eine Ebene hoch, sonst aus.
    st.setIsolated(path.length > 2 ? path[path.length - 2].id : null)
  },
  select: (id) =>
    set((state) => {
      if (!id) return { selected: null, selectedSlugs: new Set(), selectedLabels: null }
      // Knoten in Hirn- ODER Kontext-Baum aufloesen: Gruppen-Auswahl markiert alle Blaetter.
      const chain = nodeChain([state.ontology?.tree, state.context], id)
      const node = chain ? chain[chain.length - 1] : null
      const slugs = node ? flattenStructures(node).map((n) => n.id) : [id]
      const expanded = { ...state.expanded }
      const path = chain ? chain.slice(0, -1).map((n) => n.id) : state.ancestors.get(id) ?? []
      for (const groupId of path) expanded[groupId] = true
      return { selected: id, selectedSlugs: new Set(slugs), selectedLabels: node?.labels ?? null, expanded }
    }),
  setSelectMode: (selectMode) => set({ selectMode }),
  pick: (meshName) => {
    const st = get()
    if (st.selectMode === 'direct') return st.select(meshName)
    // Gruppen-Modus: Gruppe der aktuellen Ebene (Kind des aktuell betretenen Kontexts) waehlen.
    const chain = nodeChain([st.ontology?.tree, st.context], meshName)
    if (!chain) return st.select(meshName)
    const ctxIdx = st.isolated ? Math.max(0, chain.findIndex((n) => n.id === st.isolated)) : 0
    const target = chain[ctxIdx + 1] ?? chain[chain.length - 1]
    st.select(target.id)
  },
  drill: (meshName) => {
    const st = get()
    if (st.selectMode === 'direct') return st.setIsolated(meshName)
    // Gruppen-Modus: eine Ebene tiefer betreten (Illustrator-Doppelklick).
    const chain = nodeChain([st.ontology?.tree, st.context], meshName)
    if (!chain) return
    const ctxIdx = st.isolated ? Math.max(0, chain.findIndex((n) => n.id === st.isolated)) : 0
    const target = chain[ctxIdx + 1]
    if (target) st.setIsolated(target.id)
  },
  setHovered: (hovered) => set({ hovered }),
  setHighlight: (highlight) => set({ highlight }),
  setLang: (lang) => set({ lang }),
  setMode: (mode) => set({ mode }),
  setAppMode: (appMode) => {
    if (appMode !== 'learn' && appMode !== 'explore' && appMode !== 'phineas') {
      throw new Error(`setAppMode: unbekannter appMode "${appMode}"`)
    }
    // Moduswechsel raeumt modus-fremde Viewport-States auf (kein stiller Rest).
    set({ appMode, highlight: [], showSkull: false, rodVisible: false })
  },
  setSearch: (search) => set({ search }),
  toggleExpanded: (id) =>
    set((state) => ({ expanded: { ...state.expanded, [id]: !state.expanded[id] } })),
  setSkull: (visible, opacity) =>
    set((state) => ({ showSkull: visible, skullOpacity: opacity ?? state.skullOpacity })),
  setRodVisible: (rodVisible) => set({ rodVisible }),
  setIsolated: (id) =>
    set((state) => {
      if (!id) return { isolated: null, isolatedSlugs: new Set(), isolationPath: [] }
      const chain = nodeChain([state.ontology?.tree, state.context], id)
      if (!chain) return { isolated: id, isolatedSlugs: new Set([id]), isolationPath: [] }
      const target = chain[chain.length - 1]
      const slugs = flattenStructures(target).map((n) => n.id)
      return {
        isolated: id,
        isolatedSlugs: new Set(slugs),
        isolationPath: chain.map((n) => ({ id: n.id, labels: n.labels })),
      }
    }),
}))
