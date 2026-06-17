import PhineasGageScene from './PhineasGageScene'
import { useIsNarrow, useIsTouchLandscape } from '../useMediaQuery'
import { responsiveShellMode, sidePanelBorder, sidePanelFlex, sidePanelWidth } from './explorerShellLayout'

/** Sidebar des Phineas-Modus: rahmt die immer-aktive Fallstudie (Schaedel + Stange + Schritte).
 *  Beim Verlassen des Modus raeumt setAppMode die Viewport-States (skull/rod/highlight) auf. */
export default function PhineasSidebar() {
  const isNarrow = useIsNarrow()
  const isTouchLandscape = useIsTouchLandscape()
  const shellMode = responsiveShellMode({ isNarrow, isTouchLandscape })
  return (
    <aside
      className="ed-panel scrollbar-thin"
      style={{
        flex: sidePanelFlex(shellMode),
        width: sidePanelWidth({ shellMode, desktopWidth: 460 }),
        ...sidePanelBorder({ shellMode }),
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflowY: 'auto',
        padding: 18,
      }}
    >
      <PhineasGageScene asMode />
    </aside>
  )
}
