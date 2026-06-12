import { useEffect } from 'react'

/** Vollbild-Overlay mit den Quellen/Lizenzen. Erreichbar ueber das Atlas-Menue.
 *  Traegt die CC-BY-SA-Pflicht-Attribution fuer BodyParts3D (sichtbar, da die
 *  Fussleisten-Quelle-Box entfaellt). Schliesst via Button, Esc und Backdrop-Klick. */
export default function SourcesPage({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="ed-frame"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          maxWidth: 720,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1.5px solid var(--line)' }}>
          <span className="eyebrow">Quellen &amp; Lizenzen</span>
          <button type="button" className="ed-btn" onClick={onClose}>Schliessen</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="ed-block-label">3D-Anatomie</div>
            <p style={{ fontFamily: 'var(--ed-display)', fontSize: 12, lineHeight: 1.6, color: 'var(--g800)', margin: '8px 0 0' }}>
              Mitsuhashi, N., Fujieda, K., Tamura, T., Kawamoto, S., Takagi, T., &amp; Okubo, K. (2009).
              BodyParts3D: 3D structure database for anatomical concepts. <i>Nucleic Acids Research, 37</i>(Database issue), D782–D785.{' '}
              <a href="https://doi.org/10.1093/nar/gkn613" target="_blank" rel="noreferrer" style={{ color: 'var(--orange)' }}>
                https://doi.org/10.1093/nar/gkn613
              </a>
            </p>
            <p style={{ fontFamily: 'var(--ed-display)', fontSize: 11, lineHeight: 1.6, color: 'var(--g600)', margin: '8px 0 0' }}>
              BodyParts3D, Copyright© The Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
