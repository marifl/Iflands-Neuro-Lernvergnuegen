# V2 Prototype-State-Inventar

Stand: 19. Juni 2026

Quelle: `docs/design-handoff/brain-app-redesign-2026-06-19/handoff/mockups/`. Dieses Inventar entscheidet Handoff-Mechaniken, bevor daraus Runtime-State wird.

## Ergebnis

Kein `ifn-*`-Key aus dem Handoff wird als neuer App-`localStorage`-Key übernommen. Echte Produktanforderungen werden auf den bestehenden `brain-app-settings`-, Snapshot-, URL- oder Config-Vertrag gemappt oder bleiben explizit offen.

## Key-Entscheidungen

| Handoff-Key / Mechanik | Vorkommen | Entscheidung | Zielvertrag / Architektur-Ort | Negativregel |
|---|---|---|---|---|
| `ifn-theme` | viele Frames, `ifn-nav.js`, `Token-Sheet v2.dc.html` | echte Produktanforderung, Handoff-Key verwerfen | `brain-app-settings.display.theme`; Legacy-Key `ed-theme` existiert nur als aktueller Migrationspfad | Kein neuer `ifn-theme`-Bridge-Code |
| `ifn-start-mode` | `OnboardingFrame.dc.html` | teilweise Produktanforderung, Handoff-Key verwerfen | heutiger Ort: `brain-app-settings.start.defaultMode`; V2: Resume/Lernpfad statt peer Modus | Kein Startmodus, der Unified Learning Mode wieder in Silos zerlegt |
| `ifn-reduced-motion` | `OnboardingFrame.dc.html` | Produktanforderung, Handoff-Key verwerfen | `brain-app-settings.accessibility.motion` und `data-motion` über `appearanceRuntime.ts` | Kein paralleler Motion-Key |
| `ifn-contrast` | `OnboardingFrame.dc.html` | Produktanforderung, Handoff-Key verwerfen | `brain-app-settings.display.contrast` und `data-contrast` | Kein paralleler Kontrast-Key |
| `ifn-role` | `AuthFrame.dc.html` | parken | kein aktuelles Nutzer-/Kursmodell; später höchstens `dataAccount.role` oder echtes Auth-Modell | Kein Auth-/Role-Shortcut aus Handoff-HTML |
| `ifn-ruhe` | `SettingsFrame.dc.html`, `a11y.js` | Produktanforderung, Handoff-Key verwerfen | `brain-app-settings.accessibility.quietMode` und `data-quiet-mode`/Appearance-Vertrag | Kein zweiter Ruhemodus-Key |
| `ifn-ruhe-style` | `a11y.js` | reine Handoff-DOM-Mechanik | kein Persistenz-State; Styles gehören in App-CSS/Runtime-Komponenten | Kein dynamisches Style-Tag als Architekturpfad |
| `ifn-nav` Custom Element | `ifn-nav.js` und viele Frames | Handoff-Mechanik, angepasst übernehmen | Pattern für Rail/Dock/Mehr; Umsetzung nur in React Shell nach Gate | Nicht als Web Component in App importieren |
| `ifn-h` | CSS-Klasse in `Iflands Neuro - Prototyp.dc.html` | kein State, nur CSS-Namespace | keine Runtime-Relevanz | Nicht in Produktcode übernehmen |
| statische `.dc.html`-Links | viele Frames | Handoff-Navigation, verwerfen | echte App nutzt URL-Parameter, Viewer-Store, Settings und Snapshots | Keine statische HTML-Routing-Brücke |
| Upload-/PDF-Kontext | `uploads/` | Rohquelle, lesen | Vortrag/Quelle bleibt Raw-Handoff; Ableitung nur über Specs | Nicht als App-Asset importieren |

## Gefundene Vorkommen

- `AdminFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `AppFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `AtlasErpFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `AuthFrame.dc.html`: 4x `localStorage`; Keys: `ifn-role`, `ifn-theme`.
- `AuthoringFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `ChatFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `CollectionFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `ExplorerToolsFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `FaelleBrowserFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `FaelleFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `FaerbungFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `Iflands Neuro - Prototyp.dc.html`: 1x `localStorage`; Keys: `ifn-h`.
- `LauncherFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `OnboardingFrame.dc.html`: 8x `localStorage`; Keys: `ifn-contrast`, `ifn-reduced-motion`, `ifn-start-mode`, `ifn-theme`.
- `ParticipantFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `PresenterDeckFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `PresenterFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `SettingsFrame.dc.html`: 4x `localStorage`; Keys: `ifn-ruhe`, `ifn-theme`.
- `TimelineSnapshotFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `Token-Sheet v2.dc.html`: 1x `localStorage`; Keys: `ifn-theme`.
- `WikiFrame.dc.html`: 2x `localStorage`; Keys: `ifn-theme`.
- `a11y.js`: 3x `localStorage`; Keys: `ifn-ruhe`, `ifn-ruhe-style`.
- `ifn-nav.js`: 2x `localStorage`; Keys: `ifn-nav`, `ifn-theme`.

## Architektur-Entscheidung

1. Aktuelle App-Persistenz bleibt bei `brain-app-settings`, `brain-app-last-app-mode`, `atlas-config-overrides`, Snapshot-/Authoring-Keys und dem Legacy-Key `ed-theme`.
2. Handoff-Keys mit Prefix `ifn-*` sind nicht kanonisch.
3. Wenn V2 eine neue State-Klasse braucht, muss sie vor Code als Settings-, Snapshot-, URL-, Config- oder Server-Vertrag definiert werden.
4. Für den ersten V2-Code-Slice bleibt `localStorage` nur dort erlaubt, wo der bestehende Vertrag es schon explizit trägt.
