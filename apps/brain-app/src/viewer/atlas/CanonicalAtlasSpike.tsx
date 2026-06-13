import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanonicalSurface } from './CanonicalSurface'
import { AtlasLayerPanel } from './AtlasLayerPanel'
import { loadManifest, loadHemi, type AtlasManifest, type HemiData } from './atlasAssets'
import { labelName } from './atlasLut'

export default function CanonicalAtlasSpike() {
  const [m, setM] = useState<AtlasManifest | null>(null)
  const [hemis, setHemis] = useState<{ L: HemiData; R: HemiData } | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  const [active, setActive] = useState<string>('')
  const [surface, setSurface] = useState<'pial' | 'inflated'>('inflated')
  const [picked, setPicked] = useState<string>('—')

  useEffect(() => {
    loadManifest()
      .then(async (man) => {
        const layerIds = man.layers.map((l) => l.id)
        const L = await loadHemi(man.hemis.L, layerIds)
        const R = await loadHemi(man.hemis.R, layerIds)
        setM(man)
        setHemis({ L, R })
        // Default: erster Layer aus Manifest
        setActive(man.layers[0].id)
      })
      .catch(setErr)
  }, [])

  if (err) throw err
  if (!m || !hemis || active === '') return <div style={{ color: '#ccc', padding: 20 }}>Lade fsaverage…</div>

  const lut = m.lut[active]
  // Inflated-Surfaces sind beide um den Origin zentriert -> lateral trennen. Pial liegt nativ getrennt.
  const dx = surface === 'inflated' ? 50 : 0

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
        surface={surface}
        onSurface={setSurface}
        picked={picked}
      />
      <Canvas camera={{ position: [0, 0, 310], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <CanonicalSurface hemi={hemis.L} layer={active} surface={surface} lut={lut} offsetX={-dx} onPick={handlePickL} />
        <CanonicalSurface hemi={hemis.R} layer={active} surface={surface} lut={lut} offsetX={+dx} onPick={handlePickR} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
