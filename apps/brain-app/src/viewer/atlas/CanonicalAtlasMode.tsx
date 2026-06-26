import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanonicalSurface } from './CanonicalSurface'
import { SubcorticalMeshes } from './SubcorticalMeshes'
import { AtlasLayerPanel } from './AtlasLayerPanel'
import { AtlasTreeBrowser } from './AtlasTreeBrowser'
import { AtlasFacetPanel } from './AtlasFacetPanel'
import { useEffectiveConfig } from './atlasConfig'
import { useAtlasConfigStore } from './atlasConfigStore'
import type { AreaNode, AtlasCatalog } from './atlasCatalog'
import { loadManifest, loadHemi, loadSubcortical, type AtlasManifest, type HemiData, type SubcorticalMesh } from './atlasAssets'
import { labelName } from './atlasLut'
import { useViewerStore } from '../viewerStore'

/** Label-Id eines Areals per Name im LUT (fuer die Bruecke TARO->Atlas); -1 wenn nicht gefunden. */
function labelIdByName(lut: Record<number, { name: string }>, name: string): number {
  for (const [id, e] of Object.entries(lut)) if (e.name === name) return Number(id)
  return -1
}

function areaById(catalog: AtlasCatalog, areaId: string): AreaNode | null {
  for (const atlas of catalog.atlases) {
    for (const group of atlas.groups) {
      const area = group.areas.find((candidate) => candidate.id === areaId)
      if (area) return area
    }
  }
  return null
}

function areaByCanonicalLabel(catalog: AtlasCatalog, layer: string, labelId: number): AreaNode | null {
  for (const atlas of catalog.atlases) {
    for (const group of atlas.groups) {
      const area = group.areas.find((candidate) =>
        candidate.refs.canonical_lut.layer === layer
        && candidate.refs.canonical_lut.label_id === labelId,
      )
      if (area) return area
    }
  }
  return null
}

export default function CanonicalAtlasMode() {
  const effectiveConfig = useEffectiveConfig()
  const toggleScope = useAtlasConfigStore((s) => s.toggleScope)
  const [m, setM] = useState<AtlasManifest | null>(null)
  const [hemis, setHemis] = useState<{ L: HemiData; R: HemiData } | null>(null)
  const [subMeshes, setSubMeshes] = useState<SubcorticalMesh[]>([])
  const [err, setErr] = useState<Error | null>(null)
  const [active, setActive] = useState<string>('')
  // Default Pial = echtes gefaltetes Hirn mit Furchen (nicht die aufgeblasene "inflated"-Variante).
  // Das ist der Sinn des praezisen Atlas: wie ein echtes Hirn aussehen, nicht ballooned.
  const [surface, setSurface] = useState<'pial' | 'inflated'>('pial')
  const [showSub, setShowSub] = useState<boolean>(false)
  const [picked, setPicked] = useState<string>('—')
  const [hovered, setHovered] = useState<string>('—')
  const [pickedAreaId, setPickedAreaId] = useState<string | null>(null)
  // Fokussiertes Areal (Bruecke TARO->Atlas): Label-Id, das hervorgehoben wird; -1 = kein Fokus.
  const [highlight, setHighlight] = useState<number>(-1)
  const [hoverLabel, setHoverLabel] = useState<number>(-1)

  const clearHover = () => {
    setHoverLabel(-1)
    setHovered('—')
  }

  useEffect(() => {
    // StrictMode-Doppelmount: der Effekt laeuft zweimal -> ZWEI loadManifest-Promises. Ohne Guard
    // gewinnt die spaeter aufloesende und ueberschreibt `active` mit dem Default ('dkt'), waehrend
    // highlight/picked vom Bruecken-Fokus stehen bleiben (julich) -> Layer-State zerreisst. Der
    // cancelled-Guard (Standard-React-Async-Pattern) laesst nur den zweiten Lauf State setzen.
    let cancelled = false
    loadManifest()
      .then(async (man) => {
        if (cancelled) return
        const layerIds = man.layers.map((l) => l.id)
        const L = await loadHemi(man.hemis.L, layerIds)
        const R = await loadHemi(man.hemis.R, layerIds)
        const sub = man.subcortical ? await loadSubcortical(man.subcortical) : []
        if (cancelled) return
        setM(man)
        setHemis({ L, R })
        setSubMeshes(sub)
        // Bruecke: kam ein Atlas-Fokus aus einem TARO-Modus? -> Layer setzen + Areal hervorheben +
        // benennen. Sonst Default: erster Layer aus Manifest. Konsum (setAtlasFocus(null)) passiert
        // im [m]-Effekt unten.
        const focus = useViewerStore.getState().atlasFocus
        if (focus && layerIds.includes(focus.layer)) {
          setActive(focus.layer)
          setHighlight(labelIdByName(man.lut[focus.layer], focus.name))
          setPicked(focus.name)
        } else {
          setActive(man.layers[0].id)
        }
      })
      .catch((e) => { if (!cancelled) setErr(e) })
    return () => { cancelled = true }
  }, [])

  // Atlas-Fokus erst nach erfolgreichem Laden konsumieren (StrictMode-sicher: laeuft einmal,
  // nachdem das Manifest gesetzt ist; verhindert Re-Apply beim spaeteren Wieder-Betreten).
  useEffect(() => {
    if (m) useViewerStore.getState().setAtlasFocus(null)
  }, [m])

  if (err) throw err
  if (!m || !hemis || !effectiveConfig || active === '')
    return <div style={{ position: 'absolute', inset: 0, background: 'var(--viewport-bg)', color: 'var(--g600)', padding: 20 }}>Lade fsaverage…</div>

  const selectedArea = pickedAreaId ? areaById(effectiveConfig.catalog, pickedAreaId) : null
  const lut = m.lut[active]
  // Subkortex-Kerne liegen in MNI (= pial-Raum) -> bei aktivem Subkortex Pial erzwingen + Kortex ausgeistern.
  const surf = showSub ? 'pial' : surface
  // Inflated-Surfaces sind beide um den Origin zentriert -> lateral trennen. Pial liegt nativ getrennt.
  const dx = surf === 'inflated' ? 50 : 0
  const cortexOpacity = showSub ? 0.22 : 1

  // Manueller Pick hebt den Bruecken-Fokus auf (freie Exploration -> kein Dimmen mehr).
  function handlePickL(vertex: number) {
    setHighlight(-1)
    const labelId = hemis!.L.labels[active][vertex]
    const area = areaByCanonicalLabel(effectiveConfig!.catalog, active, labelId)
    setPickedAreaId(area?.id ?? null)
    setPicked(area?.label_de ?? labelName(lut, labelId) ?? '—')
  }

  function handlePickR(vertex: number) {
    setHighlight(-1)
    const labelId = hemis!.R.labels[active][vertex]
    const area = areaByCanonicalLabel(effectiveConfig!.catalog, active, labelId)
    setPickedAreaId(area?.id ?? null)
    setPicked(area?.label_de ?? labelName(lut, labelId) ?? '—')
  }

  function handleHoverL(vertex: number | null) {
    if (vertex == null) {
      setHoverLabel(-1)
      setHovered('—')
      return
    }
    const id = hemis!.L.labels[active][vertex]
    setHoverLabel(id)
    setHovered(labelName(lut, id) || '—')
  }

  function handleHoverR(vertex: number | null) {
    if (vertex == null) {
      setHoverLabel(-1)
      setHovered('—')
      return
    }
    const id = hemis!.R.labels[active][vertex]
    setHoverLabel(id)
    setHovered(labelName(lut, id) || '—')
  }

  const activeHighlight = hoverLabel >= 0 ? hoverLabel : highlight

  function selectLayer(id: string) {
    setActive(id)
    setPicked('—')
    setPickedAreaId(null)
    setHighlight(-1)
    clearHover()
  }

  function selectCatalogArea(areaId: string) {
    const area = areaById(effectiveConfig!.catalog, areaId)
    if (!area) return
    setActive(area.refs.canonical_lut.layer)
    setHighlight(area.refs.canonical_lut.label_id)
    setPicked(area.label_de)
    setPickedAreaId(area.id)
    clearHover()
  }

  return (
    // Fuellt die Viewport-Spalte des BodyParts3DViewer-Layouts (absolute, nicht fixed -> Footer/Kopfleiste bleiben frei).
    <div style={{ position: 'absolute', inset: 0, background: 'var(--viewport-bg)' }}>
      <AtlasLayerPanel
        layers={m.layers}
        active={active}
        onSelect={selectLayer}
        surface={surf}
        onSurface={(nextSurface) => { setSurface(nextSurface); clearHover() }}
        showSub={m.subcortical ? showSub : undefined}
        onToggleSub={() => { setShowSub((v) => !v); setPicked('—'); setPickedAreaId(null); clearHover() }}
        picked={picked}
        hovered={hovered}
        browser={(
          <AtlasTreeBrowser
            catalog={effectiveConfig.catalog}
            isAreaEnabled={effectiveConfig.isAreaEnabled}
            onToggleScope={toggleScope}
            onPickArea={selectCatalogArea}
            activeAtlas={active}
            onSelectAtlas={selectLayer}
            pickedAreaId={pickedAreaId}
          />
        )}
      />
      {selectedArea ? (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 11, width: 'min(340px, calc(100vw - 24px))' }}>
          <AtlasFacetPanel area={selectedArea} />
        </div>
      ) : null}
      <Canvas camera={{ position: [0, 0, 310], fov: 45 }}>
        <ambientLight intensity={0.6} />
        {/* Gerichtetes Licht modelliert die Subkortex-Kerne (MeshStandardMaterial); Kortex-Shader bleibt unbeeinflusst. */}
        <directionalLight position={[1, 1, 2]} intensity={0.8} />
        {/* fsaverage liegt in RAS (superior = +Z, anterior = +Y) = Z-Up. Three.js/OrbitControls
            sind Y-Up. Verschachtelte Gruppen komponieren Ry(180)*Rx(-90): die innere -90 deg um X
            kippt superior nach +Y (aufrecht), die aeussere 180 deg um Y dreht die anteriore Seite
            zur Kamera. Nesting vermeidet die Euler-Reihenfolge-Falle (ein kombiniertes [x,y,z] in
            XYZ-Order stellt das Hirn auf den Kopf). */}
        <group rotation={[0, Math.PI, 0]}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <CanonicalSurface hemi={hemis.L} layer={active} surface={surf} lut={lut} offsetX={-dx} opacity={cortexOpacity} highlightLabel={activeHighlight} onPick={handlePickL} onHover={handleHoverL} />
            <CanonicalSurface hemi={hemis.R} layer={active} surface={surf} lut={lut} offsetX={+dx} opacity={cortexOpacity} highlightLabel={activeHighlight} onPick={handlePickR} onHover={handleHoverR} />
            {showSub ? <SubcorticalMeshes meshes={subMeshes} onPick={(n) => { setPicked(n); setPickedAreaId(null) }} /> : null}
          </group>
        </group>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
