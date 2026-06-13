import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CanonicalSurface } from './CanonicalSurface'
import { loadManifest, loadHemi, type AtlasManifest, type HemiData } from './atlasAssets'

export default function CanonicalAtlasSpike() {
  const [m, setM] = useState<AtlasManifest | null>(null)
  const [hemis, setHemis] = useState<{ L: HemiData; R: HemiData } | null>(null)
  const [err, setErr] = useState<Error | null>(null)
  const [picked, setPicked] = useState<string>('—')

  useEffect(() => {
    loadManifest()
      .then(async (man) => {
        const L = await loadHemi(man.hemis.L, ['destrieux'])
        const R = await loadHemi(man.hemis.R, ['destrieux'])
        setM(man); setHemis({ L, R })
      })
      .catch(setErr)
  }, [])
  if (err) throw err
  if (!m || !hemis) return <div style={{ color: '#ccc', padding: 20 }}>Lade fsaverage…</div>

  const lut = m.lut.destrieux
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0b0e' }}>
      <div style={{ position: 'absolute', zIndex: 1, color: '#eee', padding: 12, fontFamily: 'monospace' }}>
        Atlas-Spike (fsaverage5 · Destrieux) · Klick: {picked}
      </div>
      <Canvas camera={{ position: [0, 0, 220], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <CanonicalSurface hemi={hemis.L} layer="destrieux" lut={lut}
          onPick={(f) => setPicked(`face ${f}`)} />
        <CanonicalSurface hemi={hemis.R} layer="destrieux" lut={lut}
          onPick={(f) => setPicked(`face ${f}`)} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
