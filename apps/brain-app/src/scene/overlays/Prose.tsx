import type { Scene } from '../types'

export default function Prose({ scene }: { scene: Scene }) {
  return (
    <p style={{ fontFamily: 'var(--ed-display)', fontSize: 'var(--fs-lg)', lineHeight: 1.6, color: 'var(--g800)' }}>
      {scene.companion.summary}
    </p>
  )
}
