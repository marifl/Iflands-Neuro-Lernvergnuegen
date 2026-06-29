import type { Scene } from '../types'
import Prose from './Prose'
import ErpChart from './ErpChart'
import Flowchart from './Flowchart'
import AnimationPlayer from '../../viewer/AnimationPlayer'
import PhineasGageScene from '../../viewer/PhineasGageScene'
import { useIsNarrow, useIsTouchLandscape } from '../../useMediaQuery'
import PresenterChrome from '../PresenterChrome'
import PresenterNotes from '../PresenterNotes'
import { responsiveShellMode, sidePanelBorder, sidePanelFlex, sidePanelWidth } from '../../viewer/explorerShellLayout'
import { regionsToMeshes } from '../brainBridge'
import { bridgeFor, type AtlasTarget } from '../../viewer/atlas/atlasBridge'
import { useViewerStore } from '../../viewer/viewerStore'

/** Erstes kuratiert verlinktes fsaverage-Areal der Szenen-Regionen (Bruecke Lernschritt -> Atlas),
 *  oder null wenn keine Region ein zuordenbares Areal hat. */
function atlasTargetForScene(scene: Scene): AtlasTarget | null {
  for (const slug of regionsToMeshes(scene.brain.regions)) {
    const target = bridgeFor(slug)
    if (target) return target
  }
  return null
}

/** Waehlt den Overlay-Renderer nach scene.overlay.kind. */
function renderOverlay(scene: Scene) {
  switch (scene.overlay.kind) {
    case 'prose':
      return <Prose scene={scene} />
    case 'erp':
      return <ErpChart scene={scene} />
    case 'flowchart':
      return <Flowchart scene={scene} />
    // table/topography: spaeter; bis dahin kompakte Textfassung.
    default:
      return <Prose scene={scene} />
  }
}

const WIDTH_BY_SIZE: Record<Scene['overlay']['size'], number> = { sm: 360, md: 460, lg: 560 }

export function deepeningIdsForScene(scene: Scene): Array<'basalganglia' | 'phineas'> {
  if (scene.id === 'zusammenfassung') return ['basalganglia', 'phineas']
  return []
}

/** Szenen-Inhalt als feste Spalte rechts (belegt den Layout-Slot der Struktur-Sidebar).
 *  Kein Overlay ueber dem 3D — der Viewport behaelt seinen vollen Raum daneben. */
export default function OverlayPanel({ scene }: { scene: Scene }) {
  const isNarrow = useIsNarrow()
  const isTouchLandscape = useIsTouchLandscape()
  const shellMode = responsiveShellMode({ isNarrow, isTouchLandscape })
  const deepenings = deepeningIdsForScene(scene)
  const setAtlasFocus = useViewerStore((s) => s.setAtlasFocus)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const atlasTarget = atlasTargetForScene(scene)
  return (
    <aside
      className="ed-panel"
      style={{
        // Portrait: volle Breite unter dem 3D; Landscape/Desktop: rechte Rail.
        flex: sidePanelFlex(shellMode),
        width: sidePanelWidth({ shellMode, desktopWidth: WIDTH_BY_SIZE[scene.overlay.size] }),
        ...sidePanelBorder({ shellMode }),
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
          <h2 className="display-xl" style={{ color: 'var(--ink)', margin: '6px 0 0' }}>
            {scene.title}
          </h2>
          {/* Bruecke Lernschritt -> Atlas: das praezise fsaverage-Areal zur Szenen-Region zeigen. */}
          {atlasTarget ? (
            <button
              type="button"
              className="ed-btn"
              style={{ marginTop: 8, padding: '5px 11px', minHeight: 44 }}
              onClick={() => {
                setAtlasFocus({ layer: atlasTarget.layer, name: atlasTarget.name })
                setAppMode('atlas')
              }}
            >
              Im Atlas zeigen →
            </button>
          ) : null}
        </div>

        {renderOverlay(scene)}

        <PresenterNotes />

        {deepenings.length ? (
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
            <div className="ed-block-label">Kapitelweite Vertiefung</div>
            {deepenings.includes('basalganglia') ? <AnimationPlayer inline /> : null}
            {deepenings.includes('phineas') ? <PhineasGageScene inline /> : null}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
