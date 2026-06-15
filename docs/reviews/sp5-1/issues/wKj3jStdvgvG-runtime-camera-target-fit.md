# wKj3jStdvgvG Runtime-Mapping

## Scope
- Mapping-only-Bericht für den Laufzeit- und Build-Pfad von `camera.target` und `fit = 'target'`.
- Fokus:
  - Atlas-TOML/Schema/Build-Output
  - `targetMeshesForCamera` / `computeEffectiveConfig`
  - Scene-Store-/Ladepfad der Kamera
  - `CameraRig` und `resolveCameraTarget`
  - `smoke-scenes` und Vitest-Lücken/Abdeckung

## Mapped Paths

1) Build/Pipeline (TOML → JSON)
- `scripts/atlas/config.default.toml` definiert Kamera-Felder inklusive `target`, `fit`, `shot`, `margin`, `fov`; z. B. `camera.target` + `fit = "target"` in Konfigurationen wie `broca-areal`.
  - `scripts/atlas/config.default.toml:182-185`
- Build-Validator (`scripts/atlas/build-config.mjs`) setzt Kamera-Schema-Keys und erlaubte Fits:
  - `CAMERA_KEYS` enthält `target`, `shot`, `fit`, `margin`, `fov`, `pose` (`:63-65`).
  - `CAMERA_FITS` erlaubt nur `bounds` und `target` (`:75`).
  - `validateFigureFields` prüft `c.camera.target` auf gültige Areale und `camera.fit` auf Membership (`:435-443`).
- Build-Output:
  - `buildConfig()` lädt `config.default.toml` und validiert gegen Katalog (`:594-599`).
  - `main()` schreibt `public/assets/atlas-canonical/atlas-config.json` (`:604-606`).
- TS-Contract für Kamera im Laufzeitkonfig-Modell:
  - `ConfigCamera.fit?: 'bounds' | 'target'` und `target?: string` (`apps/brain-app/src/viewer/atlas/atlasConfig.ts:13-20`).

2) URL-/Konfig-Resolver (`useEffectiveConfig`)
- `computeEffectiveConfig()` leitet `activeConfiguration` aus `?config`/local/Datei ab und berechnet `cameraTargetMeshes` nur über `targetMeshesForCamera(catalog, activeConfiguration, cfg.camera ?? {})` (`:176-210`, `:207-208`).
- `targetMeshesForCamera()`:
  - liefert leer zurück, wenn `camera.fit !== 'target'` (`:164-166`).
  - wirft bei `fit='target'` ohne `camera.target`, unbekanntem Target oder `hosts.length === 0` (`:166-170`).
- `useEffectiveConfig()` liest `atlas-config.json` und Atlas-Katalog, setzt Effektiv-Config und subscribed auf `popstate` + `ROUTE_CHANGE_EVENT` (`:222-235`).

3) Scene-Store-Laufzeitpfad (Lernmodus)
- Szenen laden: `loadScenes()` baut `LoadedScene` mit optionaler `configCamera` aus der zugehörigen Konfiguration (`apps/brain-app/src/scene/scenes.ts:70-75`, `16-22`).
- Scene-Store persistiert Kamera getrennt als `cameraShot` und `cameraConfig` (`apps/brain-app/src/scene/sceneStore.ts:5-15`).
- `LearnSidebar` schreibt bei Szenenwechsel `setCameraShot(scene.brain.camera)` und `setCameraConfig(scene.configCamera ?? null)` (`apps/brain-app/src/scene/LearnSidebar.tsx:39-44`).
- Zusätzlich schreibt `LearnSidebar` bei jeder Änderung `replaceCanonicalLocation(...)` (`apps/scene/router.ts:44-48` via `apps/brain-app/src/scene/LearnSidebar.tsx:58-60`), wodurch die URL in einen `?config=<configName>&scene=<id>&step=...` Zustand kommt.

4) `CameraRig`-Auflösung
- Kamerakonfigurationen werden in dieser Reihenfolge priorisiert: `figureCameraConfig` (URL-Konfiguration) > `sceneCameraConfig` > `legacy shot` (`apps/brain-app/src/scene/CameraRig.tsx:53-57`).
- `targetBounds` wird als Union-Union nur aus `figureTargetMeshes` (`effectiveConfig.cameraTargetMeshes`) gebildet (`:85-87`).
- Bei `cameraConfig.fit === 'target'` und fehlenden `targetBounds` wird der Effekt vor `resolveCameraTarget` abgebrochen (`:87-88`).
- Danach wird `resolveCameraTarget()` aufgerufen (`:88-94`).

5) `resolveCameraTarget` (`fit='target'`-Semantik)
- `fit` defaultet auf `'bounds'`; gültig sind nur `bounds|target` (`:45-49`, `:72-74`).
- Bei `fit='target'` wird `input.targetBounds` statt `input.bounds` genutzt (`:73-74`).
- Fehlt `targetBounds`, wird ein Fehler geworfen (`:74`, `75-77`).
- `resolveCameraTarget` ist damit die zentrale Laufzeit-Formel für Zielraum und Distanz.

6) Smoke/Test-Anbindung
- `smoke-scenes.mjs` liest `atlas-config.json` plus jede scene-Konfiguration und vergleicht gegen den erwarteten Kamerakonfig (`CAMERA_FIELDS`, `cameraConfigMatches`) (`:10-12`, `:47-50`).
- Es nutzt `window.__CAMERA_RIG__` und prüft in `assessCameraContract` u. a.:
  - `debug.source === 'figure'`
  - `debug.config` passt zum erwarteten Szenenkonfig
  - bei `fit === 'target'`: `debug.targetBounds` vorhanden, `figureTargetMeshes` vorhanden, und `resolved.target == targetBounds.center` (`:107-123`).
- Vitest-Abdeckung:
  - `apps/brain-app/src/scene/cameraResolve.test.ts` prüft `fit='target'`, Targetswitch und Fehlerpfad ohne `targetBounds` (`:33-43`, `:88-92`).
  - `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts` prüft `computeEffectiveConfig()` + `cameraTargetMeshes` inkl. fit-target-Kette (`:126-139`).
  - `apps/brain-app/src/scene/scenes.test.ts` prüft, dass aus Configs `configCamera` geladen wird (derzeit primär `fit='bounds'`) (`:69-87`).

## Current Behavior
- Die Build-Pipeline validiert und serialisiert `camera.target`/`fit='target'` sauber nach `atlas-config.json`.
- Der aktive Runtime-Resolver nutzt `camera.target` implizit über `computeEffectiveConfig -> targetMeshesForCamera -> cameraTargetMeshes -> CameraRig -> resolveCameraTarget`.
- `CameraRig` setzt `fit='target'` nur dann korrekt auf Zielbounds um, wenn `figureTargetMeshes` vorhanden sind; bei fehlenden Ziel-Meshes wird bewusst verworfen (`return` vor `resolveCameraTarget`).
- `camera.target` aus der **scene-config (nicht URL-`activeConfiguration`)** landet aktuell in `cameraConfig`, aber nicht in `figureTargetMeshes`; deshalb bleibt der Target-Mesh-Resolver auf den Figurenpfad gebunden.
- Ergebnis: `camera.target/fit='target'` wird im UI-Vertrag primär nur dann verlässlich aktiv, wenn der aktive Konfigurationskatalog über `useEffectiveConfig()` (URL/State) befüllt wurde.

## Test/Smoke Gaps
- Smoke validiert einen starken Vertrag (`fit`, `targetBounds`, `figureTargetMeshes`) aber erwartet in der aktuellen Form stets `debug.source === 'figure'`; das macht den Scene-only-Pfad (`sceneCameraConfig` als Quelle) schwerer beobachtbar (`apps/brain-app/scripts/smoke-scenes.mjs:107-110`).
- Die VITEST-Suite deckt `computeEffectiveConfig`/`resolveCameraTarget` für `fit='target'` ab, aber nicht die echte `CameraRig`-Integrationskante (z. B. „scene-only config with fit=target => targetBounds derived from figureMesh list“).
- `scenes.test.ts` nutzt in seinem Haupt-Loader-Case nur `fit='bounds'`-Configs (`:19`, `:83-87`) und validiert damit `fit='target'` nicht im Scene-Ladepfad.
- `resolveCameraTarget`-Schutz gegen fehlendes `targetBounds` ist per Unit-Test abgedeckt; es gibt keinen End-to-End-Test, der demonstriert, dass ein echter Scene-`camera.target` im Lernmodus nach der ersten Navigation korrekt zum Ziel-Framing führt.

## Recommended Minimal Slice
1. Erweitere die Scene-Laufzeitbeobachtung gezielt, ohne neue Kamera-Implementierung:
   - In `CameraRig` einen Fallback für `figureTargetMeshes` einführen, der bei aktivem `cameraConfig.fit === 'target'` und fehlender Figuren-Kamera explizit auch `sceneCameraConfig`/`sceneTargetMeshes` berücksichtigt.
2. Füge einen kleinen integrierten Beleg hinzu:
   - In `apps/brain-app/src/scene/scenes.test.ts` mindestens einen Testfall mit `camera: { target: ..., fit: 'target', shot: ... }` in `configNode`.
   - Assertion: geladenes `LoadedScene` behält diese Config und enthält zusätzlich die erwartete Ziel-Mesh-Auflösung.
3. Erweitere Smoke nicht-zerstörend um `?scene=<id>`-Pfadprüfung:
   - Assert, dass der `fit='target'`-Pfad bei `?scene` (noch vor Konfig-Canonisierung) korrekt in `window.__CAMERA_RIG__` landet (insb. `resolved.target`, `resolved.fit`, `resolved.margin`, `targetBounds` vorhanden).

## Skeptischer Review

### Findings

1. High: `CameraRig` behandelt weiterhin jede `effectiveConfig.activeConfiguration` als Figure-Quelle und nicht nur eine URL-`config`. Damit ist die zugesagte Präzedenz "aktive URL-Config -> figure target meshes, sonst scene target meshes" nicht vollständig umgesetzt. `computeEffectiveConfig()` liefert das Unterscheidungsmerkmal bereits explizit als `hasUrlConfig` mit (`apps/brain-app/src/viewer/atlas/atlasConfig.ts:140-148`, `apps/brain-app/src/viewer/atlas/atlasConfig.ts:183-207`), aber `CameraRig` ignoriert dieses Flag und priorisiert `figureCameraConfig` schon dann, wenn irgendeine aktive Configuration existiert (`apps/brain-app/src/scene/CameraRig.tsx:56-61`). Folge: Ein persistiertes `atlas-config-overrides.configuration` kann den neuen Scene-Fallback auf `?scene=...`-Links weiterhin verdrängen, bis der kanonische URL-Refresh gewinnt. Das ist genau die Kante, die SP5.1 schließen sollte. Abdeckung dafür fehlt: weder `cameraResolve.test.ts`, noch `scenes.test.ts`, noch der Smoke prüfen diese Präzedenz mit gesetztem Local-Override.

2. Medium: Der neue Smoke beweist den Scene-Fallback nicht, obwohl das die wichtigste Integrationskante dieser Änderung ist. `assessCameraContract()` verlangt hart `debug.source === 'figure'` (`apps/brain-app/scripts/smoke-scenes.mjs:107-109`). In meinem instrumentierten Playwright-Lauf auf `http://127.0.0.1:5186/?scene=p3a-konfliktmonitoring` wurde `history.replaceState()` bereits vor dem ersten `__CAMERA_RIG__`-Snapshot aufgerufen; der Smoke beobachtet damit nur den bereits kanonisierten Figure-Pfad, nicht die neue `sceneCameraConfig`/`configCameraTargetMeshes`-Fallback-Branch. Das erklärt, warum die grüne Smoke-Ausgabe Befund 1 nicht widerlegt.

### Residual Risks

- `?scene=`-Deep-Links bleiben rennsensitiv, solange `CameraRig` Figure-Präzedenz nicht an `hasUrlConfig` koppelt.
- Die neue Scene-Target-Mesh-Auflösung ist nur im Loader und in der final kanonisierten Runtime belegt, nicht im eigentlichen Pre-Canon-Fallback.

### Dart-Status

Nicht auf `Done` setzen. Erst `CameraRig`-Präzedenz auf echte URL-Configs begrenzen und danach einen Test oder Smoke ergänzen, der die `source='scene'`-Branch unter `?scene=...` mit gesetztem Local-Override tatsächlich beobachtet.

### Nachreview

1. High-Finding: Behoben. `selectCameraRigConfig()` bindet Figure-Präzedenz jetzt korrekt an `effectiveConfig.hasUrlConfig` und lässt lokale `activeConfiguration` ohne URL-`config` nicht mehr über `sceneCameraConfig` pinnen (`apps/brain-app/src/scene/cameraRigConfig.ts:15-42`). `CameraRig` nutzt diese Auswahl zentral (`apps/brain-app/src/scene/CameraRig.tsx:55-66`). Der neue Regressionstest deckt genau die frühere Fehlerkante ab: `hasUrlConfig=false` plus lokale `activeConfiguration` plus `scene fit='target'` muss `source='scene'` und die Scene-Target-Meshes wählen (`apps/brain-app/src/scene/cameraRigConfig.test.ts:33-49`).

2. Medium-Finding: Nicht vollständig auf der ursprünglich geforderten Ebene behoben, aber als Blocker ausgeräumt. Der Smoke verlangt weiterhin hart `debug.source === 'figure'` und beobachtet damit die `source='scene'`-Branch nicht direkt (`apps/brain-app/scripts/smoke-scenes.mjs:97-109`). Neu ist aber ein gezielter Unit-Regressionstest auf der Auswahlfunktion, plus die bestehende Scene-Loader-Abdeckung für `configCameraTargetMeshes` (`apps/brain-app/src/scene/scenes.test.ts:115-140`). Damit ist die frühere Verifikationslücke für den konkreten Präzedenzbug ausreichend geschlossen, auch wenn der Smoke diese Branch weiterhin nicht selbst belegt.

3. Verbleibende Blocker: Keine im Scope dieses Issues. Die verbleibende Smoke-Lücke ist eine Abdeckungsschwäche, aber nach dem neuen Regressionstest kein Release-Blocker mehr für SP5.1.

4. Dart-Status: `Done` ist vertretbar. Evidence im Slice: `CameraRig`-Präzedenz korrigiert, Scene-Target-Mesh-Pfad bleibt erhalten, Regressionstest für den früheren Local-Override-Bug vorhanden, und `git diff --check` ist für den geprüften Slice weiterhin sauber.
