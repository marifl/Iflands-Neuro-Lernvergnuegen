import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanonicalSurface } from './CanonicalSurface'
import { SubcorticalMeshes } from './SubcorticalMeshes'
import { AtlasLayerPanel } from './AtlasLayerPanel'
import { loadManifest, loadHemi, loadSubcortical, type AtlasManifest, type HemiData, type SubcorticalMesh } from './atlasAssets'
import { labelName } from './atlasLut'

export default function CanonicalAtlasSpike() {
  const [m, setM] = useState<AtlasManifest | null>(null)
  const [hemis, setHemis] = useState<{ L: HemiData; R: HemiData } | null>(null)
  const [subMeshes, setSubMeshes] = useState<SubcorticalMesh[]>([])
  const [err, setErr] = useState<Error | null>(null)
  const [active, setActive] = useState<string>('')
  const [surface, setSurface] = useState<'pial' | 'inflated'>('inflated')
  const [showSub, setShowSub] = useState<boolean>(false)
  const [picked, setPicked] = useState<string>('—')

  useEffect(() => {
    loadManifest()
      .then(async (man) => {
        const layerIds = man.layers.map((l) => l.id)
        const L = await loadHemi(man.hemis.L, layerIds)
        const R = await loadHemi(man.hemis.R, layerIds)
        const sub = man.subcortical ? await loadSubcortical(man.subcortical) : []
        setM(man)
        setHemis({ L, R })
        setSubMeshes(sub)
        // Default: erster Layer aus Manifest
        setActive(man.layers[0].id)
      })
      .catch(setErr)
  }, [])

  if (err) throw err
  if (!m || !hemis || active === '') return <div style={{ color: '#ccc', padding: 20 }}>Lade fsaverage…</div>

  const lut = m.lut[active]
  // Subkortex-Kerne liegen in MNI (= pial-Raum) -> bei aktivem Subkortex Pial erzwingen + Kortex ausgeistern.
  const surf = showSub ? 'pial' : surface
  // Inflated-Surfaces sind beide um den Origin zentriert -> lateral trennen. Pial liegt nativ getrennt.
  const dx = surf === 'inflated' ? 50 : 0
  const cortexOpacity = showSub ? 0.22 : 1

  function handlePickL(vertex: number) {
    setPicked(labelName(lut, hemis!.L.labels[active][vertex]) || '—')
  }

  function handlePickR(vertex: number) {
    setPicked(labelName(lut, hemis!.R.labels[active][vertex]) || '—')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0b0e' }}>
      <AtlasLayerPanel
        layers={m.layers}
        active={active}
        onSelect={(id) => { setActive(id); setPicked('—') }}
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
        <CanonicalSurface hemi={hemis.L} layer={active} surface={surf} lut={lut} offsetX={-dx} opacity={cortexOpacity} onPick={handlePickL} />
        <CanonicalSurface hemi={hemis.R} layer={active} surface={surf} lut={lut} offsetX={+dx} opacity={cortexOpacity} onPick={handlePickR} />
        {showSub ? <SubcorticalMeshes meshes={subMeshes} onPick={(n) => setPicked(n)} /> : null}
        <OrbitControls />
      </Canvas>
    </div>
  )
}
