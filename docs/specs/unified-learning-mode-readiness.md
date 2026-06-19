# Unified Learning Mode Readiness-Gate

Stand: 19. Juni 2026

Verdict: `FAIL`

Dieses Gate entscheidet, ob nach dem Shape-Vertrag direkt V2-Code starten darf.
Antwort: Nein. `docs/specs/unified-learning-mode-shape.md` ist als
Planungsgrundlage ausreichend, aber weiterhin nicht als Code-Freigabe. Die
Handoff-/Screenshot-/Prototype-State-Lücken aus der ersten Gate-Version sind
jetzt geschlossen; die verbleibenden Blocker sind Runtime- und Doku-Verträge.

## Scope-Abgrenzung

Zum Shape-Scope von `KM3VQ6VzahDP` gehört direkt nur:

1. `2bf933b` - `docs(specs): verankere unified learning mode shape`

Nicht als Shape-Evidenz zählen:

1. `2eeba1a` - Atlas-/Vortragsfarben- und SP5.1-Kontext
2. `814dec9` - No-Fallback-Inventur
3. `a34706b` - Knowledge-Wiki und Plan-Werkzeuge
4. `2f04c4d` - ALRAH/Codex-Harness

Diese Commits können Kontext liefern, aber sie schließen weder Frame-Mapping,
Live-Screenshot-Evidence noch Unified-Mode-Readiness ab.

## Gate-Kriterien

| Kriterium | Status | Evidenz |
|---|---|---|
| Shape-Vertrag vorhanden | `PASS` | `docs/specs/unified-learning-mode-shape.md` existiert und definiert Unified Learning Mode als V2-Planungsgrundlage. |
| Mockup-/Frame-Mapping ausreichend | `PASS` | `docs/specs/v2-handoff-frame-mapping.md` mappt alle 31 aktuellen Handoff-Frames auf Entscheidung, Unified-Surface und Dart-Scope. |
| Prototype-State entschieden | `PASS` | `docs/specs/v2-prototype-state-inventory.md` entscheidet die `ifn-*`-Mechaniken und verbietet neue Handoff-`localStorage`-Keys. |
| Debug/Raw optional und aus | `PASS` | Shape-Vertrag sagt default-off; `docs/specs/v2-live-screenshot-set.md` zeigt in 15 Live-Captures `debugVisible=false`. |
| Atlas als Supplement definiert | `PASS` | Shape-Vertrag definiert Atlas als Lern-Supplement, nicht als Startmodus. |
| Mobile/Tablet/Desktop beschrieben | `PASS` | Desktop, Tablet, Phone Portrait und Phone Landscape sind spezifiziert und in `docs/specs/screenshots/v2-live/` als Live-Screenshot-Set belegt. |
| Canvas Loading/Error/Empty-State-Vertrag vorhanden | `FAIL` | Shape fordert ihn, aber TARO-Canvas nutzt aktuell `Suspense fallback={null}`; `tLMwOp54qQph` ist noch offen. |
| erster Code-Slice klar und klein | `PASS mit Blocker` | Der kleine Anschluss-Slice ist unten definiert, darf aber erst nach dem Canvas-State-Vertrag starten. |
| Dart-Scope korrigiert | `PASS` | Kommentar `fZ3kmBUmLdIF` trennt `2bf933b` sauber von Atlas-/Vortragsfarben-Arbeit. |

## Befunde pro Scout

### Shape-/Mockup-Compliance

Mockup-Readiness ist `PASS`.

Der Shape-Vertrag beschreibt Desktop, Tablet, Phone Portrait und Phone
Landscape konkret genug als Zielbild. Die 31 aktuellen Handoff-Frames sind jetzt
vollständig klassifiziert: Entscheidung, Unified-Mode-Surface, aktuelle App-
Entsprechung, Konflikt/No-Go und Dart-Scope stehen in
`docs/specs/v2-handoff-frame-mapping.md`.

Zusätzlich entscheidet `docs/specs/v2-prototype-state-inventory.md` die
Prototype-Mechaniken: `ifn-theme`, `ifn-start-mode`, `ifn-reduced-motion`,
`ifn-contrast`, `ifn-role`, `ifn-ruhe`, `ifn-ruhe-style`, `ifn-nav`, `ifn-h`
und statische `.dc.html`-Links werden nicht als neue Runtime-Keys übernommen.

Live-Readiness ist für die aktuelle Baseline `PASS`: 15 Screenshots aus der
laufenden App decken Launcher, Learn, Explorer, Phineas und Atlas über Phone,
Tablet, Large Tablet und Desktop ab. Alle Captures haben `PASS`, `overflowX=0`
und keinen sichtbaren Debug-/Raw-/Admin-/Authoring-Text.

### Runtime-/Architecture

Architektur-Readiness ist `FAIL`.

Die aktuelle Runtime ist noch mode-first. `viewerStore.ts` führt
`learn | explore | phineas | atlas`, `BodyParts3DViewer.tsx` verzweigt Sidebars
nach `appMode`, `ModeLauncher.tsx` rendert weiterhin peer mode cards und
`FooterBar.tsx` bleibt ein globales Werkzeug-/Modus-Cockpit. Das ist eine echte
Migrationsquelle, aber nicht das V2-Zielbild.

Zusätzlich ist der stille Canvas-Zustand ein Blocker: der reguläre TARO-Pfad
nutzt `Suspense fallback={null}`. Die app-weite Error Boundary ist hilfreich,
ersetzt aber keinen viewport-lokalen Loading/Error/Empty-State.

### Dart-Scope-/Commit-Truth

Scope-Readiness ist `PASS`.

Die Scope-Korrektur in Dart ist ausreichend: nur `2bf933b` ist direkte
Shape-Evidenz. `2eeba1a` bleibt Atlas-/SP5.1-/Vortragsfarben-Kontext und darf
nicht als erfüllte Unified-Shape-Arbeit zählen. Ein Zusatzkommentar auf
`AyAovH9EtPL6` soll diese Trennung für das Gate wiederholen.

### Verification

Verification-Readiness ist `PASS` für den Doku-/Evidence-Slice und `FAIL` als
Code-Freigabe.

Für diese Doku-Session sind keine Browser-Smokes nötig, weil kein Code geändert
wird. Für die Live-Baseline lief zusätzlich das Playwright-Screenshot-Script aus
`docs/specs/screenshots/v2-live/capture-v2-live-screenshots.mjs`; die PNG-
Abmessungen wurden mit `sips` geprüft und `magick identify` bestätigt, dass die
Dateien keine einfarbigen Platzhalter sind.

Für den ersten V2-Code-Slice reichen `typecheck` und `test` weiterhin nicht:
UI-/Runtime-Claims brauchen Browser-visible Evidence, also Screenshots oder
Canvas-Pixel-/Runtime-Mesh-Proben.

## Blocker

1. `n0RsZZ5gXo5X` ist `To-do`: aktuelle Doku-Drift ist nicht bereinigt.
2. `B2XryEO9UyxB` ist `In Review`: Atlas-Farbarchitektur muss als aktuelle Preset-/Scene-Grundlage bestätigt bleiben.
3. `ZwvSdKghcAmK` ist `In Review`: No-Fallback-/localStorage-Restklassen sind noch Gate-relevant.
4. `tLMwOp54qQph` ist durch dieses Gate blockiert: Loading/Empty/Error/Disabled-State-Vertrag ist für Code-Qualität offen.

## Erster Code-Slice bei späterem PASS

Wenn dieses Gate später `PASS` bekommt, ist der kleinste sinnvolle Slice:

`Unified Shell Skeleton + ein echter Lernschritt + 3D-Bühnen-State + Device-Smoke`

Konkret heißt das:

1. viewport-lokale Loading/Error/Empty-Zustände in den TARO-Canvas-Pfad einziehen.
2. `Suspense fallback={null}` im regulären Canvas-Pfad ersetzen.
3. einen echten Lernschritt als primären Anker zeigen.
4. Shell nur soweit anpassen, dass Desktop, Tablet, Phone Portrait und Phone Landscape smokebar sind.
5. keine Atlas-/Vortragsfarben-, Phineas-, Chat-, Wiki- oder vollständige Explorer-Migration mitnehmen.

Passende Anschlussaufgabe nach einem späteren `PASS`: zuerst eine kleine Task
unter `Kognitive Neurowissenschaften/Tech_BOARD_V2` für diesen Shell-/State-Slice
anlegen oder `HfDyMF0aT88a` auf eine erste engere Subtask herunterbrechen. Kein
bestehender Epic sollte pauschal auf `Doing` gehen.

## Nicht-Ziele

1. Kein Runtime-Code.
2. Kein Refactor.
3. Kein Import von Handoff-HTML.
4. Keine Änderung an `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md` oder `docs/ARCHITECTURE.md`.
5. Keine Behauptung, dass Atlas-/Vortragsfarben-Arbeit den Unified-Shape-Scope erledigt.

## Verifikationsplan für den späteren Code-Slice

Basis:

```bash
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app"
pnpm typecheck
pnpm test
pnpm build
```

Lokale Browser-Evidence:

```bash
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app"
pnpm dev -- --host 127.0.0.1 --port 5173
SMOKE_URL=http://127.0.0.1:5173 pnpm smoke:responsive-layout
SMOKE_URL=http://127.0.0.1:5173 pnpm smoke:learning-layout
SMOKE_URL=http://127.0.0.1:5173 pnpm smoke:explorer-panel
SMOKE_URL=http://127.0.0.1:5173 pnpm smoke:performance-gate
```

Screenshot-Matrix:

| Ziel | Route | Viewport | Beweis |
|---|---|---:|---|
| Desktop Learn | `/?config=p3a-konfliktmonitoring` | 1920 x 1080 | Screenshot, sichtbarer Canvas, ERP-/Lerninhalt |
| Desktop Explorer | `/?mode=explore&preset=explorer` | 1440 x 900 | Screenshot, `desktop-split`, Canvas nonblank |
| Tablet Portrait Explorer | `/?mode=explore` | 768 x 1024 | Screenshot, `portrait-drawer`, Drawer-Button |
| Tablet Landscape Phineas | `/?mode=phineas` | 932 x 430 | Screenshot, `landscape-rail`, Phineas sichtbar |
| Phone Portrait Learn | `/?mode=learn&config=vcpt&scene=vcpt` | 390 x 844 | Screenshot, Scene-Navigation, kein horizontaler Overflow |
| Phone Landscape Learn | `/?mode=learn&config=vcpt&scene=vcpt` | 844 x 390 | Screenshot, `landscape-rail`, Scene-Navigation |

Nicht ausreichend:

1. DOM-only Checks ohne Canvas- oder Screenshot-Beweis.
2. Handoff-HTML oder alte statische Screenshots.
3. Alte Routen aus früheren `/learn`-, `/composition`-, `/quality`- oder `/companion`-Annahmen.
4. `pnpm typecheck` und `pnpm test` allein für UI-/Runtime-Claims.

## Dart-Updates in dieser Session

1. `iBJCrwzOMeU6` ist durch `docs/specs/v2-handoff-frame-mapping.md` belegbar.
2. `nFvwRWp5GPIo` ist durch `docs/specs/v2-prototype-state-inventory.md` belegbar.
3. `I3SsEI0tLcqq` ist durch `docs/specs/v2-live-screenshot-set.md` und die 15 PNGs unter `docs/specs/screenshots/v2-live/` belegbar.
4. `AyAovH9EtPL6` bleibt blockiert, weil das Gate trotz geschlossener Evidence-Lücken wegen Farbarchitektur-, No-Fallback-, Runtime- und Doku-Verträgen weiter `FAIL` ist.
