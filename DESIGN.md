# Design

Generiert aus dem vorhandenen Code (`apps/brain-app/src/app.css`, `packages/theme-tokens/`). Das ist die app-lokale Editorial-Schicht; `theme-tokens/` ist geteilte SSoT und wird nicht editiert, nur überschrieben.

## Visual Theme

Editorial "Plansatz"-Ästhetik: Tinte auf Papier, technische Plan-Notation, ein einziger Akzent. Zwei gleichwertige Themes (dunkel als Default, hell per `[data-theme="light"]`). Der 3D-Viewport bleibt in **beiden** Themes dunkel (`--viewport-bg: #0e0e0e`, Cover-Split-Logik): die Chrome wechselt Hell/Dunkel, die Bühne nicht.

Charakter: wissenschaftlich, hochwertig, fokussiert. Rahmen (1.5px Tinte), harte Kanten (keine Radien), Mono-Schrift für die technische Ebene. Keine Verläufe, keine Schatten als Dekoration (Shadow-Utilities existieren, werden aber sparsam genutzt).

## Color

Strategie: **Restrained** (tinted neutrals + ein Akzent). Werte als Hex aus dem Bestand.

### Dunkel (Default)
- Flächen: `--ed-canvas` / `--viewport-bg` `#0e0e0e` (hinter allem, 3D-Backdrop), `--paper` `#161616` (Panel/Overlay), `--paper-raised` `#1c1c1c`, `--fill` `#1f1f1f`.
- Tinte + Graureihe: `--ink` `#ededed`, `--g800` `#d2d2d2`, `--g700` `#b2b2b2`, `--g600` `#8c8c8c`, `--g500` `#6f6f6f`, `--g400` `#555`.
- Linien: `--line` `#c8c8c8` (1.5px stark), `--line-soft` `#2c2c2c` (1px weich).

### Hell
- `--app-bg` `#e7e7e7`, `--paper` `#fff`, `--fill` `#f4f4f4`.
- `--ink` `#111`, Graureihe `#2a2a2a` → `#aeaeae`, `--line` `#111`, `--line-soft` `#e2e2e2`.

### Akzent (themenunabhängig)
- `--orange` `#f26b1f` (der **einzige** Akzent). Washes: `--orange-wash` 14%, `--orange-wash-soft` 7% (color-mix).
- `--on-accent` `#160b04` (Text auf Orange), `--on-ink` (Text auf Tinte-Fläche).
- Regel: Orange ist der Auswahl-/Aktiv-Ebene vorbehalten. Neutrale Zustände (z.B. "sichtbar") werden mit Tinte gefüllt, nicht Orange. Orange nie alleiniger Bedeutungsträger (Farbsehschwäche): immer plus Form/Label/Position.

## Typography

- **Display/Body**: `--ed-display` = 'Helvetica Neue', Helvetica, Arial, sans-serif.
- **Mono (technische Ebene)**: `--ed-mono` = 'IBM Plex Mono', ui-monospace, Menlo, Monaco.
- Eyebrow/Tags: Mono, Versalien, weite Laufweite (`letter-spacing` 0.12–0.22em), sehr klein (7–9px). Tragen die "technische" Plan-Anmutung.
- Überschriften: Display, fett (700), negative Laufweite (`-0.02em` bis `-0.04em`). Abschnittsnummer in Orange.
- Hierarchie über Schrift (Größe/Gewicht/Laufweite), nicht über Boxen/Farbe.

## Components

- **`.ed-frame`**: 1.5px Tinte-Rahmen ("Plate"). **`.ed-panel`**: `--paper`-Fläche. Kombination = umrahmtes Panel/Overlay.
- **`.ed-btn`**: Mono, 1px Linie, Hover füllt, `.active` = Orange. Fokus: 2px Orange-Outline. Aktueller Default-Padding `5px 11px` (klein, eher Desktop-Maus).
- **`.ed-input`**: Mono, 1px Linie, Fokus färbt Rand orange.
- **`.ed-box`**: quadratische Checkbox (13px), `on` = Tinte gefüllt, `partial` = diagonaler Split.
- **`.ed-pill`**: eckige Pills, Unterscheidung über Stil (`orange`/`solid`/`out`), nicht über Hue.
- **`.eyebrow` / `.ed-block-label` / `.ed-tag`**: Mono-Marker; Block-Label trägt ein führendes 7px-Orange-Quadrat (Plan-Notation).
- **`.ed-foot`**: untere Steuer-/Titelleiste. `display: grid`, `border-top: 1.5px var(--line)`. Spalten `.col` mit `padding: 9px 14px`, `border-right: 1px var(--line-soft)` (letzte ohne), Mono 8.5px, Versalien. Sub-Elemente `.h` (Orange-Mini-Label 7px), `.v` (Wert in Tinte), `.ellip` (Trunkierung). Responsive Varianten folgen dem Shell-Vertrag in `docs/ARCHITECTURE.md` statt einem eigenen Breakpoint-Pfad.
- **`.scrollbar-thin`**: 4px schlanke Scrollbar.

## Layout

- App-Shell: feste Plate (`ed-frame`) über die volle Viewport-Fläche, Spalten: Kopfleiste (fhead) / Mitte (3D-Viewport + Sidebar) / Steuer-Fußleiste (ed-foot).
- Breit (Desktop): 3D-Viewport links (nimmt Restraum), Sidebar feste Spalte rechts (340–460px je Inhalt).
- Responsive Shell: `desktop-split`, `portrait-drawer` und `landscape-rail` sind der aktuelle Vertrag. Einzelne Komponenten dürfen nicht abweichend eigene Shell-Modi erfinden.
- Keine Karten-Grids. Trennung über 1px/1.5px-Linien, nicht über Boxen mit Radien/Schatten.
- Motion-Tokens aus `theme-tokens/styles/motion.css` (`--motion-fast` etc.); Transitions sparsam (Button-Füllung). Keine animierten Layout-Properties.

## Responsive-Notiz

- Der verbindliche Layout-Vertrag steht in `docs/ARCHITECTURE.md` und wird in
  `apps/brain-app/src/viewer/explorerShellLayout.ts` benannt.
- Adapt-Arbeit muss pro Gerät gleichwertige Layouts liefern statt Desktop nur
  zu schrumpfen. Touch-Targets bleiben für Phone mindestens 44 x 44 px.
