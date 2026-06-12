import { useState } from 'react'
import { useViewerStore, type AppMode, type SelectMode } from './viewerStore'
import Flyout from './Flyout'
import SourcesPage from './SourcesPage'

type OpenFlyout = 'atlas' | 'tool' | 'mode' | null

const MODE_LABEL: Record<AppMode, string> = { learn: 'Lernen', explore: 'Explorer', phineas: 'Phineas Gage' }
const TOOL_LABEL: Record<SelectMode, string> = { group: 'Gruppe', direct: 'Direkt' }

/** Menue-Eintrag im Flyout (volle Breite, linksbuendig). */
function Item({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`ed-btn${active ? ' active' : ''}`}
      onClick={onClick}
      style={{ width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 2 }}
    >
      {children}
    </button>
  )
}

/** Fussleiste als Steuerzentrum: Atlas-Menue (Quellen), Werkzeug (Klickmodus, nur Explorer),
 *  Modus-Umschalter. Box-breite Flyouts klappen nach oben auf. */
export default function FooterBar() {
  const appMode = useViewerStore((s) => s.appMode)
  const setAppMode = useViewerStore((s) => s.setAppMode)
  const selectMode = useViewerStore((s) => s.selectMode)
  const setSelectMode = useViewerStore((s) => s.setSelectMode)
  const [open, setOpen] = useState<OpenFlyout>(null)
  const [showSources, setShowSources] = useState(false)
  const toggle = (which: OpenFlyout) => setOpen((cur) => (cur === which ? null : which))
  const close = () => setOpen(null)

  const showTool = appMode === 'explore'
  const cols = showTool ? 'auto 1fr auto auto' : 'auto 1fr auto'

  return (
    <>
      <div className="ed-foot" style={{ gridTemplateColumns: cols }}>
        <Flyout eyebrow="Atlas" label="Menü" open={open === 'atlas'} onToggle={() => toggle('atlas')} onClose={close}>
          <Item onClick={() => { setShowSources(true); close() }}>Quellen &amp; Lizenzen</Item>
        </Flyout>

        {/* Spacer-Spalte: die Sidebar nimmt rechts den Raum, die Mitte bleibt leer. */}
        <div className="col" aria-hidden style={{ borderRight: 'none' }} />

        {showTool ? (
          <Flyout eyebrow="Werkzeug" label={TOOL_LABEL[selectMode]} open={open === 'tool'} onToggle={() => toggle('tool')} onClose={close}>
            <Item active={selectMode === 'group'} onClick={() => { setSelectMode('group'); close() }}>▸ Gruppe</Item>
            <Item active={selectMode === 'direct'} onClick={() => { setSelectMode('direct'); close() }}>▹ Direkt</Item>
          </Flyout>
        ) : null}

        <Flyout eyebrow="Modus" label={MODE_LABEL[appMode]} open={open === 'mode'} onToggle={() => toggle('mode')} onClose={close}>
          {(['learn', 'explore', 'phineas'] as const).map((m) => (
            <Item key={m} active={appMode === m} onClick={() => { setAppMode(m); close() }}>
              {MODE_LABEL[m]}
            </Item>
          ))}
        </Flyout>
      </div>

      {showSources ? <SourcesPage onClose={() => setShowSources(false)} /> : null}
    </>
  )
}
