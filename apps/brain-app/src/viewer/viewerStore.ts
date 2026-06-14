import { create } from 'zustand'
import {
  ancestorMap,
  buildColorIndex,
  flattenStructures,
  nodeChain,
  type ColorEntry,
  type ColorMode,
  type Lang,
  type Ontology,
  type OntologyNode,
} from './ontology'
import { CUT_AXES, clampCutPosition, type CutAxis, type CutConfig, type CutMode } from './cutCapsMerged'
import type { ColorPreset } from './colorPresets'

export type { CutAxis, CutConfig, CutMode }

export interface IsolationCrumb {
  id: string
  labels: Record<Lang, string>
}

export type ViewMode = 'full' | 'k11'

// Hirnhaeute (Dura/Falx/Tentorium): opake Aussenhuellen, die die Kortex verdecken.
const MENINGES_HIDE = ['cerebral-hemisphere-segment-of-dura-mater', 'falx-cerebri', 'tentorium-cerebelli']

// Welche TARO-Strukturen sind Kortex-OBERFLAECHE? Die Atlas-Flaeche re-segmentiert die ganze Kortex;
// jedes sichtbar bleibende Kortex-Mesh konkurriert koplanar mit ihr (Durchscheinen/„Z-Fighting").
// Statt pflegebeduerftiger Liste: per Muster aus der Ontologie ableiten (selbst-wartend, fasst auch
// Sonderfaelle wie `posterior-part-of-...-superior-temporal-gyrus`). Marklager/Gefaesse/Nerven sind
// KEINE Oberflaeche -> ausgeschlossen.
const CORTEX_SURFACE_RE = /gyrus|lobule|cuneus|insula|uncus|entorhinal|fasciolar|operculum/i
const NON_SURFACE_RE = /white-matter|arter|vein|nerve|sinus|aqueduct/i
function cortexSurfaceSlugs(tree: OntologyNode): string[] {
  return flattenStructures(tree)
    .map((n) => n.id)
    .filter((id) => CORTEX_SURFACE_RE.test(id) && !NON_SURFACE_RE.test(id))
}
/** Auswahl-Werkzeug wie in Illustrator: 'group' = schwarzer Pfeil (hierarchisch grob->fein),
 *  'direct' = weisser Pfeil (Hierarchie uebergehen, direkt die Einzelstruktur). */
export type SelectMode = 'group' | 'direct'
export type AppMode = 'learn' | 'explore' | 'phineas' | 'atlas'
// Schnittebenen durch den Kopf (sagittal=L/R/X, coronal=ant/post/Z, axial=sup/inf/Y) sind
// Multi-Axis: jede Achse ist unabhaengig an/aus mit eigener Position (siehe CutAxis/CutConfig).
function emptyCuts(): Record<CutAxis, CutConfig> {
  return {
    sagittal: { on: false, pos: 0 },
    coronal: { on: false, pos: 0 },
    axial: { on: false, pos: 0 },
  }
}
/** Einmaliger Kamera-Ausricht-Befehl. nonce erlaubt erneutes Ausloesen desselben Shots. */
export interface CameraView {
  name: string
  nonce: number
}

interface ViewerState {
  ontology: Ontology | null
  ancestors: Map<string, string[]>
  /** Kortex-Oberflaechen-Slugs (aus der Ontologie); werden bei aktivem Atlas-Overlay ausgeblendet. */
  cortexHideSlugs: string[]
  /** slug -> {role, side, Top-Gruppe} fuer die Einfaerbung (aus der Ontologie gebaut). */
  colorIndex: Map<string, ColorEntry>
  /** Aktiver Farbgebungsmodus der Hirn-Strukturen (modusuebergreifend). */
  colorMode: ColorMode
  /** Aktives figur-spezifisches Farb-Preset (nur wirksam bei colorMode='preset'). */
  activePreset: ColorPreset | null
  /** Aktive Schnittebenen (Clipping) je Achse — Multi-Axis. */
  cuts: Record<CutAxis, CutConfig>
  /** Wirkung der Schnittebenen: schneiden+Cap ('slice') oder dahinter ausblenden ('hide'). */
  cutMode: CutMode
  /** Letzter Kamera-Ausricht-Befehl (one-shot, von CameraRig konsumiert). */
  cameraView: CameraView | null
  /** Kontext-Vollausbau (Schaedel + Kopf), aus den Manifesten gebauter Teilbaum. */
  context: OntologyNode | null
  /** Julich-Brain (Vollausbau): 292 Original-Areal-Meshes als eigenes Objekt (Y-up); default versteckt. */
  julich: OntologyNode | null
  /** Weitere watertight-3D-Atlas-Ueber-Objekte (furchen-echt, fsaverage->TARO): DKT/Brodmann/Destrieux.
   *  Jeweils eigener Teilbaum, default versteckt (separat aktivierbar wie Julich). */
  atlas3d: { dkt: OntologyNode | null; brodmann: OntologyNode | null; destrieux: OntologyNode | null }
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
  /** EEG/ERP-Animation laeuft (eine ERP-Szene ist aktiv) -> Quelle pulst synchron. */
  erpActive: boolean
  /** Cursor-Position der ERP-Kurve (0..1). */
  erpPhase: number
  /** Aktuelle Quellen-Aktivierung (0..1, = positive ERP-Amplitude) fuer den 3D-Puls. */
  erpPulse: number
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
  /** Roh-Atlas-Overlays (Original-Julich/DKT-Areale, Affine-transformiert): default versteckt. */
  showAtlasJulich: boolean
  showAtlasDkt: boolean
  /** Carve-Atlas-Overlays (Atlas-Parzellen aus TARO-EIGENEN Vertices gecarvt -> 0 mm Drift): default versteckt. */
  showCarveJulich: boolean
  showCarveDkt: boolean
  /** Atlas-Overlays von der Schnittebene mitschneiden (true) oder explizit ausnehmen (false). */
  clipAtlasOverlay: boolean
  /** Name des zuletzt angeklickten Atlas-Areals auf TARO (Carve-Overlay); null = keins. */
  pickedAtlasArea: string | null
  /** Slug des zuletzt angeklickten Atlas-Areals (z.B. `julich3-area-44-ifg-l`) — fuer die
   *  Bruecke zum praezisen fsaverage-Areal. null = keins. */
  pickedAtlasSlug: string | null
  /** Bruecke TARO->Atlas: gewuenschtes Areal (Layer + Label-Name), das der Atlas-Modus beim
   *  Betreten fokussiert (hervorhebt + benennt). Wird vom Atlas-Modus konsumiert (auf null gesetzt). */
  atlasFocus: { layer: string; name: string } | null

  setOntology: (ontology: Ontology) => void
  /** Kontext-Teilbaum setzen; alle Kontext-Strukturen starten ausgeblendet. */
  setContext: (context: OntologyNode, slugs: string[]) => void
  /** Julich-Brain-Teilbaum setzen; alle Areale starten ausgeblendet (separat aktivierbar). */
  setJulich: (julich: OntologyNode, slugs: string[]) => void
  /** Weiteren 3D-Atlas-Teilbaum (dkt/brodmann/destrieux) setzen; Areale starten ausgeblendet. */
  setAtlas3d: (key: 'dkt' | 'brodmann' | 'destrieux', tree: OntologyNode, slugs: string[]) => void
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
  /** ERP-Animation an/aus; aus setzt Phase/Puls zurueck (kein stiller Rest-Puls). */
  setErpActive: (active: boolean) => void
  /** Uhr-Tick der ERP-Animation (Cursor-Phase + Quellen-Puls). */
  setErpClock: (phase: number, pulse: number) => void
  setLang: (lang: Lang) => void
  setMode: (mode: ViewMode) => void
  /** Grundmodus wechseln; raeumt modus-fremde States (highlight/skull/rod) auf. */
  setAppMode: (mode: AppMode) => void
  /** Farbgebungsmodus der Hirn-Strukturen setzen. */
  setColorMode: (mode: ColorMode) => void
  /** Figur-spezifisches Preset aktivieren (setzt colorMode='preset'); null = aus. */
  setPreset: (preset: ColorPreset | null) => void
  /** Eine Achse setzen (on/off + Position). */
  setCut: (axis: CutAxis, config: CutConfig) => void
  /** Mehrere Achsen auf einmal setzen (Teil-Update). */
  setCuts: (configs: Partial<Record<CutAxis, CutConfig>>) => void
  /** Schnitt-Wirkung umschalten (schneiden vs. ausblenden). */
  setCutMode: (mode: CutMode) => void
  /** Kamera auf einen benannten Shot ausrichten (one-shot; null verwirft). */
  setCameraView: (name: string | null) => void
  setSearch: (search: string) => void
  toggleExpanded: (id: string) => void
  setSkull: (visible: boolean, opacity?: number) => void
  setRodVisible: (visible: boolean) => void
  setAtlasOverlay: (which: 'julich' | 'dkt', visible: boolean) => void
  setCarveOverlay: (which: 'julich' | 'dkt', visible: boolean) => void
  /** Angeklicktes Atlas-Areal auf TARO setzen/loeschen (Name + Slug fuer die Bruecke). */
  setPickedAtlasArea: (name: string | null, slug: string | null) => void
  setClipAtlasOverlay: (clip: boolean) => void
  /** Atlas-Fokus setzen (Bruecke TARO->Atlas) bzw. nach Konsum loeschen (null). */
  setAtlasFocus: (focus: { layer: string; name: string } | null) => void
  /** Auf einen Knoten isolieren (er + seine Kinder bleiben aktiv, Rest transparent). null = aus. */
  setIsolated: (id: string | null) => void
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  ontology: null,
  ancestors: new Map(),
  cortexHideSlugs: [],
  colorIndex: new Map(),
  colorMode: 'region',
  activePreset: null,
  cuts: emptyCuts(),
  cutMode: 'slice',
  cameraView: null,
  context: null,
  julich: null,
  atlas3d: { dkt: null, brodmann: null, destrieux: null },
  hidden: new Set(),
  selected: null,
  selectedSlugs: new Set(),
  selectedLabels: null,
  selectMode: 'group',
  hovered: null,
  highlight: [],
  erpActive: false,
  erpPhase: 0,
  erpPulse: 0,
  lang: 'de',
  mode: 'full',
  appMode: 'explore',
  search: '',
  expanded: { taro: true, brain: true, telencephalon: true, diencephalon: true, brainstem: true },
  isolated: null,
  isolatedSlugs: new Set(),
  isolationPath: [],
  showSkull: false,
  skullOpacity: 0.25,
  rodVisible: false,
  showAtlasJulich: false,
  showAtlasDkt: false,
  showCarveJulich: false,
  showCarveDkt: false,
  clipAtlasOverlay: true,
  pickedAtlasArea: null,
  pickedAtlasSlug: null,
  atlasFocus: null,

  setOntology: (ontology) =>
    set({
      ontology,
      ancestors: ancestorMap(ontology.tree),
      colorIndex: buildColorIndex(ontology.tree),
      cortexHideSlugs: cortexSurfaceSlugs(ontology.tree),
    }),
  setContext: (context, slugs) =>
    set((state) => {
      const next = new Set(state.hidden)
      for (const s of slugs) next.add(s) // Kontext startet ausgeblendet
      return { context, hidden: next }
    }),
  setJulich: (julich, slugs) =>
    set((state) => {
      const next = new Set(state.hidden)
      for (const s of slugs) next.add(s) // Julich-Brain startet ausgeblendet (separat aktivierbar)
      return { julich, hidden: next }
    }),
  setAtlas3d: (key, tree, slugs) =>
    set((state) => {
      const next = new Set(state.hidden)
      for (const s of slugs) next.add(s) // startet ausgeblendet (separat aktivierbar)
      return { atlas3d: { ...state.atlas3d, [key]: tree }, hidden: next }
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
      const chain = nodeChain([state.ontology?.tree, state.context, state.julich, state.atlas3d.dkt, state.atlas3d.brodmann, state.atlas3d.destrieux], id)
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
    const chain = nodeChain([st.ontology?.tree, st.context, st.julich, st.atlas3d.dkt, st.atlas3d.brodmann, st.atlas3d.destrieux], meshName)
    if (!chain) return st.select(meshName)
    const ctxIdx = st.isolated ? Math.max(0, chain.findIndex((n) => n.id === st.isolated)) : 0
    const target = chain[ctxIdx + 1] ?? chain[chain.length - 1]
    st.select(target.id)
  },
  drill: (meshName) => {
    const st = get()
    if (st.selectMode === 'direct') return st.setIsolated(meshName)
    // Gruppen-Modus: eine Ebene tiefer betreten (Illustrator-Doppelklick).
    const chain = nodeChain([st.ontology?.tree, st.context, st.julich, st.atlas3d.dkt, st.atlas3d.brodmann, st.atlas3d.destrieux], meshName)
    if (!chain) return
    const ctxIdx = st.isolated ? Math.max(0, chain.findIndex((n) => n.id === st.isolated)) : 0
    const target = chain[ctxIdx + 1]
    if (target) st.setIsolated(target.id)
  },
  setHovered: (hovered) => set({ hovered }),
  setHighlight: (highlight) => set({ highlight }),
  setErpActive: (erpActive) => set(erpActive ? { erpActive } : { erpActive: false, erpPhase: 0, erpPulse: 0 }),
  setErpClock: (erpPhase, erpPulse) => set({ erpPhase, erpPulse }),
  setLang: (lang) => set({ lang }),
  setMode: (mode) => set({ mode }),
  setAppMode: (appMode) => {
    if (appMode !== 'learn' && appMode !== 'explore' && appMode !== 'phineas' && appMode !== 'atlas') {
      throw new Error(`setAppMode: unbekannter appMode "${appMode}"`)
    }
    // Moduswechsel raeumt modus-fremde Viewport-States auf (kein stiller Rest).
    set({ appMode, highlight: [], showSkull: false, rodVisible: false })
  },
  // Verlassen des Preset-Modus raeumt das aktive Preset auf (kein stiller Rest).
  setColorMode: (colorMode) => set((s) => ({ colorMode, activePreset: colorMode === 'preset' ? s.activePreset : null })),
  setPreset: (activePreset) => set({ activePreset, colorMode: activePreset ? 'preset' : 'region' }),
  setCut: (axis, config) =>
    set((s) => ({ cuts: { ...s.cuts, [axis]: { on: config.on, pos: clampCutPosition(config.pos) } } })),
  setCuts: (configs) =>
    set((s) => {
      const next = { ...s.cuts }
      for (const axis of CUT_AXES) {
        const c = configs[axis]
        if (c) next[axis] = { on: c.on, pos: clampCutPosition(c.pos) }
      }
      return { cuts: next }
    }),
  setCutMode: (cutMode) => set({ cutMode }),
  setCameraView: (name) =>
    set((state) => ({ cameraView: name ? { name, nonce: (state.cameraView?.nonce ?? 0) + 1 } : null })),
  setSearch: (search) => set({ search }),
  toggleExpanded: (id) =>
    set((state) => ({ expanded: { ...state.expanded, [id]: !state.expanded[id] } })),
  setSkull: (visible, opacity) =>
    set((state) => ({ showSkull: visible, skullOpacity: opacity ?? state.skullOpacity })),
  setRodVisible: (rodVisible) => set({ rodVisible }),
  setAtlasOverlay: (which, visible) =>
    set(which === 'julich' ? { showAtlasJulich: visible } : { showAtlasDkt: visible }),
  setCarveOverlay: (which, visible) =>
    set((s) => {
      const next = which === 'julich' ? { showCarveJulich: visible } : { showCarveDkt: visible }
      const julichOn = which === 'julich' ? visible : s.showCarveJulich
      const dktOn = which === 'dkt' ? visible : s.showCarveDkt
      const anyOn = julichOn || dktOn
      // Hirnhaeute + Host-Gyri ausblenden, solange ein Overlay an ist (Parzellen ersetzen die Kortex,
      // kein Konflikt); beim letzten Ausschalten wieder einblenden + Areal-Auswahl aufraeumen.
      const hidden = new Set(s.hidden)
      for (const slug of MENINGES_HIDE) (anyOn ? hidden.add(slug) : hidden.delete(slug))
      for (const slug of s.cortexHideSlugs) (anyOn ? hidden.add(slug) : hidden.delete(slug))
      // Areal-Auswahl beim Umschalten/Ausschalten immer zuruecksetzen (kein Rest aus dem alten Atlas).
      return { ...next, hidden, pickedAtlasArea: null, pickedAtlasSlug: null }
    }),
  setPickedAtlasArea: (pickedAtlasArea, pickedAtlasSlug) => set({ pickedAtlasArea, pickedAtlasSlug }),
  setClipAtlasOverlay: (clipAtlasOverlay) => set({ clipAtlasOverlay }),
  setAtlasFocus: (atlasFocus) => set({ atlasFocus }),
  setIsolated: (id) =>
    set((state) => {
      if (!id) return { isolated: null, isolatedSlugs: new Set(), isolationPath: [] }
      const chain = nodeChain([state.ontology?.tree, state.context, state.julich, state.atlas3d.dkt, state.atlas3d.brodmann, state.atlas3d.destrieux], id)
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
