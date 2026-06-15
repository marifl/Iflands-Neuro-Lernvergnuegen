# [SP5.1] Config-Links rekonstruieren Farben, Overlays und Schnitte nicht

## Scope

Issue-Mapping für reinen `?config=basalganglienschleifen`-Deep-Link in der Standalone-App.

Fokus:
- Reproduzierbarkeit der visuellen Runtime-Zustände bei Aufruf per URL
- Betroffene Bereiche: URL-Parsing, effektive Config, Regions/Scopes, Farben, Overlays, Schnitte, Kamera, Smoke-Prüfung
- Kein Code-Fix in diesem Schritt, nur Mapping der minimalen Hook-Punkte.

## Files inspected

- `apps/brain-app/src/main.tsx`
- `apps/brain-app/src/scene/router.ts`
- `apps/brain-app/src/scene/LearnSidebar.tsx`
- `apps/brain-app/src/scene/scenes.ts`
- `apps/brain-app/src/scene/CameraRig.tsx`
- `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
- `apps/brain-app/src/viewer/atlas/configExport.ts`
- `apps/brain-app/src/scene/sceneStore.ts`
- `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts`
- `apps/brain-app/src/viewer/viewerStore.ts`
- `apps/brain-app/src/viewer/StructureTree.tsx`
- `apps/brain-app/src/scene/brainBridge.ts`
- `apps/brain-app/src/scene/types.ts`
- `apps/brain-app/src/viewer/CutCaps.tsx`
- `apps/brain-app/src/viewer/FooterBar.tsx`
- `apps/brain-app/src/viewer/AtlasOverlay.tsx`
- `apps/brain-app/src/viewer/atlas/CanonicalAtlasMode.tsx`
- `apps/brain-app/src/viewer/atlas/AtlasFacetPanel.tsx`
- `apps/brain-app/src/scene/cameraResolve.ts`
- `apps/brain-app/src/viewer/colorPresets.ts`
- `apps/brain-app/src/scene/overlays/OverlayPanel.tsx`
- `apps/brain-app/src/scene/router.test.ts`
- `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts`
- `apps/brain-app/src/viewer/atlas/configExport.test.ts`
- `docs/reviews/sp5-1/SP5.1.6-canonical-url-export-review.md`
- `scripts/atlas/smoke-figures.mjs`
- `scripts/atlas/smoke-eeg.mjs`
- `scripts/atlas/smoke-subparcels.mjs`
- `scripts/atlas/smoke-frontopolar.mjs`
- `scripts/atlas/smoke-preset.mjs`

## Current flow for `?config=basalganglienschleifen`

1. URL-Parsing
   - `router.ts` parst Query-Parameter in `sceneId`, `configName`, `step`.
   - `main.tsx` nutzt `parseLocation(window.location.search)`.
   - `main.tsx` behandelt die Kombination als `appMode='explore'` (nicht als Learned/scene mode).

2. Mode + Datenfluss
   - `main.tsx` rendert bei `appMode === 'explore'` den `BodyParts3DViewer`.
   - `BodyParts3DViewer` nutzt bei diesem Modus den Struktur-Explorer-Stack (nicht den Learn-Scope mit Scene-Replay).
   - Es gibt aktuell keinen zentralen Hook in diesem Pfad, der `configName` als aktive Konfiguration direkt in globale Viewer-State-Felder einspeist.

3. Szene-/Sidebar-Pfad (`sceneId`)
   - `LearnSidebar` + `scenes.ts` sind scene-getrieben (`/scenes/<id>.json`) und triggern Highlight-, Region-, Kamera- und CameraShot-Setzlogik.
   - Diese Pipeline wird bei purem `?config=...` nicht genutzt.

4. Effektive Config-Pipeline existiert, wird aber nicht als vollständiger Render-State genutzt
   - `atlasConfig.ts` berechnet `EffectiveConfig` inkl. Kamera, Scopes, Farben, Overlays, Cuts.
   - `viewerStore` hat dafür Actions/State (`setColorOverrides`, `setHidden`, `setIsolated`, `setCuts`, `setAtlas*` etc.).
   - `CameraRig.tsx` konsumiert `useEffectiveConfig` und setzt nur Kamera, außerdem guarded hinter `highlight.length === 0`.
   - Farben/Overlays/Schnitte/Zonen werden im Config-Zweig nicht konsequent aus `effectiveConfig` auf den Viewer-Store gehoben.

5. Ergebnis bei `?config=basalganglienschleifen`
   - Darstellung weicht vom konfigurierenden Canonical-State ab: Link wechselt zwar den Modus, stellt aber nicht automatisch
     *Regions-/Scope-Auswahl*, *Farbkodierung*, *Overlays* und *Schnitte* vollständig wieder her.
   - Bestehende lokale Präferenzen können per Storage/Store-Falls-Backlog den Zustand beeinflussen (siehe Review-Kontext).

## Minimal fix map (Hook-/File-Punkte)

### Must-have für dieses Issue
1. **Config-Eingang im Explore-Modus explizit auflösen und auf UI-Store anwenden**
   - **Hook-Punkt**: `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
   - **Warum**: hier wird der eigentliche Rendermodus für `?config` festgelegt; bisher keine komplette Applikation des URL-Configs.
   - **Aktion**: bei `appMode === 'explore' && configName` einmalig/reaktiv:
     - `useEffectiveConfig(configName)` aktiv nutzen
     - deterministisch in Store schreiben.

2. **Effektive-Konfig-zu-Store-Mapping kapseln**
   - **Hook-Punkt**: neuer kleiner Layer in `apps/brain-app/src/viewer/atlas/atlasConfig.ts` oder `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts`
   - **Warum**: vorhandene `EffectiveConfig` enthält die Daten; wiederverwendbar/isoliert aufzustapeln reduziert Nebenwirkungen.
   - **Aktion**:
     - mappe `scopes` in `setHidden`/`setIsolated`/region tree source
     - mappe `colorOverrides`/`color` auf Viewer-Farbstate
     - mappe Overlay-Flags auf Overlay-Store
     - mappe `cuts` auf `setCuts`.

3. **Kamera-Rekonstruktion explizit für Config-Mode aktivieren**
   - **Hook-Punkt**: `apps/brain-app/src/scene/CameraRig.tsx` (oder zentraler Setup-Hook in `BodyParts3DViewer`)
   - **Warum**: Kamera wird aktuell nur eingeschränkt gesetzt und hängt intern u.a. an Conditions.
   - **Aktion**: Config-basierte Kamera auch dann setzen, wenn der Config-Mode aktiv ist (inkl. robustem Fallback auf Config-Defaults).

4. **URL-Canonicalisierung für reinen Config-Link**
   - **Hook-Punkt**: `apps/brain-app/src/scene/router.ts` + bestehende `toConfigQuery`
   - **Warum**: deterministische Canonical-State-Links für Screenshots/Smoke.
   - **Aktion**: sicherstellen, dass `config`-Pfad ohne `scene` weiterhin korrekt als reine Canonical-Config serialisiert und im Browser wiederholbar ist.

### Risiken / Follow-ups
1. **Storage-Overrides konkurrieren mit URL-Konfig**
   - `atlasConfig`-Merge berücksichtigt Persistenz/Overrides; eine reine URL-Rekonstruktion kann dadurch unvorhersehbar sein.
   - Klären, ob URL im Issue-Kontext Vorrang vor LocalStorage haben soll.

2. **Cross-mode Semantik**
   - Aktuell existiert klarer Unterschied Learn-Flow (`sceneId`) vs Explore-Flow (`?config`).
   - Risiko: Änderung im Explore-Mode kann Nebenwirkungen im normalen Bedienablauf haben.

3. **Scope-Normalisierung / Mapping**
   - Scope- oder Region-IDs können unterschiedliche Typen haben (IDs vs Namen vs Katalog-Mapping).
   - Follow-up: dedizierte Normalisierung vor dem Store-Apply, damit Replays robust sind.

4. **Rendering-/Performance-Risiko bei Komplett-Apply**
   - Bulk-Setzen von hidden/isolated/color/cuts/overlays in einem Renderzyklus kann kurzzeitige Zwischenzustände zeigen.
   - Empfehlung: gebündelte Set-State-Transitions oder Sequenzierung mit stabilem Update-Step.

## Tests/Smokes to run

- `pnpm typecheck` in `apps/brain-app`
- `pnpm test` in `apps/brain-app`
- Browser-Smoke für Config-Link-Rekonstruktion (mind. Basis-Config-Link + Kamera/Schnitt/Farbbestand)
  - Bestehende Script-Vorlagen nutzen (z. B. `scripts/atlas/smoke-figures.mjs`, `scripts/atlas/smoke-subparcels.mjs`, `scripts/atlas/smoke-frontopolar.mjs`)
  - `?config=basalganglienschleifen` explizit im Smoke einbinden bzw. ergänzen.

## Recommendation

Für dieses Issue genügt der kleinste sichere Fix in **zwei Stellen**:
1. Explore-Mode-Config-Einspielung am Rendering-Einstieg (`BodyParts3DViewer`) und
2. ein fokussiertes Mapper-Layer `effectiveConfig -> viewerStore` (farben/overlays/cuts/camera/scopes).

Danach schrittweise Follow-ups für Storage-Priorität und Mode-Trennung, damit URL-Links wirklich reproduzierbar bleiben.

## Critical Review Subagent

### Findings

1. High — `?config=<scene-config>` routet nicht sauber in die Learn-Pipeline weiter, weil die erste Config nach dem Routing stale bleibt.

   `apps/brain-app/src/viewer/BodyParts3DViewer.tsx:93-160` liest `useEffectiveConfig()` und merkt sich zusätzlich `hasConfigUrl` per `useMemo(..., [])`. `apps/brain-app/src/viewer/atlas/atlasConfig.ts:196-206` liest `window.location.search` aber nur einmal beim Mount. Gleichzeitig schreibt `apps/brain-app/src/scene/LearnSidebar.tsx:58-60` bei jedem Szenenwechsel eine neue kanonische URL, und `apps/brain-app/src/scene/CameraRig.tsx:37-38` bevorzugt weiterhin `figureCameraConfig` vor `sceneCameraConfig`.

   Konkrete Reproduktion gegen den laufenden Dev-Server:
   `http://127.0.0.1:5188/?config=vcpt` oeffnet korrekt `?config=vcpt&scene=vcpt&step=0`. Nach `ArrowRight` springt die UI auf `?config=ica-uebersicht&scene=ica-uebersicht&step=0`, aber die Kamera bleibt lateral. Gemessene Blickrichtung nach dem Sprung: `x=-0.9889, y≈0, z=-0.1483`. Ein direkter Einstieg auf `?config=ica-uebersicht` liefert dagegen den erwarteten Superior-Shot mit `x=0, y=-0.9999, z=-0.0027`. Die Ursache ist deterministisch im Code: die erste `effectiveConfig` wird nie an die neue URL angepasst.

   Impact: Punkt 2 ist damit nicht erfüllt. Derselbe stale Snapshot speist in `BodyParts3DViewer.tsx:110-160` auch Schnitte, Carve-Overlay und Farb-Preset, daher ist nicht nur die Kamera betroffen.

2. High — `camera.target` und `fit = "target"` sind weiterhin Runtime-tot.

   Die Autoren-Config nutzt diese Semantik real, nicht nur theoretisch: `scripts/atlas/config.default.toml:182-186`, `218-222` und `351-355` deklarieren `target` plus `fit = "target"` fuer `broca-areal`, `ofc-phineas` und `p3a-konfliktmonitoring`. Im Runtime-Pfad werden diese Felder aber nicht ausgewertet. `apps/brain-app/src/scene/cameraResolve.ts:44-84` validiert zwar `fit`, verzweigt danach aber nie zwischen `bounds` und `target`; `target` wird immer auf `input.bounds.center` gesetzt, und `config.target` wird nirgends gelesen. `apps/brain-app/src/scene/CameraRig.tsx:61-68` uebergibt zudem ausschliesslich `unionBounds(coords, highlight)`.

   Impact: Punkt 1 ist fuer den Kamera-Anteil nur teilweise geloest. Kanonische Links rekonstruieren aktuell hoechstens den Shot um das Highlight-Set, aber nicht das in der Config definierte Zielareal.

### Test- und Verifikationsbewertung

1. Die vorab gelaufenen automatisierten Checks decken `computeEffectiveConfig()`-Praezedenz, Sequenz-Loading, Router-Roundtrips und Mapping-Validierung sinnvoll ab. Die vorhandenen Testdateien `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts`, `apps/brain-app/src/scene/scenes.test.ts`, `apps/brain-app/src/scene/router.test.ts` und `apps/brain-app/src/scene/brainBridge.test.ts` sind fuer diese Teile fail-loud.

2. Die kritischen Regressionspfade oben sind aber nicht abgedeckt. `apps/brain-app/src/scene/cameraResolve.test.ts:6-76` hat keinen Test fuer `camera.target` oder unterschiedliches Verhalten von `fit = "target"` gegenueber `fit = "bounds"`. Es gibt ausserdem keinen Test oder Smoke, der einen `?config=<overlay.scene>`-Einstieg laedt und danach in der Learn-Sequenz weiternavigiert, obwohl genau dort der stale `effectiveConfig`-Fehler sichtbar wird.

3. Zusaetzliche Live-Verifikation in diesem Review: Browser-Repro gegen `pnpm dev --host 127.0.0.1 --port 5188` fuer `?config=vcpt -> ArrowRight -> ica-uebersicht` sowie Vergleich mit direktem `?config=ica-uebersicht`-Einstieg. Der Fehler ist damit nicht nur statisch, sondern zur Laufzeit bestaetigt.

### Rest-Risiken

1. Wahrscheinlich dieselbe Ursache wie Finding 1: Konfigurationsabhaengige Viewer-States aus `ConfigLinkStateApplier` wie `setCuts()`, `setCarveOverlay()` und `setPreset()` bleiben nach einem `?config`-Einstieg ebenfalls auf der zuerst geladenen Config stehen. Fuer die Kamera ist das live bestaetigt; fuer die uebrigen States ergibt es sich direkt aus denselben Zeilen `apps/brain-app/src/viewer/BodyParts3DViewer.tsx:110-160`.

### Verdict

Nicht freigeben. Die URL-Config-Rekonstruktion ist fuer Learn-Routing und zielgerichtete Kamera noch nicht korrekt abgeschlossen.

## Post-Fix Critical Review Subagent

### Status der vorherigen High-Findings

1. Erledigt — der stale-Config-Fehler nach `?config=<overlay.scene>`-Routing ist im geprueften Pfad geschlossen.

   `apps/brain-app/src/viewer/atlas/atlasConfig.ts:219-241` refresht `effectiveConfig` jetzt ueber `popstate` und `brain-app:urlchange`. `apps/brain-app/src/scene/router.ts:44-48` fuehrt `replaceCanonicalLocation()` ein und dispatcht dieses Event nach `history.replaceState()`. `apps/brain-app/src/scene/LearnSidebar.tsx:58-60` nutzt den neuen Helper statt blankem `replaceState`.

   Die neue Smoke-Abdeckung in `apps/brain-app/scripts/smoke-scenes.mjs:107-138` prueft den kritischen Pfad explizit: Einstieg ueber `?config=...`, `ArrowRight`, URL-Wechsel auf die naechste Config und messbare Kamerabewegung. Das adressiert genau die zuvor gemeldete Regression.

2. Erledigt — `camera.target` und `fit="target"` sind im Runtime-Pfad nicht mehr tot.

   `apps/brain-app/src/viewer/atlas/atlasConfig.ts:152-171` leitet fuer `fit="target"` jetzt `cameraTargetMeshes` aus dem Atlas-Katalog ab und wirft laut bei fehlendem Target/Katalogeintrag/Host. `apps/brain-app/src/scene/CameraRig.tsx:61-73` berechnet daraus `targetBounds` und reicht sie an den Resolver weiter. `apps/brain-app/src/scene/cameraResolve.ts:72-88` schaltet fuer `fit="target"` korrekt auf `targetBounds` um.

   Die neuen Tests decken das sinnvoll ab: `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts:114-154` prueft `cameraTargetMeshes`, und `apps/brain-app/src/scene/cameraResolve.test.ts:33-43` prueft den abweichenden Zielpunkt fuer `fit="target"`.

### Verbleibende Findings

Keine.

### Rest-Risiken

1. Nicht-blockierend, ausserhalb des engeren `?config`-Issue-Pfads: `apps/brain-app/src/viewer/BodyParts3DViewer.tsx:104` friert `hasConfigUrl` weiter beim Mount ein. Fuer die hier gefixte `?config`-Navigation ist das ausreichend, weil der Einstieg bereits `config` enthaelt. Falls kuenftig aber auch reine `?scene=`-Einstiege nach der spaeteren Kanonisierung durch `replaceCanonicalLocation()` dieselben config-abgeleiteten Viewer-States wie Carve-Overlay, Farb-Preset oder Cuts erhalten sollen, waere dieser Pfad noch nicht abgedeckt. Die aktuellen Smokes pruefen `config-only-nav`, aber nicht diese Variante.

### Verdict

Freigeben fuer den beschriebenen Issue-Scope. Die beiden zuvor blockierenden High-Findings sind im aktuellen Diff behoben, und die neue Test-/Smoke-Abdeckung trifft die fraglichen Regressionspfade direkt.
