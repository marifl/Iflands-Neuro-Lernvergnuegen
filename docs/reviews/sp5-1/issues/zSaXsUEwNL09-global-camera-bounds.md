# zSaXsUEwNL09 — Globale Kamera-Bounds

## Scope
- Mapping von `DEFAULT_GLOBAL_CAMERA_BOUNDS` bis zur Laufzeit-Kameraausrichtung für globale Views.
- Mapping der Kontrakte `ConfigCamera`, `ConfigView`, `EffectiveConfig`, `build-config`-Validation/Export und test-/smoke-Abdeckung.
- Fokus: ob und wo `camera.bounds.center/radius` die globale Ausrichtung wirklich überschreiben kann.

## Mapped Paths
1. Build-time + Export-Pfad:
- `scripts/atlas/build-config.mjs:63` definiert `CAMERA_KEYS` inklusive `bounds`.
- `scripts/atlas/build-config.mjs:375`, `scripts/atlas/build-config.mjs:379-383` validiert `camera.bounds.center`/`radius` Struktur.
- `scripts/atlas/build-config.mjs:380-381` erzwingt notwendige Keys für `camera.bounds` (`center`, `radius`).
- `scripts/atlas/build-config.mjs:562` prüft `assertKnownKeys(c.camera, CAMERA_KEYS, ...)`, damit `bounds` als offizieller Camera-Key erlaubt ist.
- `scripts/atlas/build-config.mjs:450` erlaubt unbekannte/ungueltige Werte via entsprechende Fehlerpfade (z. B. `camera.bounds.center`, `camera.bounds.radius`).
- `apps/brain-app/src/viewer/atlas/configExport.ts:60-71` serialisiert `camera.bounds.center`/`radius` beim Export.

2. Konfig-Lade-/Merge-Pfad runtime:
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts:13-20` definiert `ConfigCamera` mit optionalem `bounds?: { center, radius }`.
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts:141-149` definiert `EffectiveConfig` mit `camera: ConfigCamera`.
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts:177-208` setzt `camera: cfg?.camera ?? {}` in `computeEffectiveConfig`.
- `apps/brain-app/src/scene/scenes.ts:17-20, 85-90` lädt `config.camera` pro Szene als `configCamera` in `LoadedScene`.
- `apps/brain-app/src/scene/LearnSidebar.tsx:42-44` schreibt beim Szenenwechsel `setCameraShot` + `setCameraConfig(scene.configCamera ?? null)`.
- `apps/brain-app/src/scene/sceneStore.ts:9-14, 23-26` hält `cameraShot`/`cameraConfig` und Setter.
- `apps/brain-app/src/scene/cameraRigConfig.ts:21-27` wählt effektiv `figure` > `scene` > `legacy` als Kamera-Konfigurationsquelle.

3. Kamerarouting für globale Ansicht (`cameraView`):
- `apps/brain-app/src/viewer/viewerStore.ts:53-57` definiert `CameraView { name, nonce }`.
- `apps/brain-app/src/viewer/viewerStore.ts:333-335` bumpet `nonce` in `setCameraView`, sodass derselbe View-Shot erneut getriggert werden kann.
- `apps/brain-app/src/viewer/FooterBar.tsx:12-18, 227-230` triggert globale Shots (`anterior`, `lateral-left`, `superior`, `medial-midline`) nur mit Namen.
- `apps/brain-app/src/scene/CameraRig.tsx:119-127` konsumiert `cameraView`: ruft `resolveCameraTarget` mit `{shot: cameraView.name}` und `bounds: globalCameraBoundsForConfig(cameraConfig)`.
- `apps/brain-app/src/scene/cameraResolve.ts:27-35` liefert Default `DEFAULT_GLOBAL_CAMERA_BOUNDS` (`center [0,12,0]`, `radius 85`) und `globalCameraBoundsForConfig(config)` nimmt `config?.bounds` vor, sonst Default.
- `apps/brain-app/src/scene/cameraResolve.ts:55-93` verwendet für `fit: bounds` den übergebenen `bounds` Block zur Kameraberechnung.

4. Debug/Smoke-Verifikationspfad:
- `apps/brain-app/src/scene/CameraRig.tsx:24-38` schreibt im DEV eine `window.__CAMERA_RIG__`-Debug-Struktur.
- `apps/brain-app/scripts/smoke-scenes.mjs:11` prüft `CAMERA_FIELDS` inkl. `bounds`.
- `apps/brain-app/scripts/smoke-scenes.mjs:97-127` vergleicht bei Nicht-Pose die Übereinstimmung `debug.resolved.target == debug.bounds.center`.

## Current Behavior
- Globaler Shot-Trigger existiert, die globale View startet tatsächlich eine Auflösung über `globalCameraBoundsForConfig(cameraConfig)` (also potenziell konfigurierbar).
- Die wirksame Kameraquelle in `cameraConfig` kann `bounds` tragen (per `figure`-Konfig, s. `computeEffectiveConfig` und `selectCameraRigConfig`).
- Der aktuelle shipped Canonical-Datensatz enthält in den beobachteten Kamera-Blöcken keine `camera.bounds`-Einträge (z. B. `scripts/atlas/config.default.toml:182-186` / `:218-220` und `apps/brain-app/public/assets/atlas-canonical/atlas-config.json` zeigt für die gezeigten Konfigurationen nur `fit/shot/target/margin`).
- Folge: Funktional ist Überschreibung technisch modelliert, aber in den realen Runtime-Daten derzeit nicht genutzt.

## Test/Smoke Gaps
- Kein Testszenario prüft explizit: `cameraView` + per Figure-/Konfig-`camera.bounds` gesteuerte globale Ausrichtung.
- Kein Integrationstest von `cameraView`-Flow, der nach `globalCameraBoundsForConfig`-Override den globalen Kameraversatz validiert.
- `apps/brain-app/src/scene/cameraResolve.test.ts:13-19` deckt `globalCameraBoundsForConfig` isoliert ab, aber nicht den View-Store/CameraRig-Runtimepfad.
- `apps/brain-app/src/scene/CameraRig.tsx`-Effect-Pfad ist durch Tests nur indirekt (`CAMERA_FIELDS` + `bounds-nicht-verwendet`) in `apps/brain-app/scripts/smoke-scenes.mjs:11,126-127` abgebildet; kein Center/Radius-Override-Szenario.
- `configExport`/`build-config` validieren `camera.bounds` (z. B. `scripts/atlas/build-config.test.mjs:345-371`, `apps/brain-app/src/viewer/atlas/configExport.test.ts:38-75`), aber es gibt kein Regressionstest, das einen realen Config-Export → Build → Runtime-Use-Pfad für globale View beweist.

## Recommended Minimal Slice
1. Addresse: ein kleiner integrierter Test, der eine Config mit `camera.bounds.center/radius` nutzt und prüft, dass globaler Shot (`cameraView`) diese Bounds statt `DEFAULT_GLOBAL_CAMERA_BOUNDS` nimmt.
2. Addiere dafür gezielt eine kleine Testscene/Fixture oder einen Playwright-Schritt:
   - setze aktivierte Konfiguration mit `camera.bounds` in Fixture,
   - feuere `setCameraView('anterior')`/entsprechenden Shot,
   - prüfe `__CAMERA_RIG__.bounds` gegen erwartetes Center/Radius.
3. Optionaler Daten-Integrations-Slice: mindestens eine reale/fixture config ohne UI-Änderung mit `camera.bounds` ergänzen und Roundtrip über `build-config -> export -> CameraRig` testen.

## Implementierter Slice
- `ConfigCamera` kennt jetzt optional `bounds: { center, radius }`.
- `build-config` erlaubt `camera.bounds`, verlangt `center` und `radius`, validiert `center` als Vec3 und `radius > 0`.
- `configExport` serialisiert `camera.bounds` als `[configurations.<name>.camera.bounds]`.
- `CameraRig` nutzt für globale `cameraView`-Befehle `resolveGlobalCameraViewTarget()`, das `camera.bounds` vor `DEFAULT_GLOBAL_CAMERA_BOUNDS` nimmt.
- `cameraResolve.test.ts` prüft sowohl Default/Override als auch den globalen View-Resolver gegen Override-Bounds.
- `smoke-scenes.mjs` nimmt `bounds` in den Kamera-Config-Vergleich auf.

## Verifikation
- `pnpm --dir apps/brain-app test --run src/scene/cameraResolve.test.ts src/viewer/atlas/configExport.test.ts src/viewer/viewerStore.test.ts` → 3 Dateien, 18 Tests grün.
- `node --test scripts/atlas/build-config.test.mjs` → 25/25 grün.
- `pnpm --dir apps/brain-app typecheck` → Exit 0.
- `node --check apps/brain-app/scripts/smoke-scenes.mjs` → Exit 0.
- `SMOKE_URL=http://127.0.0.1:5189 node apps/brain-app/scripts/smoke-scenes.mjs` → `ALLE SMOKES GRÜN`.
- `git diff --check` → Exit 0.

## Skeptischer Review
### Nachreview
PASS.

Der fruehere Blocker ist behoben. In `apps/brain-app/src/scene/CameraRig.tsx:92-132` wird `cameraConfig` jetzt in `cameraConfigRef` gespiegelt, und der globale `cameraView`-Effekt haengt nur noch an `[cameraView, camera]`. Damit fuehren Szenen-/Config-Wechsel den letzten globalen Shot nicht erneut aus; gleichzeitig verwendet ein explizit neuer `cameraView`-Trigger die zum Commit-Zeitpunkt aktuelle `cameraConfigRef.current` und damit auch aktuelle Override-Bounds. Die Reihenfolge der Effects im selben Component-Scope ist hier relevant: der Ref-Sync (`:92-94`) steht vor dem globalen View-Effekt (`:124-132`), sodass ein neuer Trigger nicht gegen eine stale Config laeuft.

Der neue Regressionstest in `apps/brain-app/src/viewer/viewerStore.test.ts:35-49` deckt die gewuenschte One-Shot-Semantik auf Store-Ebene sauber ab: `setHighlight()` laesst `cameraView` unveraendert, nur `setCameraView()` erhoeht die Nonce. Zusammen mit `apps/brain-app/src/scene/cameraResolve.test.ts` fuer Default/Override-Resolver und den gruenen Verifikationslaeufen sehe ich im geprueften Slice keinen verbleibenden Korrektheits-Blocker mehr.

Rest-Risiken bleiben testseitig moderat: `apps/brain-app/scripts/smoke-scenes.mjs` loest den Footer-`cameraView`-Pfad weiterhin nicht direkt aus, und der aktuelle Canonical-Datensatz nutzt `camera.bounds` nach wie vor nicht produktiv. Das ist aber nach dem vorliegenden Fix eher eine Coverage-Luecke als ein akuter Release-Blocker fuer `zSaXsUEwNL09`.

Dart kann fuer dieses Issue auf Done gesetzt werden.
