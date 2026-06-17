import { REGULAR_APP_MODE_DEFINITIONS, type RegularAppMode } from './appModeDefinitions'

/** Start-Screen: nimmt dem Lernenden die „wo fange ich an?"-Last ab. Eine klare Aktion
 *  (Modus waehlen), alle Optionen sichtbar, keine versteckten Menues. Liegt als Vollflaechen-
 *  Overlay ueber der App und verschwindet, sobald ein Modus gewaehlt wurde. */
export default function ModeLauncher({ onPick }: { onPick: (mode: RegularAppMode) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--app-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div className="ed-frame ed-panel" style={{ maxWidth: 760, width: '100%', padding: '28px 30px' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Iflands Neuro Lernvergnügen · Kapitel 11</div>
        <h1
          style={{
            fontFamily: 'var(--ed-display)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            fontSize: 26,
            lineHeight: 1.1,
            color: 'var(--ink)',
            margin: '0 0 6px',
          }}
        >
          Womit möchtest du starten?
        </h1>
        <p style={{ fontFamily: 'var(--ed-mono)', fontSize: 12, color: 'var(--g600)', margin: '0 0 22px', lineHeight: 1.5 }}>
          Wähle einen Modus. Du kannst jederzeit unten in der Fussleiste unter „Modus" wechseln.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {REGULAR_APP_MODE_DEFINITIONS.map((card) => (
            <button
              key={card.mode}
              type="button"
              className="ed-btn ed-frame"
              onClick={() => onPick(card.mode)}
              style={{
                textAlign: 'left',
                padding: '16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                alignItems: 'flex-start',
                cursor: 'pointer',
                // Grid-Zelle darf unter die Inhaltsbreite schrumpfen + Text umbrechen (sonst Overflow).
                minWidth: 0,
                whiteSpace: 'normal',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontFamily: 'var(--ed-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  {card.label}
                </span>
                {card.recommended ? <span className="ed-pill orange">Empfohlen</span> : null}
              </div>
              <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 11.5, color: 'var(--g600)', lineHeight: 1.45 }}>
                {card.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
