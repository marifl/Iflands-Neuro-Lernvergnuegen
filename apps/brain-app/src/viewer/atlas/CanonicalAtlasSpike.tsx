import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanonicalSurface } from './CanonicalSurface'
import { AtlasLayerPanel } from './AtlasLayerPanel'
import { loadManifest, loadHemi, type AtlasManifest, type HemiData } from './atlasAssets'
import { faceToLabel } from './atlasPick'
import { labelName } from './atlasLut'

export default function CanonicalAtlasSpike() {
  const [m, setM] = useState<AtlasManifest | null>(null)
  const [hemis, setHemis] = useState<{ L: HemiData; R: HemiData } | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  const [active, setActive] = useState<string>('')
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

  function handlePickL(faceIndex: number) {
    const label = faceToLabel(hemis!.L.faces, hemis!.L.labels[active], faceIndex)
    setPicked(labelName(lut, label) || '—')
  }

  function handlePickR(faceIndex: number) {
    const label = faceToLabel(hemis!.R.faces, hemis!.R.labels[active], faceIndex)
    setPicked(labelName(lut, label) || '—')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0b0e' }}>
      <AtlasLayerPanel
        layers={m.layers}
        active={active}
        onSelect={(id) => { setActive(id); setPicked('—') }}
        picked={picked}
      />
      <Canvas camera={{ position: [0, 0, 220], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <CanonicalSurface hemi={hemis.L} layer={active} lut={lut} onPick={handlePickL} />
        <CanonicalSurface hemi={hemis.R} layer={active} lut={lut} onPick={handlePickR} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
