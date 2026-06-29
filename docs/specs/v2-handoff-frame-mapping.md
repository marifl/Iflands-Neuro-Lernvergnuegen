# V2 Handoff Frame Mapping

Stand: 19. Juni 2026

Quelle: `docs/design-handoff/brain-app-redesign-2026-06-19/`. Die vollständige lokale Arbeitskopie des Original-ZIP liegt zusätzlich unter `raw/v2-redesign/2026-06-19-brain-app-redesign/`, bleibt aber wegen Repo-Policy ignoriert.

Dieses Mapping entscheidet, welche Claude-Design-Handoff-Frames in die V2-Planung eingehen. Es ist kein Implementierungsauftrag und kein Import von Handoff-HTML in die App.

## Harte Leitplanken

1. Unified Learning Mode ist die Planungsgrundlage.
2. Lernen bleibt Primärflow; Explorer, Atlas, Fälle, Präsentation, Wiki, Chat und Debug sind Surfaces.
3. Atlas bleibt Supplement und Referenzlayer, nicht Primärmodus.
4. Debug, Raw-Atlas, Admin, Auth und Authoring sind nicht Default-UI.
5. Prototype-`localStorage` aus dem Handoff wird nicht als Runtime-Vertrag übernommen.

## Inventar

1. Aktuelle Handoff-Frames: 31 `*.dc.html` in `docs/design-handoff/brain-app-redesign-2026-06-19/handoff/mockups/`.
2. Frame-Screenshot-Ordner: 19 Ordner mit je 18 Varianten, wo vorhanden.
3. Referenzbilder: `_ref/` plus `screenshots/theme-matrix-top.png`.
4. Uploads: Präsentations-PDF/TXT und vorherige Mobile-view-Optimieren-Artefakte.

## Frame-Tabelle

| Frame | Entscheidung | Unified-Mode-Surface | Aktuelle App-Entsprechung | Konflikt / No-Go | Dart-Scope | Handoff-Screens |
|---|---|---|---|---|---|---:|
| `AdminFrame.dc.html` | verwerfen | keine normale Unified-Surface | keine aktuelle Entsprechung | Admin/Kursverwaltung ist nicht Teil des Kapitel-11-Lernraums; nur als spätere Plattform-Idee parken | AyAovH9EtPL6 / nFvwRWp5GPIo | 18 |
| `AppFrame.dc.html` | angepasst übernehmen · **umgesetzt** (feature/v2-mockup-completion: ShellNav Rail/Dock) | Responsive Shell: Desktop Split, Landscape Rail, Portrait Sheet/Dock | /?mode=learn, /?mode=explore, /?mode=phineas als heutige Modi; künftig ein Unified-Lernraum | Handoff denkt noch in peer destinations; aktuelle Runtime ist mode-first, Ziel ist Surface-first | iBJCrwzOMeU6 / HfDyMF0aT88a | 18 |
| `AtlasErpFrame.dc.html` | angepasst übernehmen · **umgesetzt** (ERP-Kurve im Lern-Panel + einklappbare Kontextspalte) | Atlas- und ERP-Supplement im Lernschritt | /?mode=atlas für fsaverage, /?config=vcpt oder Lernsequenz für ERP-Kontext | Atlas darf kein Startmodus werden; Raw/Debug bleibt optional und default-hidden | iBJCrwzOMeU6 / 1rYGOyvdhRm8 | 18 |
| `AuthFrame.dc.html` | verwerfen | keine Kern-Surface | keine aktuelle Entsprechung | Auth/Rollenmodell existiert nicht im aktuellen Produktvertrag und darf kein V2-Shell-Blocker sein | iBJCrwzOMeU6 / nFvwRWp5GPIo | 18 |
| `AuthoringFrame.dc.html` | parken | Expert-/Authoring-Surface | heute nur teilweise über Snapshot/Authoring-Stores und Dev-Werkzeuge | Nicht in Erstnutzer-Navigation ziehen; keine Admin-/Authoring-Shell im ersten V2-Slice | GEQVM1fqyCkL / nFvwRWp5GPIo | 18 |
| `ChatFrame.dc.html` | parken | Chat-Hilfssurface | keine aktuelle Entsprechung | Chat darf Lernschritt und 3D-Bühne nicht ersetzen; später aus Kontext öffnen | iBJCrwzOMeU6 | 18 |
| `CollectionFrame.dc.html` | parken | Sammlung/Erweiterbarkeit | keine aktuelle Normalflow-Entsprechung | Gehört zu späterer Knowledge-/Authoring-Schicht, nicht zur ersten Shell-Migration | GEQVM1fqyCkL | 18 |
| `Device Matrix - Detail-Surfaces v2.dc.html` | angepasst übernehmen | Device-Matrix für Detail-Surfaces | entspricht Zielvertrag, nicht 1:1 aktueller Runtime | Als Coverage-Matrix verwenden; Surfaces an Unified-Navigation binden | iBJCrwzOMeU6 / I3SsEI0tLcqq | 0 |
| `Device Matrix - Launcher Faelle Onboarding v2.dc.html` | angepasst übernehmen | Launcher, Case, Onboarding als sekundäre Einstiege | / ohne Query zeigt heute ModeLauncher; /?mode=phineas ist heutige Case-Entsprechung | Launcher wird Resume/Start, keine vier gleichrangigen Modus-Karten als V2-Endzustand | iBJCrwzOMeU6 / 1rYGOyvdhRm8 | 0 |
| `Device Matrix - Tools Presenter Authoring Auth v2.dc.html` | parken | Tools/Presenter/Authoring/Auth Coverage | Tools teilweise Footer/Explorer; Presenter/Auth/Authoring nicht als Normalflow vorhanden | Nur als spätere Coverage-Quelle, nicht als Start-Scope | iBJCrwzOMeU6 / DDlJ2fWUxHw0 | 0 |
| `Device Matrix - Wiki Chat Settings v2.dc.html` | parken | Wiki, Chat, Settings Coverage | Settings existieren, Wiki/Chat nicht | Settings unter Mehr/Expert, Wiki/Chat nach Lernkern; nicht als Default-Dock | iBJCrwzOMeU6 | 0 |
| `Device Matrix v2.dc.html` | übernehmen | Kern-Shell über Geräte und Orientierungen | vergleichbar mit `explorerShellLayout.ts`: desktop-split, portrait-drawer, landscape-rail | Als Gerätevertrag verwenden, aber nicht als HTML importieren | iBJCrwzOMeU6 / HfDyMF0aT88a | 0 |
| `ExplorerToolsFrame.dc.html` | angepasst übernehmen | Strukturfokus- und Expert-Tools | /?mode=explore, Footer-Tool/Cut/Color/Atlas | Explorer wird Surface im Lernraum; komplette Ontologie und Cuts hinter progressive disclosure | EQrweA6CmVE8 / HfDyMF0aT88a | 18 |
| `FaelleBrowserFrame.dc.html` | parken | Case-Browser | heute primär /?mode=phineas als einzelne Fallstudie | Erst nach erstem Case-Surface; kein eigener Hauptmodus | dSfvOVH6Dwoq | 18 |
| `FaelleFrame.dc.html` | angepasst übernehmen | Case-/Phineas-Surface | /?mode=phineas | Phineas wird narrative Surface im Lernraum, nicht eigener App-Silo | dSfvOVH6Dwoq / 1rYGOyvdhRm8 | 18 |
| `FaerbungFrame.dc.html` | angepasst übernehmen | Farbpreset/Legende als Lern- oder Strukturzustand | /?mode=explore plus Footer Farbe; Lernconfigs setzen Presets | Kein eigener Dock-Pfad; Orange/Aktiv-Kontrakt aus Produktdesign beachten | B2XryEO9UyxB / iBJCrwzOMeU6 | 18 |
| `Iflands Neuro - Prototyp.dc.html` | parken | Handoff-Übersicht und IA-Karte | keine Runtime-Entsprechung | Nur als Orientierungsartefakt, nicht als Produktvertrag | iBJCrwzOMeU6 | 0 |
| `LauncherFrame.dc.html` | angepasst übernehmen | Start/Resume | / ohne Query zeigt heute ModeLauncher; Settings können Onboarding überspringen | Resume und Lernpfadwahl übernehmen, vier peer Modi als V2-Endzustand verwerfen | 1rYGOyvdhRm8 / HfDyMF0aT88a | 18 |
| `OnboardingFrame.dc.html` | parken | Onboarding/Startpräferenz | Settings enthalten `start.defaultMode` und `start.showOnboarding` | Selbstlernen/Vortrag folgen sinnvoll, Auth/Manage-Split nicht im Kern-Scope | nFvwRWp5GPIo / HfDyMF0aT88a | 18 |
| `ParticipantFrame.dc.html` | parken | Teilnehmer-/Companion-Follow | keine aktuelle Companion-Runtime | Nach Presenter-Grundvertrag; kein Parallel-App-Silo | DDlJ2fWUxHw0 | 18 |
| `Presenter Deck-Import v2.dc.html` | parken | Deck-Import/Authoring | keine aktuelle Normalflow-Entsprechung | Import ist Expert/Authoring, nicht Lernkern | DDlJ2fWUxHw0 / GEQVM1fqyCkL | 0 |
| `PresenterDeckFrame.dc.html` | parken | Presenter Deck-Verwaltung | heute nur Sequenzen/Snapshots, kein Deck-Manager | Nach Lernkern und Präsentationszustand | DDlJ2fWUxHw0 | 18 |
| `PresenterFrame.dc.html` | angepasst übernehmen · **umgesetzt** (Präsentationszustand: Sprechernotiz + Timeline/Step-State + Rückweg, kein Silo) | Präsentationszustand des Unified Mode | heute Sequenzen, Snapshots und Speaker-Notes-Settings, aber kein eigener Presenter-Screen | Presenter ist Zustand im Lernraum, kein separater Silo | DDlJ2fWUxHw0 / 1rYGOyvdhRm8 | 18 |
| `SettingsFrame.dc.html` | angepasst übernehmen | Settings unter Mehr/Expert | aktuelles SettingsPanel mit `brain-app-settings` | Handoff-Keys nicht übernehmen; vorhandenen Settings-Vertrag nutzen | nFvwRWp5GPIo / HfDyMF0aT88a | 18 |
| `System-Komponenten v2.dc.html` | übernehmen | Systemkomponenten für Loading/Error/Empty/Disabled | aktueller TARO-Canvas hat laut Readiness noch Lücken | State-Komponenten sind Gate-relevant; kein still schwarzer Canvas | tLMwOp54qQph / I3SsEI0tLcqq | 0 |
| `Theme Matrix v2.dc.html` | übernehmen | Hell/Dunkel/Responsive Theme-Matrix | aktueller Theme-Vertrag: `brain-app-settings.display.theme`, `data-theme=light`, dunkle Bühne | Theme-Richtung übernehmen, Handoff-Key `ifn-theme` nicht | nFvwRWp5GPIo / HfDyMF0aT88a | 0 |
| `TimelineSnapshotFrame.dc.html` | parken | Timeline/Snapshot-Surface | ViewerStateSnapshot und Sequenzen existieren, aber kein V2-Timeline-Screen | Wichtig für Presenter, nicht erster Shell-Slice | DDlJ2fWUxHw0 / GEQVM1fqyCkL | 18 |
| `Token-Sheet v2.dc.html` | angepasst übernehmen | Token- und Komponentenrichtung | aktueller Vertrag: root `DESIGN.md`, `app.css`, `theme-tokens` nicht editieren | Tokenrichtung ja, `localStorage["ifn-theme"]` nein | nFvwRWp5GPIo / HfDyMF0aT88a | 0 |
| `Viewport 3D v2.dc.html` | übernehmen | 3D-Bühne, HUD, Loading/Error-Sprache | BodyParts3DViewer Canvas und Atlas/Phineas/Lernen-Runtime | Bühne bleibt frei; blank/black States müssen live geprüft werden | I3SsEI0tLcqq / tLMwOp54qQph | 0 |
| `WikiFrame.dc.html` | parken | Wiki-Wissenssurface | keine aktuelle Runtime-Entsprechung | Später aus Lernkontext öffnen, nicht als Default-Dock | GEQVM1fqyCkL | 18 |
| `Zustaende v2.dc.html` | übernehmen | Fehler-, Lade-, Empty- und Light-Theme-Zustände | Readiness markiert Canvas-State-Vertrag noch `FAIL` | Fail-loud-Muster ist Pflicht vor V2-Code | tLMwOp54qQph / AyAovH9EtPL6 | 0 |

## Geräte- und Screenshot-Abdeckung aus dem Handoff

Die 19 Frame-Screenshot-Ordner enthalten je 18 Varianten: Desktop, iPhone, iPad mini, iPad Pro 11 und iPad Pro 13, jeweils in Dark/Hell und relevanten Orientierungen. Die Device-Matrix-, System-, Token-, Viewport- und Zustände-Frames liegen als HTML und Referenzscreens vor, aber nicht als eigener `frames/<Name>/`-Screenshot-Ordner.

## Entblockung

Dieses Dokument erfüllt die Frame-Mapping-Voraussetzung für den Live-Screenshot-
Slice. Die aktuelle Live-App-Evidence liegt ergänzend in
`docs/specs/v2-live-screenshot-set.md`.
