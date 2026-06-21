# Spec — Phineas-Gage Case-Study Migration v1→V2-Registry-Launch

> Contract-ID: `2026-06-20-phineas-gage-case-study-migrat`
> Revision: v1 (2026-06-20)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  appMode='phineas' ist ein v1-Spezialmodus mit eigenem Asset-Loader, eigenem
  Rendering-Guard und 8 Feldern im God-Store — widerspricht dem V2-Registry-Launch-
  Vertrag und verhindert Wiederverwendbarkeit für künftige Fallstudien.
why_now: |
  V2-Architektur ist in Dart vollständig spezifiziert (MVP-2 Brief, Wissens-/Layer-
  Registry Plan, Mockup-Asset-Katalog). Codex hat NF-009 abgeschlossen und die
  Codebase ist clean (main@1950825, CI grün). Architecture Review zeigt viewerStore
  (684 LOC, 299 Consumers) und BodyParts3DViewer (1451 LOC) als Top-Refactor-
  Kandidaten — Phineas-Migration ist der chirurgischste erste Schnitt.
symptom_vs_problem: |
  Symptom = Phineas hat einen eigenen Asset-Loader und 8 Store-Felder.
  Problem = Case-Studies haben keinen generischen Pfad; jede neue Fallstudie
  würde denselben Spezialmodus-Fehler wiederholen.
smallest_change: |
  Phineas-Assets über die bestehende ManifestAssetObjects-Pipeline laden,
  TampingIron-Prozedurgeometrie entfernen (GLB only), rod*/skull*-State aus dem
  viewerStore herauslösen, appMode-Typ um 'phineas' reduzieren.
tradeoffs: |
  Alternative A: Komplett-Refactor viewerStore + BodyParts3DViewer gleichzeitig
  — verworfen, weil zu grosser Blast-Radius für einen Contract.
  Alternative B: Phineas als eigenen /faelle-Router bauen (V2 Surface) —
  verworfen, weil das die Surface-Architektur voraussetzt (eigener Epic).
```

---

## Working Principles (Karpathy + FAB — Reminder für Implementer)

1. **Think First** — Frame oben ist die Annahme-Basis. Bei Drift während Implementation: spec.md updaten, nicht silently abweichen.
2. **Simplicity** — `smallest_change` aus dem Frame ist Source of Truth. Keine spekulativen Features über In-Scope hinaus.
3. **Surgical** — Out-of-Scope ist verbindlich. Adjacent-Refactor ist ein separater Contract.
4. **Goal-Driven** — criteria.md `outcome:` Frontmatter (user_signal/observable_in/guardrail/read_horizon) ist Verify-Ziel.

FAB-Bezug: `docs/decisions/ADR-005-fab-design-principles.md` (Gebote II/IX/X greifen besonders).

---

## 1. Motivation und Problem

Der V2-Plan (Dart `RtOlLsY53bkU` Punkt 7) definiert:
> "Registry-Launch-Vertrag bauen: collectionId, contextId, entrypoint;
> Phineas als erster Consumer ohne Spezialmodus."

Anti-Duplikationsregel (gleicher Plan):
> "Keine Phineas-, EEG- oder P7-Sondermodi neben dem generischen Registry-Launch."

MVP-2 Brief (Dart `B4VUwbw6idjF` §6):
> "Do: einen Viewer (src/viewer) für alle Modi. Don't: kein zweiter 3D-Renderer pro Modus."

Der aktuelle Code hat 5 Spezial-Pfade (siehe Frame `problem`), die alle gegen
diese Verträge arbeiten.

## 2. Scope

### In-Scope

- **S1: TampingIron löschen** — Prozedurale Zylinder-Geometrie in BodyParts3DViewer
  entfernen. GLB `phineas-gage-iron-rod.glb` ist die einzige Stangen-Quelle.
- **S2: Phineas-State aus viewerStore extrahieren** — `rodVisible`, `rodPhase`,
  `showSkull`, `skullOpacity` + zugehörige Actions entfernen. Ersatz: Case-Study-
  lokaler Zustand (Komponenten-State oder eigener Mini-Store).
- **S3: Assets über normale Pipeline** — `phineasAssetManifest.ts` löschen.
  Assets laden über `knowledgeRegistry` Collection `case-phineas-gage` +
  `ManifestAssetObjects`. `PhineasGageAssets.tsx` refactorn: kein `appMode`-Guard.
- **S4: appMode='phineas' ersetzen** — Case-Study wird eine Aktivierung statt
  eines Modus. `AppMode`-Typ wird `'learn' | 'explore' | 'atlas'`.
  ModeLauncher-Karte für Phineas bleibt (startet Case-Study-Aktivierung).
- **S5: CaseStudy-Interface (minimal)** — Generisches Interface für Case-Studies,
  orientiert an der V2-Mockup-Datenstruktur (`FaelleFrame.dc.html` Z. 135–142):
  `CaseStudy { id, title, collectionId, steps[], lesionStructures?, source }`.
  `CaseStudyStep { kick, title, body, areas?[], note?, highlight[], showSkull?,
  skullOpacity?, showRod?, rodPhase? }`.
  `PHINEAS_GAGE` wird zur ersten Instanz. Kein Router, kein eigener Store — nur
  das Interface und der erste Consumer. State-Overlays (Loading/Empty/Error) folgen
  dem V2-Zustandsvertrag (`Zustaende v2.dc.html`): laut, nicht still.

### Out-of-Scope

- `/faelle`-Route / Surface-Router (V2 Surface-Architektur → eigener Epic)
- `FaelleBrowserFrame` / mehrere Case-Studies (→ eigener Epic)
- viewerStore-Gesamtrefactor (Architecture Review Kandidat 2 → separat)
- BodyParts3DViewer-Split (Architecture Review Kandidat 1 → separat)
- Presenter-/Companion-Integration
- Snapshot-/Sequence-Roundtrip für Case-Study-State

## 3. Architektur

### Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `src/viewer/BodyParts3DViewer.tsx` | TampingIron löschen (~40 LOC), Rod-Imports bereinigen, ContextSkull-Guard (`appMode !== 'phineas'`) entfernen, Sidebar-Weiche (`appMode === 'phineas'`) auf Case-Study-Aktivierung umstellen |
| `src/viewer/viewerStore.ts` | `rodVisible`, `rodPhase`, `showSkull`, `skullOpacity` + Actions entfernen, `AppMode`-Typ anpassen, `setAppMode`-Cleanup-Logik für rod/skull entfernen |
| `src/viewer/phineasAssetManifest.ts` | **Löschen** |
| `src/viewer/PhineasGageAssets.tsx` | Refactorn: kein `appMode`-Guard, Assets über normale Collection-Sichtbarkeit |
| `src/viewer/PhineasGageScene.tsx` | Auf CaseStudy-Interface anpassen, steuert lokalen Case-Study-State statt viewerStore |
| `src/viewer/PhineasSidebar.tsx` | Zu Case-Study-Sidebar generalisieren |
| `src/viewer/phineasGage.ts` | `CaseStudy`-Interface implementieren, Rod-Geometrie-Hilfsfunktionen bleiben |
| `src/viewer/ManifestAssetObjects.tsx` | `usePhineasManifest()` entfernen |
| `src/viewer/ManifestAuthoringBridge.tsx` | `loadPhineasAssetManifest()`-Import entfernen |
| `src/viewer/appModeDefinitions.ts` | Phineas aus `REGULAR_APP_MODE_DEFINITIONS` entfernen |
| `src/viewer/FooterBar.tsx` | Phineas-Modus-Eintrag anpassen |
| `src/viewer/registryLaunch.ts` | Phineas-Launch über Case-Study-Aktivierung |
| `src/viewer/settingsStore.ts` | `DefaultAppMode` um 'phineas' reduzieren |
| `src/viewer/settingsRuntime.ts` | Phineas-Default-Handling anpassen |
| `src/viewer/viewerStateSnapshot.ts` | `rodPhase`, `rodVisible` aus Snapshot entfernen |
| `src/viewer/contractValidation.ts` | Phineas-State-Felder entfernen |
| `src/viewer/CutPickBridge.tsx` | `rodVisible`-Referenz entfernen |
| `src/viewer/ExplorerLearningFlyout.tsx` | Phineas-Launch auf Case-Study-Aktivierung |
| Tests (diverse) | An geänderte Interfaces anpassen |

### Datenfluss (nachher)

```
ModeLauncher / DeepLink / ExplorerLearningFlyout
  → activateCaseStudy('phineas-gage')
    → Collection 'case-phineas-gage' wird sichtbar (knowledgeRegistry)
    → ManifestAssetObjects lädt Skull + Rod GLBs (normale Pipeline)
    → CaseStudySidebar zeigt PhineasGageScene (Step-Navigation)
    → Step-Wechsel steuert highlight[], Kamera, Asset-Sichtbarkeit
      (lokal, nicht über viewerStore)
```

## 4. Test-Strategie

- **Unit:** CaseStudy-Interface-Validierung, Step-Daten, rodSegmentForPhase (bleibt)
- **Integration:** knowledgeRegistry `case-phineas-gage` Collection existiert und
  hat alle 3 Asset-Slots
- **Typecheck:** `pnpm typecheck` muss Exit 0 sein (AppMode-Typ-Änderung erzwingt
  Bereinigung aller Referenzen)
- **Existing Tests:** Alle 442 Tests müssen grün bleiben
- **Browser-Smoke:** Phineas-Einstieg über ModeLauncher → 6 Schritte navigierbar,
  Schädel + Stange sichtbar, Läsions-Highlights korrekt

## 5. Pflichtlektüre

### Code
- `src/viewer/knowledgeRegistry.ts` — Collection `case-phineas-gage` (bereits registriert)
- `src/viewer/ManifestAssetObjects.tsx` — normale Asset-Pipeline
- `src/viewer/phineasGage.ts` — Step-Daten, Trajektorie, Läsions-Strukturen

### V2-Mockups im Repo
- `raw/v2-redesign/2026-06-19-brain-app-redesign/extracted/FaelleFrame.dc.html` —
  Phineas-Case-UI: Step-Panel (312px Landscape / 300px Portrait-Drawer),
  Kick/Title/Body/Areas-Datenstruktur, Läsions-Overlay-Rechteck pro Schritt,
  Fortschrittsbalken, State-Overlays (Loading/Empty/Error)
- `raw/v2-redesign/2026-06-19-brain-app-redesign/extracted/FaelleBrowserFrame.dc.html` —
  Case-Browser (OUT OF SCOPE, aber informiert das CaseStudy-Interface-Design:
  Grid-Karten, Filter nach Region, Verfügbar/Entwurf-Status)
- `raw/v2-redesign/2026-06-19-brain-app-redesign/extracted/Zustaende v2.dc.html` —
  V2-Zustandsvertrag für Loading/Empty/Error (laut, nicht still)

### V2-Spezifikationen im Repo
- `docs/specs/v2-handoff-frame-mapping.md` — Frame-Entscheidungen:
  FaelleFrame = "angepasst übernehmen", FaelleBrowserFrame = "parken"
- `docs/design-handoff/brain-app-redesign-2026-06-19/README.md` — Handoff-Index

### Dart-Dokumente
- Plan Wissens-/Layer-Registry (`RtOlLsY53bkU`) — V2-Vertrag, Punkt 7+Anti-Duplikation
- MVP-2 Brief (`B4VUwbw6idjF`) — Fälle-Surface-Spec (§3: 6-Schritt-TARO, §6: Do/Don't)
- Funktions- & Vortrags-Architektur (`DrJwwgqshMjn`) — §4: Phineas-Gage-Ist-Zustand
- Mobile Companion Spec (`D553rjSl64Pc`) — §2: Modus-Modell (Lernen/Explorer/Phineas)
- Mockup-Asset-Katalog (`baNXQIjUrnk2`) — Frame-Inventar + Zugriffswege
