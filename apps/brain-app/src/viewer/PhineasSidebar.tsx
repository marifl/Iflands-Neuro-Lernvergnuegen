import PhineasGageScene from './PhineasGageScene'
import { useIsNarrow } from '../useMediaQuery'

/** Sidebar des Phineas-Modus: rahmt die immer-aktive Fallstudie (Schaedel + Stange + Schritte).
 *  Beim Verlassen des Modus raeumt setAppMode die Viewport-States (skull/rod/highlight) auf. */
export default function PhineasSidebar() {
  const isNarrow = useIsNarrow()
  return (
    <aside
      className="ed-panel scrollbar-thin"
      style={{
        flex: isNarrow ? '1 1 auto' : 'none',
        width: isNarrow ? '100%' : 460,
        borderLeft: isNarrow ? undefined : '1.5px solid var(--line)',
        borderTop: isNarrow ? '1.5px solid var(--line)' : undefined,
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
