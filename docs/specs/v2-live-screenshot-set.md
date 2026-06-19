# V2 Live Screenshot Set

Stand: 19. Juni 2026

Quelle: aktuelle App über Playwright, nicht Handoff-HTML. Die Screenshots liegen
unter `docs/specs/screenshots/v2-live/`; die maschinenlesbare Zusammenfassung
liegt in `docs/specs/screenshots/v2-live/capture-summary.json`.

## Ergebnis

Das Live-Screenshot-Set für `I3SsEI0tLcqq` ist erfüllt: 15 Viewport-/Surface-
Kombinationen wurden gegen die laufende App aufgenommen, alle Fälle stehen in
der Capture-Summary auf `PASS`.

Das ist kein vollständiges V2-Code-Go. Die Screenshots schließen die bisherige
Evidence-Lücke für aktuelle Mobile-/Tablet-/Desktop-Baselines, aber sie lösen
nicht den offenen Loading/Error/Empty-State-Vertrag und sie implementieren keine
Unified-Shell-Migration.

## Gelaufene Kommandos

Dev-Server:

```bash
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app"
pnpm dev -- --host 127.0.0.1 --port 5173
```

Port `5173` war belegt; Vite stellte die App in diesem Lauf auf
`http://localhost:5174/` bereit. Capture:

```bash
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone"
SMOKE_URL=http://localhost:5174 node docs/specs/screenshots/v2-live/capture-v2-live-screenshots.mjs
sips -g pixelWidth -g pixelHeight docs/specs/screenshots/v2-live/*.png
magick identify -format "%f %wx%h colors=%k\n" docs/specs/screenshots/v2-live/*.png
```

Zusätzlich wurde die Playwright-Dokumentation zu `page.setViewportSize` und
`page.screenshot` vor dem Script-Slice geprüft.

## Prüfregeln im Script

1. Zielroute pro Surface laden und auf einen konkreten Text oder Selector warten.
2. Viewport mit `browser.newContext({ viewport, hasTouch })` festsetzen.
3. Screenshot mit `page.screenshot({ fullPage: false })` im Zielviewport schreiben.
4. `data-responsive-shell` auslesen.
5. Canvas-Box erfassen; für App-Routen außer Launcher darf Canvas nicht fehlen.
6. Horizontalen Overflow größer als 1 Pixel als Warnung markieren.
7. Sichtbare Debug-/Raw-/Authoring-/Admin-Texte als `debugVisible` markieren.

## Screenshot-Matrix

| Datei | Viewport | Route | Surface | Shell | Canvas | Overflow X | Status |
|---|---:|---|---|---|---:|---:|---|
| `01-mobile-launcher.png` | 390x844 | `/` | Start / launcher | portrait-drawer | 368x589 | 0 | PASS |
| `02-mobile-learning-step.png` | 390x844 | `/?mode=learn&config=vcpt&scene=vcpt` | Learning step | portrait-drawer | 368x330 | 0 | PASS |
| `03-mobile-explorer-drawer.png` | 390x844 | `/?mode=explore` | Explorer supplement / mobile drawer | portrait-drawer | 368x589 | 0 | PASS |
| `04-mobile-phineas-case.png` | 390x844 | `/?mode=phineas` | Case supplement / Phineas | portrait-drawer | 368x330 | 0 | PASS |
| `05-mobile-atlas-supplement.png` | 390x844 | `/?mode=atlas` | Atlas supplement | portrait-drawer | 368x589 | 0 | PASS |
| `06-mobile-landscape-learning.png` | 844x390 | `/?mode=learn&config=vcpt&scene=vcpt` | Phone landscape learning | landscape-rail | 451x252 | 0 | PASS |
| `07-tablet-portrait-learning.png` | 768x1024 | `/?mode=learn&config=vcpt&scene=vcpt` | Tablet portrait learning | portrait-drawer | 746x460 | 0 | PASS |
| `08-tablet-landscape-explorer.png` | 1024x768 | `/?mode=explore` | Tablet landscape explorer | landscape-rail | 551x623 | 0 | PASS |
| `09-ipad-pro-portrait-learning.png` | 834x1194 | `/?mode=learn&config=vcpt&scene=vcpt` | Large tablet portrait learning | portrait-drawer | 812x460 | 0 | PASS |
| `10-ipad-pro-landscape-atlas.png` | 1194x834 | `/?mode=atlas` | Large tablet landscape atlas | desktop-split | 1172x703 | 0 | PASS |
| `11-large-tablet-portrait-phineas.png` | 1024x1366 | `/?mode=phineas` | Large tablet portrait Phineas | desktop-split | 542x1235 | 0 | PASS |
| `12-large-tablet-landscape-explorer.png` | 1366x1024 | `/?mode=explore` | Large tablet landscape explorer | desktop-split | 1004x893 | 0 | PASS |
| `13-desktop-learning-step.png` | 1440x900 | `/?mode=learn&config=vcpt&scene=vcpt` | Desktop learning step | desktop-split | 958x777 | 0 | PASS |
| `14-desktop-explorer-supplement.png` | 1440x900 | `/?mode=explore` | Desktop explorer supplement | desktop-split | 1078x777 | 0 | PASS |
| `15-desktop-atlas-supplement.png` | 1440x900 | `/?mode=atlas` | Desktop atlas supplement | desktop-split | 1418x777 | 0 | PASS |

## Bildintegrität

`sips` bestätigt für alle 15 PNGs die erwarteten Pixelmaße. `magick identify`
meldet für jede Datei mehr als 500 Farben; die Dateien sind damit keine
einfarbigen oder leeren Platzhalter.

## Grenzen

1. Kein Pixel-Histogramm nur für die Canvas-Teilfläche; geprüft wurde die
   Screenshot-Datei insgesamt plus DOM-Canvas-Box.
2. Keine künstliche Injection von Loading-, Error-, Empty- oder Disabled-States.
3. Keine Abdeckung von geparkten Handoff-Surfaces wie Auth, Admin, Chat, Wiki,
   Authoring oder vollständigem Presenter-Deck-Import.
4. Kein Produktcode wurde geändert.

## Gate-Auswirkung

`I3SsEI0tLcqq` kann als Live-Screenshot-Task geschlossen werden. Für
`AyAovH9EtPL6` verbessert sich das Readiness-Gate von fehlender Evidence zu
einem konkreten No-Go: Der erste V2-Code-Slice bleibt blockiert, solange
`tLMwOp54qQph` und die übrigen Runtime-/Doku-Blocker nicht gelöst sind.
