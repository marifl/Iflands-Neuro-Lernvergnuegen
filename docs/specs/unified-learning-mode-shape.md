# Unified Learning Mode Shape-Vertrag

Stand: 19. Juni 2026

Verdict: `FAIL` für Code-Readiness. Dieser Vertrag ist die neue V2-Planungsgrundlage, aber er gibt noch keine Implementierung frei.

## Zweck

Der Unified Learning Mode ersetzt die bisherige Planungsfragmentierung aus Lernen, Explorer, Phineas/Fällen und Atlas als gleichrangige Startmodi. Lernen ist der primäre Flow. Explorer, Atlas, Fälle, Präsentation, Wiki, Chat und Debug sind kontextuelle Surfaces im Lernraum.

Dieser Vertrag ist bewusst ein Shape-Dokument. Keine Code-Exekution, kein Refactor, keine Runtime-Änderung.

## Quellen

1. `PRODUCT.md`: Produktregister `product`, 3D-Lernen für Kapitel 11, Bühne zuerst, Geräte gleichwertig.
2. `DESIGN.md`: restrained Editorial-System, dunkle 3D-Bühne in beiden Themes, Orange nur für Auswahl/Aktiv.
3. `CLAUDE.md`: Rohdaten, Atlas-Grenzen, Startscreen und Arbeitsregeln.
4. `docs/ARCHITECTURE.md`: aktueller Runtime-Vertrag mit `learn`, `explore`, `phineas`, intern `atlas`, Snapshot-, Config- und Responsive-Shell-Vertrag.
5. `apps/brain-app/DESIGN.md`: app-lokale Produktform, keine stillen Defaults, Viewport bleibt Bühne.
6. `Mobile view optimieren.zip`: 31 HTML-Mockups und 5 Übersichtsscreenshots unter `/tmp/brain-app-mobile-view-optimieren/handoff/`.
7. Dart-Task `KM3VQ6VzahDP` plus verknüpfte V2-Epics und Kommentare.
8. `docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md` und `docs/SP5_1_FIGURE_MATRIX.md` als Inhalts- und Atlas-Supplement-Evidenz.

## Harte Produktentscheidung

1. Ein Hauptmodus: `Unified Learning Mode`.
2. Lernen ist der primäre Flow.
3. Explorer, Atlas, Fälle/Phineas, Präsentation, Wiki und Chat sind Surfaces, keine Startmodi auf Augenhöhe.
4. Atlas ist Supplement fürs Lernen: präzise Referenz, Areal-Brücke, Layer/Carve bei Bedarf.
5. Debug/Raw-Atlas ist optional einblendbar, standardmäßig aus.
6. Mobile, Tablet und Desktop bekommen eigene Layouts, keine geschrumpften Kopien.
7. Die 3D-Bühne bleibt frei. UI rahmt, erklärt und verankert, aber überdeckt Anatomie nicht dauerhaft.
8. Kein 9-Kachel-Mobile-Dock als Default.
9. Kein still schwarzer Canvas ohne Loading-, Error- oder Empty-State.

## Screen-Vertrag

### Desktop

Zielviewport: ab 1280 px Breite, primär 1440 x 900 und größer.

1. Der 3D-Viewport ist die Hauptfläche und belegt den größten Flächenanteil.
2. Links oder rechts darf eine schmale Rail stehen, aber sie zeigt keine gleichrangigen Modi. Sie führt zu Lernschritt, Inhalt, Struktur, Kontext und Mehr.
3. Ein Panel ist kontextuell: Lerntext, Strukturdetail, Atlas-Supplement, Fall, Presenter-Notizen oder Debug. Es ist einklappbar.
4. Bei breiten Displays darf eine zweite schmale Kontextspalte erscheinen, zum Beispiel ERP-Kurve oder Presenter-Notes. Sie ist kein Pflichtlayout.
5. Bühne bleibt dunkel. Chrome kann hell oder dunkel sein.
6. Hauptzustand nach Start ist Resume: aktueller Lernschritt mit Fortschritt und nächster Aktion, nicht ein Modus-Kachelgrid.

### Tablet

Zielviewports: iPad Mini ab 744 px, iPad Pro 11/13, beide Orientierungen.

1. Tablet Landscape nutzt Rail plus einklappbares Seitenpanel und volle Bühne.
2. Tablet Portrait nutzt Header, Bühne und Bottom-Sheet mit Detents.
3. Das Sheet darf Inhalt, Struktur, Atlas oder Fall tragen, aber nur eine Surface zur Zeit.
4. Lernnavigation bleibt sichtbar: Schritt, Fortschritt, Weiter/Zurück.
5. Touch-Targets mindestens 44 x 44 px.
6. Tablet darf dichter sein als Phone, aber nicht das Desktop-Cockpit übernehmen.

### Phone Portrait

Zielviewport: 390 x 844 als Minimum-Hauptfall.

1. Oben steht ein ruhiger Header mit Produktmarke, Schrittkontext und optionalem Theme-/More-Zugang.
2. Die 3D-Bühne bleibt über dem Sheet sichtbar und darf nicht permanent durch Toolbars verdeckt werden.
3. Bottom-Sheet hat mindestens drei sinnvolle Detents: Peek, Halb, Voll.
4. Dock maximal vier direkte Aktionen plus `Mehr`. Empfohlene Default-Aktionen: `Weiter`, `Inhalt`, `Struktur`, `Mehr`.
5. Fall, Atlas, Wiki, Chat, Presenter und Debug liegen hinter `Mehr` oder einem kontextuellen Trigger, nicht als Default-Dock-Icons.
6. Der aktive Lernschritt bleibt der mentale Anker. Explorer ist nur Struktur-Fokus innerhalb dieses Schritts.
7. Bei langen Titeln bricht Text in der Sheet-Zone um; Navigation und Fortschritt dürfen nicht aus dem sichtbaren Bereich verschwinden.

### Phone Landscape

Zielviewport: 844 x 390 und ähnliche kurze Höhen.

1. Kein Bottom-Dock als Hauptsteuerung, weil die Höhe knapp ist.
2. Eine schmale Rail oder kompakte Top-/Side-Control führt zu Lernschritt, Inhalt, Struktur und Mehr.
3. Ein Panel ist collapsible und schmal. Default ist eingeklappt, wenn die Bühne sonst zu klein wird.
4. HUD, Legende und Debug verschwinden in das Panel, wenn sie Anatomie verdecken würden.
5. Der Lernschritt bleibt bedienbar, aber nicht textlastig. Detailtext gehört in Panel oder Sheet.
6. Fehler, Loading und Empty-State müssen die knappe Höhe respektieren: kurze Headline, Grund, Aktion.

## Navigationsmodell

### Start / Resume

1. Primary Action: `Fortsetzen`.
2. Resume zeigt letzten Lernschritt, Fortschritt und nächsten Schritt.
3. Sekundäre Einstiege: Lernpfad wählen, Vortrag folgen, Fall öffnen, freies Erkunden. Diese sind sekundär und dürfen nicht wie vier Hauptapps aussehen.
4. Der alte Launcher-Impuls bleibt verwendbar, aber die Kacheln `Lernen`, `Explorer`, `Fälle`, `Presenter` werden in `Fortsetzen` plus sekundäre Wege umgebaut.

### Aktiver Lernschritt

1. Der Lernschritt ist der Normalzustand.
2. Er enthält Titel, Kapitel/Folie, Fortschritt, Prev/Next und eine kurze didaktische Kernbotschaft.
3. Der Lernschritt steuert Kamera, Highlight, Overlay, Farbpreset und optional eine Scene.
4. Jede Surface muss einen Rückweg zum Lernschritt haben.

### Inhalts-Sheet

1. Das Inhalts-Sheet trägt Text, Quellen, Lernchecks, Abbildungen und Schrittwähler.
2. Es öffnet aus dem aktiven Lernschritt.
3. Auf Phone liegt es im Bottom-Sheet, auf Landscape/Desktop im Panel.
4. Es ersetzt keine Bühne. Es erklärt den sichtbaren 3D-Zustand.

### Strukturfokus

1. Strukturfokus ersetzt den alten Explorer-Default.
2. Er zeigt Suche, Strukturbaum, Auswahl, Isolieren, Reset und kurze Bedeutung.
3. Default-Umfang ist lernnah: Kapitel-11-relevante Strukturen zuerst.
4. Fortgeschrittene Werkzeuge wie Cut-Planes, komplette Ontologie und Raw-Atlas liegen hinter Progressive Disclosure.
5. Tastatur- und Screenreader-Pfad sind Pflicht.

### Atlas-Supplement

1. Atlas ist kein Startmodus.
2. Atlas öffnet aus einer Struktur, Grafik, Figure-Matrix-Zeile oder einem Lernschritt heraus.
3. Standard: verständliche Areal-Brücke und präzise Referenz. Expert: Layer/Carve, Jülich/DKT/Brodmann/Destrieux.
4. `Atlas auf Hirn` und fsaverage-Brücke bleiben getrennt erklärt: TARO ist didaktische Bühne, fsaverage ist präzisere Zweitsicht.
5. Raw-Atlas und Drift-Visualisierung sind Debug/Expert, standardmäßig aus.

### Fall/Phineas-Surface

1. Fälle sind narrative Vertiefungen innerhalb des Lernraums.
2. Phineas Gage ist erster Fall, nicht eigener Hauptmodus.
3. Fall-Surface teilt Bühne, Schritt-Navigation, State-Muster und Rückweg mit dem Unified Mode.
4. Aus Lernschritt oder Vortrag kann ein Fall geöffnet und wieder verlassen werden.
5. Gage-spezifische Schädel-/Stangen-/Läsionsphasen bleiben als Dateninstanz modelliert, nicht als Shell-Sonderfall.

### Präsentationszustand

1. Präsentation ist ein Zustand des Unified Learning Mode.
2. Presenter sieht Timeline, Speaker-Notes, Step-State und Companion-Status.
3. Teilnehmer folgen demselben Lernraum, mit eingeschränkten Steuerflächen.
4. Vortrag, Selbststudium und Fall-Vertiefung teilen Navigations- und State-Sprache.
5. Kein separater Companion-Silo als Parallel-App.

### Wiki und Chat

1. Wiki und Chat sind unterstützende Wissensflächen.
2. Sie öffnen aus dem Lernkontext und behalten den aktuellen Schritt als Bezug.
3. Kein Default-Dock-Slot auf Phone.
4. Chat darf keine 3D-Bühne ersetzen. Er erklärt, fragt ab oder verweist auf sichtbare Struktur.

### Debug / Expert-Layer

1. Debug ist ausblendbar und standardmäßig aus.
2. Expert-Layer darf Raw-Atlas, Objektgraph, Snapshot, Authoring, Import, local state und technische IDs zeigen.
3. Debug darf nie der sichtbare Default für Studierende sein.
4. Expert-Werkzeuge brauchen sichtbare Grenzen: `Expert`, `Debug`, `Authoring`, nicht normale Lernnavigation.

## Mockup-Mapping

### Zielbild, übernehmen oder angepasst übernehmen

| Mockup | Entscheidung | Unified-Mode-Lesart |
|---|---|---|
| `AppFrame.dc.html` | angepasst übernehmen | Topologie übernehmen: Landscape Rail/Panel, Portrait Header/Bühne/Drawer/Dock. Labels und Navigation von Modi zu Surfaces umbauen. |
| `Device Matrix v2.dc.html` | übernehmen | Breakpoint- und Orientierungsvertrag übernehmen. Inhalte von Lernen/Explorer auf Unified States umdeuten. |
| `Viewport 3D v2.dc.html` | übernehmen | Bühne, Loading/Error und ruhige HUD-Sprache sind Zielbild. Explorer-Default wird Strukturfokus. |
| `Zustaende v2.dc.html` | übernehmen | Fail-loud-State-Muster wird Pflicht für Bühne, Panels und Surfaces. |
| `System-Komponenten v2.dc.html` | übernehmen | Komponenten- und Fokusvokabular als Designsystem-Input. |
| `Theme Matrix v2.dc.html` | übernehmen | Hell/Dunkel als gleichwertige Chrome-Themes, Bühne bleibt visuell kontrolliert. |
| `Token-Sheet v2.dc.html` | angepasst übernehmen | Tokenrichtung übernehmen, aber `localStorage`-Persistenz nicht ungeprüft übernehmen. |
| `AtlasErpFrame.dc.html` | angepasst übernehmen | Wird Atlas-/ERP-Supplement, nicht eigener Atlas-Startmodus. |
| `FaelleFrame.dc.html` | angepasst übernehmen | Wird Case-Surface im Lernraum. |
| `PresenterFrame.dc.html` | angepasst übernehmen | Wird Präsentationszustand des Unified Mode. |

### Historische Referenz oder später parken

| Mockup | Entscheidung | Grund |
|---|---|---|
| `LauncherFrame.dc.html` | historisch plus Teilübernahme | Resume-Karte übernehmen, 4-Kachel-Moduslogik verwerfen. |
| `OnboardingFrame.dc.html` | später parken | Selbstlernen/Vortrag folgen ist sinnvoll, aber Auth/Manage-Split ist nicht Kern-Shape. |
| `ifn-nav.js` | angepasst übernehmen | Rail/Dock-Mechanik gut, aber peer destinations `lernen`, `explorer`, `faelle`, `wiki`, `chat` brechen Unified Mode. |
| `ExplorerToolsFrame.dc.html` | angepasst übernehmen | Werkzeug-Patterns behalten, aber nur als Struktur-/Expert-Surface. |
| `FaerbungFrame.dc.html` | angepasst übernehmen | Färbung ist Surface oder Lernschrittzustand, kein eigener Dock-Pfad. |
| `TimelineSnapshotFrame.dc.html` | später parken | Wichtig für Presenter/Snapshot, nicht Start-Scope. |
| `CollectionFrame.dc.html` | später parken | Gehört zu Erweiterbarkeit/Authoring, nicht Normalflow. |
| `WikiFrame.dc.html` | später parken | Wissenssurface, nach Lernkern. |
| `ChatFrame.dc.html` | später parken | Hilfssurface, nach Lernkern und Inhaltsvertrag. |
| `SettingsFrame.dc.html` | später parken | Einstellungen in `Mehr`, nicht Primärnavigation. |
| `ParticipantFrame.dc.html` | später parken | Companion-Follow nach Presenter-Grundvertrag. |
| `PresenterDeckFrame.dc.html` | später parken | Deck-Verwaltung nach Präsentationssequenzen. |
| `Presenter Deck-Import v2.dc.html` | später parken | Import ist Expert/Authoring, kein Lernkern. |
| `AuthoringFrame.dc.html` | später parken | Expert-Schicht. |
| `AdminFrame.dc.html` | historisch parken | Kein Kern für Kapitel-11-Lernmodus. |
| `AuthFrame.dc.html` | historisch parken | Kein Kern, solange kein Nutzer-/Kursmodell im Schnitt liegt. |
| `FaelleBrowserFrame.dc.html` | später parken | Nach erstem Case-Surface, nicht vorher. |
| `Device Matrix - Detail-Surfaces v2.dc.html` | angepasst übernehmen | Surface-Abdeckung nutzen, aber an Unified-Navigation binden. |
| `Device Matrix - Launcher Faelle Onboarding v2.dc.html` | teilweise übernehmen | Cases/Onboarding als Surface, Launcher als Resume. |
| `Device Matrix - Tools Presenter Authoring Auth v2.dc.html` | später parken | Tools/Presenter teils wichtig, Authoring/Auth/Admin nicht Kern. |
| `Device Matrix - Wiki Chat Settings v2.dc.html` | später parken | Unterstützende Surfaces, nicht Start-Scope. |
| `Iflands Neuro - Prototyp.dc.html` | historische Übersicht | Nur als Handoff-Karte, nicht als Produktvertrag. |

### Fehlende visuelle Evidenz

1. Live-Screenshots der aktuellen App für 390 x 844, 844 x 390, 768 x 1024, 1024 x 768, 834 x 1194, 1194 x 834, 1024 x 1366, 1366 x 1024 und 1440 x 900.
2. Live-Screenshots für Launcher, Lernen, Explorer, Phineas und Atlas im aktuellen Runtime-Stand.
3. Phone Landscape mit sichtbarer Bühne und kollabiertem Panel.
4. Tablet Portrait mit Detents und sichtbarem Lernschritt.
5. Loading, Empty, Error und WebGL/GLB-Fehler im realen Viewer.
6. Debug off/on Vergleich, inklusive Raw-Atlas ausgeblendet als Default.
7. Lernschritt mit Atlas-Supplement geöffnet und wieder geschlossen.
8. Fall/Phineas aus Lernschritt geöffnet und zurückgeführt.
9. Präsentationszustand mit Presenter-Notes und Companion-Follow.
10. Vollständige Klassifikation aller 31 Handoff-Frames gegen Produktvertrag und No-Fallback-Inventur.

## Dart-Mapping

| Dart-ID | Aufgabe | Unified-Mode-Zuordnung | Status für Implementierung |
|---|---|---|---|
| `1FIOVY4UH7gm` | Mobile-view-ZIP prüfen | Handoff-Evidenz und Frame-Quelle | Blockiert Code bis Frame-Mapping, Live-Screens und Prototype-State-Entscheidung abgeschlossen sind. |
| `9l0tqUxk6ikN` | Mobile Redesign v2 Shell | Mobile/Tablet-Shell für Unified Mode | Nach Shape-Freigabe und Readiness-Go ausführbar. Nicht als isolierte Mobile-Shell starten. |
| `1rYGOyvdhRm8` | Lernen-Modus Lernpfad | Primärer Lernflow | Erste fachliche Umsetzungsachse nach Gate. Muss `Explorer/Fall/Atlas` als Surfaces aufnehmen. |
| `EQrweA6CmVE8` | Explorer & Ontologie | Strukturfokus-Surface | Nach Lernkern und Shell-Kontrakt. Kein Expertencockpit als Default. |
| `dSfvOVH6Dwoq` | Fallbeispiel-System | Case-Surface, Phineas als erste Instanz | Nach Lernkern/Shell. Datengetrieben, kein separater Hauptmodus. |
| `HfDyMF0aT88a` | Responsive Layout-System | Screen-Vertrag über Desktop, Tablet, Phone Portrait, Phone Landscape | Muss vor visueller V2-Codearbeit als erster technischer Layout-Schnitt laufen, aber erst nach Readiness-Go. |
| `tLMwOp54qQph` | Zustände & Light-Theme | State-Gate für Bühne und Surfaces | Blockiert Code-Qualität. Kein schwarzer Canvas, keine stillen Fehler. |
| `DDlJ2fWUxHw0` | Vortrags-Abdeckung | Präsentationszustand im Unified Mode | Nach Lernkern und Inhalts-/Figure-Matrix. Nicht als separater Presenter-Silo starten. |
| `65FumKKTMius` | Grafik-zu-Areal-Matrix | Atlas-Supplement-Semantik | Input für Atlas-Supplement. In Review, nicht primärer Shell-Blocker. |
| `GEQVM1fqyCkL` | Knowledge Registry | Expert-/Authoring- und Erweiterbarkeits-Surface | Nach Normalflow. Nicht in Erstnutzer-Navigation ziehen. |

### Harte Blocker vor Code

| Dart-ID | Blocker | Warum blockiert |
|---|---|---|
| `AyAovH9EtPL6` | V2-Migrations-Readiness-Gate | Offizielles Go/No-Go vor Code. Aktuell offen. |
| `iBJCrwzOMeU6` | 31 Handoff-Frames vollständig mappen | Ohne Frame-Level-Klassifikation werden Prototype-Flächen ungeprüft übernommen. |
| `I3SsEI0tLcqq` | Live-Screenshot-Set erzeugen | Handoff-Screens sind nur Übersichtsbilder, keine aktuelle App-Evidenz. |
| `nFvwRWp5GPIo` | Prototype-State und No-Fallback-Konflikte bereinigen | 23 Handoff-Dateien referenzieren `localStorage`; darf nicht unkritisch Produktvertrag werden. |
| `n0RsZZ5gXo5X` | Doku-Drift bereinigen | Root-Doku beschreibt noch alte Moduslogik. Unified Mode muss nach Freigabe dokumentiert werden. |
| `B2XryEO9UyxB` | Atlas-Farbarchitektur vollständig bestätigen | In Review, muss als belastbarer Farb-/Scene-Vertrag abgeschlossen sein. |
| `ZwvSdKghcAmK` | No-Fallback-Inventur abschließen | Legacy-/Fallback-/localStorage-Pfade dürfen nicht in V2-Shell wandern. |

## Readiness-Gate

Ergebnis: `FAIL`

Code-Exekution wird nicht empfohlen.

Gründe:

1. Das Handoff-ZIP ist verwendbar, aber noch nicht vollständig frameweise gegen den Unified-Mode-Vertrag klassifiziert.
2. Die vorhandenen 5 PNG-Screenshots sind Übersichtsbilder, keine Live-App-Evidenz.
3. Live-Screenshots der aktuellen App fehlen für die relevanten Viewports, Modi und Zustände.
4. Prototype-State aus den Mockups, besonders `localStorage`, ist noch nicht final als Produktanforderung, Handoff-Mechanik oder zu verwerfen entschieden.
5. Aktuelle Root-/Architekturdoku beschreibt noch die alte Modusfragmentierung. Dieser Shape-Vertrag supersedet sie für V2, ersetzt aber keine spätere Doku-Drift-Bereinigung.
6. Debug/Raw-Atlas Default-off ist als Produktentscheidung klar, aber noch nicht visuell gegen Handoff und Runtime belegt.

## Nächste Schritte

1. `iBJCrwzOMeU6` auf `Doing` setzen und alle 31 Handoff-HTML-Frames frameweise klassifizieren.
2. `I3SsEI0tLcqq` auf `Doing` setzen und das Live-Screenshot-Set der aktuellen App erzeugen.
3. `nFvwRWp5GPIo` auf `Doing` setzen und alle Prototype-State-/`localStorage`-Schlüssel aus dem Handoff entscheiden.

Erst danach kann `AyAovH9EtPL6` ein `Go` prüfen. Wenn dieses Gate `PASS` ist, ist der erste Implementierungsschnitt `HfDyMF0aT88a` als Responsive Layout-System, direkt gefolgt von `1rYGOyvdhRm8` als primärem Lernflow.

## Nicht-Ziele

1. Kein Code-Refactor.
2. Kein direkter HTML-Mockup-Codeimport.
3. Keine Implementierung von Shell, Drawer, Dock, Atlas, Phineas, Presenter, Wiki oder Chat.
4. Keine Änderung an `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md` oder `docs/ARCHITECTURE.md` in diesem Schnitt.
5. Keine Tests, weil keine Code-Dateien geändert werden.
