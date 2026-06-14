import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanonicalSurface } from './CanonicalSurface'
import { SubcorticalMeshes } from './SubcorticalMeshes'
import { AtlasLayerPanel } from './AtlasLayerPanel'
import { loadManifest, loadHemi, loadSubcortical, type AtlasManifest, type HemiData, type SubcorticalMesh } from './atlasAssets'
import { labelName } from './atlasLut'
import { useViewerStore } from '../viewerStore'

/** Label-Id eines Areals per Name im LUT (fuer die Bruecke TARO->Atlas); -1 wenn nicht gefunden. */
function labelIdByName(lut: Record<number, { name: string }>, name: string): number {
  for (const [id, e] of Object.entries(lut)) if (e.name === name) return Number(id)
  return -1
}

export default function CanonicalAtlasMode() {
  const [m, setM] = useState<AtlasManifest | null>(null)
  const [hemis, setHemis] = useState<{ L: HemiData; R: HemiData } | null>(null)
  const [subMeshes, setSubMeshes] = useState<SubcorticalMesh[]>([])
  const [err, setErr] = useState<Error | null>(null)
  const [active, setActive] = useState<string>('')
  const [surface, setSurface] = useState<'pial' | 'inflated'>('inflated')
  const [showSub, setShowSub] = useState<boolean>(false)
  const [picked, setPicked] = useState<string>('—')
  // Fokussiertes Areal (Bruecke TARO->Atlas): Label-Id, das hervorgehoben wird; -1 = kein Fokus.
  const [highlight, setHighlight] = useState<number>(-1)

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
  if (!m || !hemis || active === '')
    return <div style={{ position: 'absolute', inset: 0, background: '#0b0b0e', color: '#ccc', padding: 20 }}>Lade fsaverage…</div>

  const lut = m.lut[active]
  // Subkortex-Kerne liegen in MNI (= pial-Raum) -> bei aktivem Subkortex Pial erzwingen + Kortex ausgeistern.
  const surf = showSub ? 'pial' : surface
  // Inflated-Surfaces sind beide um den Origin zentriert -> lateral trennen. Pial liegt nativ getrennt.
  const dx = surf === 'inflated' ? 50 : 0
  const cortexOpacity = showSub ? 0.22 : 1

  // Manueller Pick hebt den Bruecken-Fokus auf (freie Exploration -> kein Dimmen mehr).
  function handlePickL(vertex: number) {
    setHighlight(-1)
    setPicked(labelName(lut, hemis!.L.labels[active][vertex]) || '—')
  }

  function handlePickR(vertex: number) {
    setHighlight(-1)
    setPicked(labelName(lut, hemis!.R.labels[active][vertex]) || '—')
  }

  return (
    // Fuellt die Viewport-Spalte des BodyParts3DViewer-Layouts (absolute, nicht fixed -> Footer/Kopfleiste bleiben frei).
    <div style={{ position: 'absolute', inset: 0, background: '#0b0b0e' }}>
      <AtlasLayerPanel
        layers={m.layers}
        active={active}
        onSelect={(id) => { setActive(id); setPicked('—'); setHighlight(-1) }}
        surface={surf}
        onSurface={setSurface}
        showSub={m.subcortical ? showSub : undefined}
        onToggleSub={() => { setShowSub((v) => !v); setPicked('—') }}
        picked={picked}
      />
      <Canvas camera={{ position: [0, 0, 310], fov: 45 }}>
        <ambientLight intensity={0.6} />
        {/* Gerichtetes Licht modelliert die Subkortex-Kerne (MeshStandardMaterial); Kortex-Shader bleibt unbeeinflusst. */}
        <directionalLight position={[1, 1, 2]} intensity={0.8} />
        <CanonicalSurface hemi={hemis.L} layer={active} surface={surf} lut={lut} offsetX={-dx} opacity={cortexOpacity} highlightLabel={highlight} onPick={handlePickL} />
        <CanonicalSurface hemi={hemis.R} layer={active} surface={surf} lut={lut} offsetX={+dx} opacity={cortexOpacity} highlightLabel={highlight} onPick={handlePickR} />
        {showSub ? <SubcorticalMeshes meshes={subMeshes} onPick={(n) => setPicked(n)} /> : null}
        <OrbitControls />
      </Canvas>
    </div>
  )
}
