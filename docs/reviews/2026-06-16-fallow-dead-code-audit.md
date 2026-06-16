# Fallow-Audit: Dead Code, Duplikate und Agenten-Risiko

Datum: 2026-06-16

Scope: read-only Audit des aktuellen lokalen Worktrees in
`/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone`.
Es wurde kein Code geändert. Dieser Bericht ist die einzige neue Repo-Datei.

## Kurzfazit

Die Sorge ist berechtigt, aber nicht gleichmäßig verteilt:

1. **Höchstes Agenten-Risiko:** Es gibt produktiv aussehende Dateien, die aktuell nicht im Runtime-Pfad hängen. Besonders klar ist das bei `AtlasTreeBrowser.tsx` und `AtlasFacetPanel.tsx`: Fallow-Trace zeigt `reachable=false`, `imported_by=[]`, Export-Referenzen `0`. Die Dateien sind laut SP4-Plan gewollt, aber Task 5/6 Verdrahtung ist offen. Agents können hier leicht "weiterarbeiten", ohne dass die App davon etwas nutzt.
2. **Test-only Slices:** Mehrere Datenverträge und Stores sind im normalen Fallow-Graph erreichbar, aber im `--production`-Scan unused. Das betrifft u. a. `atlasConfigStore.ts`, `configExport.ts`, `authoringScene.ts`, `knowledgeRegistry.ts`, `sequenceTargetRef.ts`, `timelineChannels.ts` und `timelineDocument.ts`. Das ist nicht automatisch Müll, aber ein klares Signal: Diese Dateien sind derzeit eher Contracts/Prototypen/Testflächen als aktive Runtime.
3. **Script-Graph ist unscharf:** Fallow meldet viele `scripts/atlas/*.mjs` als unused files. Einige sind echte manuelle Werkzeuge oder Test-/Smoke-Skripte, aber nur `scripts/atlas/build-config.mjs` ist über `apps/brain-app/package.json` als App-Script sichtbar. Wenn diese Scripts wichtig bleiben, brauchen sie explizite Script-Einträge, Doku oder Fallow-Konfig, sonst wirken sie für Agents wie Löschkandidaten.
4. **Duplikation ist real:** Mild-Scan: 6,7 Prozent duplizierte Lines, 65 Clone-Gruppen. Semantic-Scan: 19,0 Prozent duplizierte Tokens, 80 Clone-Gruppen. Schwerpunkte liegen in Smoke-/Atlas-Skripten, Authoring/Timeline-Validatoren und UI-Strukturen wie `AnimationPlayer.tsx` vs. `PhineasGageScene.tsx`.
5. **Nicht alles ist kaputt:** Keine unresolved imports, keine unlisted/unused dependencies, keine circular dependencies, keine re-export cycles. Die vielen ähnlich benannten `.ts`/`.tsx`-Files sind überwiegend normale Test-Paare.

## Arbeitsstand und Einschränkung

Der Worktree war vor dem Audit bereits dirty:

| Status | Anzahl |
|--------|--------|
| Geänderte Dateien | 19 |
| Unversionierte Dateien | 17 |
| Gesamt | 36 |

Der Bericht bewertet also den aktuellen lokalen Zustand, nicht einen sauberen
Branch-Stand. Das ist für deine Frage sinnvoll, weil genau dieser Zustand die
Gefahr für Agents erzeugt.

## Tool-Evidenz

Archex wurde zuerst genutzt, wie im Repo gefordert:

```bash
archex analyze . --format markdown -l typescript
archex query . "Which TypeScript modules in apps/brain-app/src/viewer/atlas and apps/brain-app/src/viewer look like authored or planned surfaces but are not wired into the runtime import graph yet? Focus on AtlasTreeBrowser, AtlasFacetPanel, atlasConfigStore, configExport, authoringScene, knowledgeRegistry, timelineDocument, sequenceTargetRef." --strategy hybrid --format markdown -l typescript --budget 12000
```

Fallow wurde für die eigentliche statische Analyse mit `pnpx fallow` genutzt:

```bash
pnpx fallow --version
pnpx fallow list --entry-points --plugins --format json --quiet --explain
pnpx fallow dead-code --format json --quiet --explain
pnpx fallow dead-code --format json --quiet --production --explain
pnpx fallow dead-code --format json --quiet --explain --include-entry-exports
pnpx fallow dupes --format json --quiet --explain --mode mild --top 80
pnpx fallow dupes --format json --quiet --explain --mode semantic --top 80
pnpx fallow health --format json --quiet --explain --score --top 80 --file-scores --hotspots
pnpx fallow health --format json --quiet --explain --complexity --top 50
```

Version der eigentlichen `pnpx`-Runs: `fallow 2.96.0`, signed binary.

## Fallow-Zusammenfassung

### Dead Code

| Kategorie | Befund |
|-----------|--------|
| Total issues | 98 |
| Unused files | 35 |
| Unused exports | 42 |
| Unused types | 17 |
| Unused class members | 3 |
| Duplicate exports | 1 |
| Unresolved imports | 0 |
| Unlisted dependencies | 0 |
| Unused dependencies | 0 |
| Circular dependencies | 0 |
| Re-export cycles | 0 |

Der strengere Scan mit `--include-entry-exports` erhöht die Zahl auf 102 Issues
und findet zusätzlich ungenutzte Entry-Exports:

| Datei | Export |
|-------|--------|
| `apps/brain-app/playwright.config.ts` | `default` |
| `apps/brain-app/tailwind.config.ts` | `default` |
| `packages/brain-runtime/src/index.ts` | `createRuntimeMarker` |
| `packages/theme-tokens/src/index.ts` | `tokenPrefix` |

Bei Config-Dateien sind `default`-Exports sehr wahrscheinlich Tool-Konvention.
`createRuntimeMarker` und `tokenPrefix` sind dagegen echte API-Oberflächen, die
derzeit keine interne Nutzung haben.

### Duplikation

| Scan | Befund |
|------|--------|
| Mild | 65 Clone-Gruppen, 143 Instanzen, 1.306 duplizierte Lines, 6,73 Prozent Duplikation |
| Semantic | 80 Clone-Gruppen, 205 Instanzen, 3.682 duplizierte Lines, 18,97 Prozent Duplikation |

### Health

| Kennzahl | Wert |
|----------|------|
| Health Score | 59,9 |
| Grade | C |
| Dateien analysiert | 180 |
| Funktionen analysiert | 2.177 |
| Funktionen über Threshold | 106 |
| Critical Complexity Findings | 29 |
| High Complexity Findings | 23 |
| Moderate Complexity Findings | 54 |

Top-Hotspots laut Fallow:

| Datei | Grund |
|-------|-------|
| `apps/brain-app/src/viewer/BodyParts3DViewer.tsx` | höchster Hotspot-Score, 1.157 LOC, komplexer Runtime-Knoten |
| `apps/brain-app/src/viewer/viewerStore.ts` | hoher Fan-in, häufig geändert, zentraler Zustand |
| `apps/brain-app/src/viewer/AtlasOverlay.tsx` | häufig geändert, Render-/Atlas-Grenze |
| `apps/brain-app/src/viewer/StructureTree.tsx` | 410 LOC, komplexe UI-Logik |
| `apps/brain-app/src/viewer/FooterBar.tsx` | 412 LOC, UI-Entscheidungslogik |

## Kritische Agenten-Risikozonen

### P1: SP4-Dateien angelegt, aber nicht verdrahtet

Diese Dateien sehen produktiv aus, sind aber im Runtime-Graph aktuell nicht
angeschlossen:

| Datei | Fallow-Trace | Interpretation |
|-------|--------------|----------------|
| `apps/brain-app/src/viewer/atlas/AtlasTreeBrowser.tsx` | `reachable=false`, `imported_by=[]`, `AtlasTreeBrowser#0` | Harte Dead-Code-Fläche. Laut SP4-Plan sollte sie in `CanonicalAtlasMode.tsx` verdrahtet werden, Task 5 ist offen. |
| `apps/brain-app/src/viewer/atlas/AtlasFacetPanel.tsx` | `reachable=false`, `imported_by=[]`, `AtlasFacetPanel#0` | Harte Dead-Code-Fläche. Ebenfalls SP4 Task 5, aber keine Runtime-Nutzung. |

Wichtig: Das ist nicht automatisch "löschen". Die vorhandenen Pläne sagen klar,
dass diese Komponenten gebaut wurden, aber die Verdrahtung offen ist:

1. `docs/superpowers/plans/2026-06-15-sp4-drilldown-ui.md` markiert Tasks 1-4 als fertig.
2. Task 5 `CanonicalAtlasMode.tsx` Verdrahtung ist offen.
3. Task 6 `AtlasOverlay.tsx` Carve-Sync ist offen.

Für Agents heißt das: **Nicht an `AtlasTreeBrowser.tsx` oder
`AtlasFacetPanel.tsx` weiterpolieren, bevor die Verdrahtung bewusst entschieden
ist.** Sonst entsteht Arbeit an einer Insel.

### P1: Test-only Contracts und Prototypen

Diese Dateien sind im normalen Graph erreichbar, aber im Production-Scan unused.
Sie werden aktuell durch Tests, andere test-only Contracts oder Doku getragen,
nicht durch die laufende App:

| Datei | Aktuelle Nutzung laut Trace | Risiko |
|-------|-----------------------------|--------|
| `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts` | `atlasConfigStore.test.ts`, `configExport.test.ts` | Store für SP4-Schicht 2 existiert, aber UI hängt ihn nicht ein. |
| `apps/brain-app/src/viewer/atlas/configExport.ts` | nur `configExport.test.ts` | TOML-Exporter ist validiert, aber kein Save-/Copy-Loop in der UI. |
| `apps/brain-app/src/viewer/atlas/treeState.ts` | `AtlasTreeBrowser.tsx`, `treeState.test.ts` | Von einer unverdrahteten Komponente und Tests genutzt. |
| `apps/brain-app/src/viewer/authoringScene.ts` | Tests, `sequenceTargetRef.ts`, `timelineChannels.ts` | Dokumentierter Authoring-Vertrag, aber kein Runtime-Editor/Loader. |
| `apps/brain-app/src/viewer/sequenceTargetRef.ts` | `timelineChannels.ts`, Tests | Addressierungsvertrag, aktuell nicht in produktiver Sequenzruntime. |
| `apps/brain-app/src/viewer/timelineChannels.ts` | `timelineDocument.ts` | Teil des Timeline-Vertrags, kein Runtime-Pfad. |
| `apps/brain-app/src/viewer/timelineDocument.ts` | nur `timelineDocument.test.ts` | Versionierter Timeline-Vertrag, aber keine App-Nutzung. |
| `apps/brain-app/src/viewer/knowledgeRegistry.ts` | nur `knowledgeRegistry.test.ts` | Registry ist nicht mit Flyout/Explorer verdrahtet. |

Das Muster ist fachlich nachvollziehbar: `docs/ARCHITECTURE.md` beschreibt diese
Dateien als Verträge für spätere Slices. Für Agents ist es trotzdem gefährlich,
weil diese Dateien wie produktive Architektur wirken. Besser wäre ein klarer
Statusmarker in der Doku oder ein Board-Issue: "Contract-only, nicht Runtime".

### P2: Script-Werkzeuge sind für Fallow größtenteils unsichtbar

Fallow meldet diese Dateien als unused files:

```text
apps/brain-app/scripts/bake-structure-coords.mjs
apps/brain-app/scripts/smoke-scenes.mjs
scripts/atlas/atlas_bake.mjs
scripts/atlas/audit_carve_fidelity.mjs
scripts/atlas/bake_carve.mjs
scripts/atlas/bake_carved_atlas.mjs
scripts/atlas/bake_julich_runtime.mjs
scripts/atlas/bake_raw_atlas.mjs
scripts/atlas/build-catalog.mjs
scripts/atlas/build-catalog.test.mjs
scripts/atlas/build-config.test.mjs
scripts/atlas/build_gyrus_correspondence.mjs
scripts/atlas/build_subparcels.mjs
scripts/atlas/carve_cut.mjs
scripts/atlas/carve_cut.test.mjs
scripts/atlas/carve_quality.mjs
scripts/atlas/decode_glb.mjs
scripts/atlas/draco_compress.mjs
scripts/atlas/export_clean_cortex.mjs
scripts/atlas/export_taro_centroids.mjs
scripts/atlas/fit_overlay_affine.mjs
scripts/atlas/inspect_glb_bbox.mjs
scripts/atlas/list_glb_names.mjs
scripts/atlas/smoke-carve.mjs
scripts/atlas/smoke-eeg-p3b.mjs
scripts/atlas/smoke-eeg-p3z.mjs
scripts/atlas/smoke-eeg.mjs
scripts/atlas/smoke-figures.mjs
scripts/atlas/smoke-frontopolar.mjs
scripts/atlas/smoke-preset.mjs
scripts/atlas/smoke-subparcels.mjs
scripts/atlas/subpatch_bake.mjs
scripts/atlas/verify_topology.mjs
```

Das ist kein Löschauftrag. Gerade `build-catalog.mjs`, `build-config.test.mjs`
und die Smoke-Skripte sind aus Repo-Doku und früheren Reviews als relevante
Werkzeuge erkennbar. Das Problem ist die fehlende maschinenlesbare
Erreichbarkeit. Ein Agent, der nur Importgraphen nutzt, kann diese Dateien
falsch einstufen.

Empfehlung: Wichtige Scripts entweder in `apps/brain-app/package.json` als
Scripts eintragen, in einer Tooling-Doku als canonical markieren oder in einer
Fallow-Konfig suppressen/dynamicallyLoaded markieren. Unklare Scripts danach
einzeln prüfen und erst dann löschen.

### P2: Echte Duplikationscluster

Die stärksten semantischen Clone-Gruppen:

| Fingerprint | Dateien | Bewertung |
|-------------|---------|-----------|
| `dup:d459e86d` | `bake-structure-coords.mjs`, `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-figures.mjs` | Gemeinsame Playwright/Three-Scene-Probe-Logik. Guter Kandidat für bewusstes Script-Helper-Modul, falls Scripts bleiben. |
| `dup:19960f5e` | `atlas_bake.mjs`, `bake_carved_atlas.mjs` | Bake-Script-Setup sehr ähnlich. Erst konsolidieren, wenn beide Tools noch gebraucht werden. |
| `dup:d931257a` | `AnimationPlayer.tsx`, `PhineasGageScene.tsx` | UI-Button-/Panel-Struktur offenbar kopiert. Kein Blocker, aber refactorbar, wenn beide Flows stabil sind. |
| `dup:b8808283` | `scene/regions.ts`, `viewer/bucketMeshes.ts` | Semantisch ähnliches Mapping. Das passt zur bekannten Config-Engine-Übergangsphase; nicht blind zusammenlegen. |
| `dup:c310ae86` / `dup:595a4057` | `authoringScene.ts`, `timelineChannels.ts`, `timelineDocument.ts` | Validator-/Parser-Muster wiederholt sich in contract-only Dateien. Erst nach Runtime-Entscheid zusammenziehen. |
| `dup:a47a0b60` / `dup:cd2219ca` | `BodyParts3DViewer.tsx` interne Blöcke | Wiederholung in sehr großem Runtime-Hotspot. Refactor nur mit Browser-Smoke. |

### P2: Komplexität und große Dateien

Größte `.ts`/`.tsx`-Dateien:

| LOC | Datei |
|-----|-------|
| 1157 | `apps/brain-app/src/viewer/BodyParts3DViewer.tsx` |
| 581 | `apps/brain-app/src/viewer/CutPlaneFrameGizmo.ts` |
| 418 | `apps/brain-app/src/viewer/viewerStore.ts` |
| 412 | `apps/brain-app/src/viewer/FooterBar.tsx` |
| 410 | `apps/brain-app/src/viewer/StructureTree.tsx` |
| 399 | `apps/brain-app/src/viewer/cutCapsMerged.ts` |
| 346 | `apps/brain-app/src/viewer/viewerStateSnapshot.ts` |
| 326 | `apps/brain-app/src/viewer/timelineChannels.ts` |
| 325 | `apps/brain-app/src/viewer/authoringScene.ts` |

Top-Komplexitätsfunktionen laut Fallow:

| Datei | Funktion | Cyclomatic | Cognitive | Severity |
|-------|----------|------------|-----------|----------|
| `scripts/atlas/build-config.mjs` | `validateFigureFields` | 62 | 47 | critical |
| `apps/brain-app/scripts/smoke-scenes.mjs` | `assessCameraContract` | 58 | 37 | critical |
| `apps/brain-app/src/viewer/BodyParts3DViewer.tsx` | `BodyParts3DViewer` | 53 | 71 | critical |
| `apps/brain-app/src/viewer/atlas/configExport.ts` | `toTomlConfiguration` | 51 | 34 | critical |
| `scripts/atlas/build-catalog.mjs` | `buildCatalog` | 31 | 69 | critical |
| `apps/brain-app/src/viewer/StructureTree.tsx` | `StructureTree` | 23 | 34 | critical |

Hier gilt: Nicht als nebenbei-Refactor anfassen. Das sind zentrale oder
tooling-kritische Knoten; jede Änderung braucht einen engen Zweck und frische
Tests/Browser-Smoke.

## Was eher unkritisch ist

1. Die ähnlich benannten `.ts`/`.tsx`-Dateien sind größtenteils normale
   Produktions-/Test-Paare (`foo.ts` + `foo.test.ts`).
2. Fallow findet keine Importauflösungsfehler.
3. Fallow findet keine Dependency-Hygiene-Probleme.
4. Fallow findet keine Zyklen im Importgraph.
5. `bonusContexts.ts` ist ein Gegenbeispiel für einen live genutzten Vertrag:
   Trace zeigt Nutzung durch `ExplorerLearningFlyout.tsx`, Tests und
   `knowledgeRegistry.ts`.

## Konkrete Empfehlung

1. **Agenten-Leitplanke setzen:** Vor neuer Arbeit an `viewer/atlas/*`,
   `authoringScene*`, `timeline*`, `knowledgeRegistry*` muss der Agent zuerst
   den Runtime-Importpfad oder den offenen Planstatus prüfen. Keine Arbeit an
   test-only Slices ohne Verdrahtungsziel.
2. **SP4 bewusst entscheiden:** Entweder Task 5/6 fertig verdrahten
   (`CanonicalAtlasMode.tsx`, `AtlasOverlay.tsx`, Browser-Smoke) oder die
   angelegten SP4-Komponenten als "paused contract/prototype" markieren. Der
   jetzige Zwischenzustand ist die größte Falle.
3. **Scripts klassifizieren:** Eine kleine `docs/tooling`- oder
   `package.json`-Script-Liste anlegen: canonical, legacy, one-shot, delete
   candidate. Danach erst Löscharbeit.
4. **Fallow-Konfig erst nach Klassifikation:** Nicht sofort suppressen. Erst
   klären, welche Findings echte Dead-Code-Flächen sind. Danach gezielt
   suppressen, damit künftige Agents ein scharfes Signal bekommen.
5. **Kein `fallow fix` im aktuellen Zustand:** Die automatischen
   Remove-Export-Actions wären hier zu grob. Viele Findings liegen in
   halbfertigen Slices, Tool-Skripten oder öffentlichen Package-Entry-Exports.
6. **Cleanup als eigene Issues schneiden:** Ein Issue für SP4-Verdrahtung,
   eins für script inventory, eins für contract-only Marker, eins für
   Duplication in Smoke-Skripten. Nicht alles in einem Refactor.

## Kandidatenlisten

### Harte Dead-Code-Kandidaten im App-UI-Bereich

| Datei | Status |
|-------|--------|
| `apps/brain-app/src/viewer/atlas/AtlasTreeBrowser.tsx` | nicht importiert, SP4 Task 5 offen |
| `apps/brain-app/src/viewer/atlas/AtlasFacetPanel.tsx` | nicht importiert, SP4 Task 5 offen |

### Production-unused Source-Dateien

| Datei | Interpretation |
|-------|----------------|
| `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts` | SP4 Store, test-only |
| `apps/brain-app/src/viewer/atlas/configExport.ts` | Exporter, test-only/UI fehlt |
| `apps/brain-app/src/viewer/atlas/treeState.ts` | von unverdrahtetem Tree + Test getragen |
| `apps/brain-app/src/viewer/authoringScene.ts` | dokumentierter Contract, kein Runtime-Loader |
| `apps/brain-app/src/viewer/knowledgeRegistry.ts` | Registry test-only |
| `apps/brain-app/src/viewer/sequenceTargetRef.ts` | Contract-chain, keine Runtime-Sequenz |
| `apps/brain-app/src/viewer/timelineChannels.ts` | Contract-chain |
| `apps/brain-app/src/viewer/timelineDocument.ts` | Timeline-Contract, test-only |

### Unused Exports mit hohem Aufräumwert

Diese Exports sind gute spätere Prüfkandidaten, aber nicht automatisch zu
löschen:

| Datei | Export |
|-------|--------|
| `apps/brain-app/src/scene/cameraPresets.ts` | `CAMERA_DIRECTIONS` |
| `apps/brain-app/src/scene/regions.ts` | `REGION_MESHES`, `RegionSlug` |
| `apps/brain-app/src/useMediaQuery.ts` | `useMediaQuery`, `NARROW_QUERY`, `PHONE_QUERY` |
| `apps/brain-app/src/viewer/bucketMeshes.ts` | `BUCKET_MESHES` |
| `apps/brain-app/src/viewer/cutCapsMerged.ts` | `axisNormal`, `cutCapsPlanesSignature` |
| `apps/brain-app/src/viewer/cutPick.ts` | `meshCutProbeScore` |
| `apps/brain-app/src/viewer/cutPickTargets.ts` | `isAtlasTarget`, `collectCutPickTargets` |
| `apps/brain-app/src/viewer/ontology.ts` | `buildJulichTree`, `functionSystem` |
| `apps/brain-app/src/viewer/phineasGage.ts` | `ROD_OVERSHOOT`, `PhineasStep` |

## Prüfbefehl für spätere Wiederholung

Wenn du diesen Audit später frisch wiederholen willst:

```bash
FALLOW_AGENT_SOURCE=codex pnpx fallow dead-code --format json --quiet --explain
FALLOW_AGENT_SOURCE=codex pnpx fallow dead-code --format json --quiet --production --explain
FALLOW_AGENT_SOURCE=codex pnpx fallow dupes --format json --quiet --explain --mode semantic --top 80
FALLOW_AGENT_SOURCE=codex pnpx fallow health --format json --quiet --explain --score --top 80 --file-scores --hotspots
```

Danach bei jedem Löschkandidaten erst:

```bash
FALLOW_AGENT_SOURCE=codex pnpx fallow dead-code --trace-file <path> --format json --quiet --explain
rg -n "<symbol-or-file-stem>" apps/brain-app scripts docs packages
```

Erst wenn beide Sichten bestätigen, dass der Code weder Runtime-, Script- noch
Doku-/Plan-Status hat, ist Löschen vertretbar.
