import type { Scene } from '../types'

export default function Prose({ scene }: { scene: Scene }) {
  return (
    <p style={{ fontFamily: 'var(--ed-display)', fontSize: 14, lineHeight: 1.6, color: 'var(--g800)' }}>
      {scene.companion.summary}
    </p>
  )
}
