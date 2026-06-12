import type { Scene } from '../types'
import Prose from './Prose'
import ImageFallback from './ImageFallback'
import ErpChart from './ErpChart'
import Flowchart from './Flowchart'
import AnimationPlayer from '../../viewer/AnimationPlayer'
import PhineasGageScene from '../../viewer/PhineasGageScene'
import { useIsNarrow } from '../../useMediaQuery'
import PresenterChrome from '../PresenterChrome'

/** Waehlt den Overlay-Renderer nach scene.overlay.kind. */
function renderOverlay(scene: Scene) {
  switch (scene.overlay.kind) {
    case 'prose':
      return <Prose scene={scene} />
    case 'image':
      return <ImageFallback scene={scene} />
    case 'erp':
      return <ErpChart scene={scene} />
    case 'flowchart':
      return <Flowchart scene={scene} />
    // table/topography: spaeter; bis dahin Bild-Fallback wenn vorhanden, sonst Prose.
    default:
      return scene.overlay.fallbackImage ? <ImageFallback scene={scene} /> : <Prose scene={scene} />
  }
}

const WIDTH_BY_SIZE: Record<Scene['overlay']['size'], number> = { sm: 360, md: 460, lg: 560 }

/** Szenen-Inhalt als feste Spalte rechts (belegt den Layout-Slot der Struktur-Sidebar).
 *  Kein Overlay ueber dem 3D — der Viewport behaelt seinen vollen Raum daneben. */
export default function OverlayPanel({ scene }: { scene: Scene }) {
  const isNarrow = useIsNarrow()
  return (
    <aside
      className="ed-panel"
      style={{
        // Breit: feste Spalte rechts. Schmal: volle Breite unter dem 3D, nimmt den Restraum.
        flex: isNarrow ? '1 1 auto' : 'none',
        width: isNarrow ? '100%' : WIDTH_BY_SIZE[scene.overlay.size],
        borderLeft: isNarrow ? undefined : '1.5px solid var(--line)',
        borderTop: isNarrow ? '1.5px solid var(--line)' : undefined,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* Szenen-Navigation als fixe Kopfzeile der Sidebar (bleibt beim Scrollen sichtbar). */}
      <div style={{ flex: 'none', padding: '12px 18px', borderBottom: '1.5px solid var(--line)' }}>
        <PresenterChrome />
      </div>
      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="eyebrow">{scene.figure ?? scene.section}</div>
          <h2 style={{ fontFamily: 'var(--ed-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)', margin: '6px 0 0' }}>
            {scene.title}
          </h2>
        </div>

        {renderOverlay(scene)}

        {/* Vertiefungen (kapiteluebergreifend): expandieren im Fluss, kein Overlay. */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
          <div className="ed-block-label">Vertiefung</div>
          <AnimationPlayer inline />
          <PhineasGageScene inline />
        </div>
      </div>
    </aside>
  )
}
