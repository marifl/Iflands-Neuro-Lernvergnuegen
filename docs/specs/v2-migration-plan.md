# V2 Unified-Shell-Migration — Implementierungsplan

## Arbeitsweise (Pflicht — bei jeder Session lesen)
- Single Source of Truth für Fortschritt (parallel zu Claude-Tasks).
- Jeder Schritt ein verifizierter Commit: typecheck 0, test grün, build 0, Smoke/Screenshot wo UI.
- Sequenziell an geteilten Kerndateien (`BodyParts3DViewer.tsx`, `viewerStore.ts`, `FooterBar.tsx`) — keine file-disjunkten Parallel-Subagents (kollidieren auf der Shell).
- Kein stiller Fallback (CLAUDE.md-Regel #1): sichtbarer Loading/Error/Empty-State, lauter Fehler statt Notlösung.
- Branch-Anker: `feature/v2-unified-shell-skeleton`. Backup-Tag: `pre-v2-shell-skeleton`.

## Quelle der Form
`docs/specs/unified-learning-mode-shape.md` (Screen-Vertrag + Navigationsmodell) ist bindend.
Lernen = primärer Flow; Explorer/Atlas/Fall/Wiki/Chat = Surfaces, keine Peer-Modi.

## Status-Header
- Aktiver Schritt: 10 (ifn-nav Rail/Dock) — IN PROGRESS · Branch feature/v2-mockup-completion · Backup-Tag pre-v2-mockup-completion
- Letzter Commit: (folgt — Slice A ShellNav)
- Backup-Tag: pre-v2-shell-skeleton · pre-v2-mockup-completion
- Letzte Update: 2026-06-29

## Mockup-Completion (Schritt 10-12, Branch feature/v2-mockup-completion)
Realisiert die „angepasst übernehmen"-Frames AppFrame/AtlasErpFrame/PresenterFrame (Frame-Mapping).
Artefakt-Hierarchie bei Konflikt: Shape-Vertrag (19.06., bindend) + Prompt-DoD > ältere Dart-Subtasks (17.06.).

- [x] Schritt 10 — ifn-nav Rail/Dock (AppFrame) · commits a7a2f6dc + 56bb93f7 · typecheck 0, test 510,
      build 0, smoke:shell-nav 3/3 + Screenshots: neue `ShellNav.tsx` (Rail desktop-split/landscape-rail,
      Dock portrait-drawer) per `responsiveShellMode`. Items = Lernen·Struktur·Atlas + Mehr (3 Surfaces +
      Mehr ≤ „4+Mehr"; „Inhalt" = Lernen-Content-Panel, keine erfundene Surface). Mehr-Sheet = Sekundärnav
      + SettingsPanel (Shape §182). **Additiv** — FooterBar unangetastet (Modus-/Settings-Box-Entfernung
      bräche 5 FooterBar-Tests; FooterBar-Umbau bleibt eigener Chrome-Slice, s. Schritt 8-Note).
      > Note: Portrait zeigt damit Dock (Nav) + FooterBar (Tools) als zwei Bottom-Leisten. Bewusste,
      > dokumentierte Folge: Konsolidierung (Footer-Tools → Dock-Mehr, Footer-Modus/Settings-Box raus +
      > Tests umziehen) ist der nächste Chrome-Slice, kein Migrations-Blocker.
- [x] Schritt 11 — ERP-Supplement (AtlasErpFrame): ERP-Kurve rendert bereits als Content des Lern-Panels
      (ErpChart, overlay.kind='erp', z.B. Szene p3a-konfliktmonitoring). Neu: die Kontextspalte ist jetzt
      **einklappbar** (Collapse-Chevron zwischen Bühne und Panel / Reopen-Tab im eingeklappten Zustand) =
      die fehlende AtlasErpFrame-Affordance „einklappbare Kontextspalte". Desktop/Landscape = Spalte mit
      Collapse; Portrait = ERP im Sheet (kein Streifen). Verify: smoke:erp-supplement 2/2 + Screenshots
      (expanded/collapsed), alle Regression-Smokes grün, typecheck 0, test 510, build 0.
- [~] Schritt 12 — Presenter-Surface (PresenterFrame) + Lernschritt→Atlas-Bridge
  - [x] 12a Presenter: Präsentationszustand des Unified Mode (kein Silo). `presentation`-Sequenz
        (`kapitel11-vorlesung`) über ShellNav-Mehr „Vortrag starten/verlassen" erreichbar (Rückweg);
        LearnSidebar lädt Szenen bei Sequence-Wechsel neu; neue `PresenterNotes` (companion.summary =
        Sprechernotiz + Quellen) im Lern-Panel; Timeline/Step-State via vorhandenes PresenterChrome.
        Verify: smoke:presenter PASS + Screenshot, Regression grün, typecheck 0, test 510, build 0.
  - [ ] 12b Lernschritt→Atlas-Bridge (Slice D)

## Schlüsselbefund (29.06.)
Die Runtime erfüllt das **AppFrame-Modell** für learn+explore bereits weitgehend:
3D-Bühne (Canvas) persistiert, Surface rendert im Panel, `responsiveShellMode`
deckt desktop-split/landscape-rail/portrait-drawer ab. Nur `isAtlas` ersetzt die
Bühne. Die V2-Migration ist also **Framing/Nav + Atlas-Supplement**, kein Rebuild.
**No-Fallback-Blocker `ZwvSdKghcAmK` ist geschlossen** (NF-013 Abschlussinventur
26.06.; Abschluss-rg am 29.06. gegen aktuellen Baum sauber — nur erlaubte Kategorien).

## Fortschritt
- [x] Slice 0 — Unified Shell Skeleton (ResumeLauncher als Resume-Einstieg) · commit a9548d3e
- [x] Schritt 1 — ModeLauncher entfernen (ResumeLauncher einziger Einstieg) · commit bcd9ea57
- [x] Schritt 2 — FooterBar „Modus"→„Lernraum": Lernen=Home + Rückweg zum Lernschritt
- [x] Schritt 3 — Explorer→„Strukturfokus" (Label + lernnahe Beschreibung)
- [x] Schritt 4 — Atlas-Supplement: verifiziert erfüllt (kein Code nötig). Atlas ist kein Start-Card
      (aus ResumeLauncher/REGULAR_APP_MODE_DEFINITIONS heraus), wird nur via atlasBridge
      („Im Atlas zeigen") + Deep-Link erreicht, hat Footer-Rückweg (Lernen·Home rendert im Atlas:
      footer=1/Lernraum=1 per Screenshot), TARO≠fsaverage bleibt eigener Canvas-Zweig (CLAUDE.md).
      Note: Lernschritt→Atlas-Bridge ist Feature-Enhancement, kein Migrations-Blocker.
- [x] Schritt 5 — Fall/Phineas-Surface: `/?mode=phineas` aktiviert den Case beim Start
      (caseStudyLaunchFromSearch + setSkull-Bootstrap); Phineas rendert auf Portrait inline
      wie der Lernschritt (caseStudyActive durch shouldRenderInlineSidebar/viewportFlex/
      TreeDrawer-Gate gethreadet). Verify: smoke:responsive 6/6, smoke:phineas-gage 2/2
- [x] Schritt 6 — No-Fallback-Restklassen geschlossen (verifiziert: Abschluss-rg sauber, NF-013)
- [x] Schritt 7 — Alle Smokes grün: learning-layout 3/3, responsive 6/6, phineas-gage 2/2,
      explorer-panel 3/3, performance-gate 2/2. Fixes: (a) Route kanonisiert, (b) Floating-Legende
      aus Learn-Bühne, (c) Phineas-Aktivierung (Schritt 5), (d) Scene-Nav Touch-Target ≥44px
      (Step-Picker war 22px hoch = Shape-Verletzung §Touch-Targets)
- [x] Schritt 8 — Responsive-DoD (HfDyMF0aT88a) erfüllt: alle Smokes grün je Geräteklasse +
      Orientierung (responsive 6/6, learning 3/3, explorer-panel 3/3, performance-gate 2/2,
      phineas 2/2); responsiveShellMode deckt desktop-split/portrait-drawer/landscape-rail ab.
      Note: literale ifn-nav Rail/Dock-Chrome ist optional (Shape: Rail „darf", FooterBar-Umbau
      war out-of-scope) — separater Chrome-Redesign-Slice, kein Migrations-Blocker.
- [x] Schritt 9 — Readiness-Gate-Verdict FAIL→PASS aktualisiert (beide Blocker geschlossen,
      volle Evidenz: typecheck 0, test 504, build 0, 17/17 Smoke-Cases, Screenshot-Matrix,
      2 Review-Runden behoben)

## Notizen
- `appMode: 'learn'|'explore'|'atlas'` ist Store-Kern (15 Dateien). Migration heißt: `explore`/`atlas`
  von Peer-Modi zu Surfaces im `learn`-Shell umdeuten, ohne den Store-Vertrag still zu brechen.
- Canvas-HUD (drei `<Html>`, sehr hoher z-index) blutet über Vollflächen-Overlays — bei Schritt 1/2 mitlösen.
