import type { Scene } from '../types'

export default function ImageFallback({ scene }: { scene: Scene }) {
  const src = scene.overlay.fallbackImage
  if (!src) throw new Error(`ImageFallback: scene ${scene.id} hat overlay.kind=image aber kein fallbackImage`)
  return <img src={src} alt={scene.title} style={{ width: '100%', height: 'auto', border: '1px solid var(--line)' }} />
}
