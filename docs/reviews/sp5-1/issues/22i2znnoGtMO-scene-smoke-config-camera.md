# 22i2znnoGtMO Code Mapping

Issue-Status: Mapping-only Bericht, keine Code-Änderung.

## Betroffene Pfade

### 1) Datenherkunft (TOML -> JSON)

- `scripts/atlas/config.default.toml` definiert `configurations.<step>.camera` inkl. `target`, `shot`, `fit`, `margin`, optional `fov` (u. a. im Block `[configurations.broca-areal.camera]`, `[configurations.ofc-phineas.camera]`, `[configurations.p3a-konfliktmonitoring.camera]`).
- `scripts/atlas/build-config.mjs` transformiert TOML via `loadToml()` in JSON, validiert Kamera-Felder (`CAMERA_KEYS`, `assertCameraFov`, `validateFigureFields`, `validateConfig`) und schreibt am Ende `atlas-config.json` in
  `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`.
- `apps/brain-app/public/assets/atlas-canonical/atlas-config.json` ist damit die Laufzeitquelle (kein TOML zur Laufzeit).

### 2) Laufzeitfluss in `scenes.ts` -> `sceneStore.ts`

- `scenes.ts` lädt config via `loadConfigFile()` und bildet für jeden Learning-Step `configCamera` aus `ref.config.camera`:
  - `loadScene()` macht `{ ...scene, configName: ref.configName, configCamera: ref.config.camera }`.
- `LoadedScene` enthält das Feld `configCamera?: ConfigCamera`.
- `sceneStore.ts` hält dieses Feld nicht im Scene-Objekt, sondern als eigene Store-Keys: `cameraShot` und `cameraConfig` mit Settern `setCameraShot`, `setCameraConfig`.

### 3) `LearnSidebar.tsx`

- Beim Laden (`loadScenes()`), `loadError`/`setScenes` und `goto(start...)` wird `scenes[]` inkl. `configCamera` gesetzt.
- Beim Szenenwechsel (`useEffect` auf `scene`):
  - `setHighlight(regionsToMeshes(scene.brain.regions))` aus der Szene (`scene.brain.camera` bleibt weiterhin getrennt gesetzt).
  - `setCameraShot(scene.brain.camera)` nutzt weiterhin den Szenen-shot aus `scene/*.json` als Legacy-Shot-Fallback.
  - `setCameraConfig(scene.configCamera ?? null)` injiziert die konfiguierte Kamera.
- `replaceCanonicalLocation()` sorgt bei Scene-Wechsel für URL `config/scene/step`.

### 4) `CameraRig.tsx`

- `CameraRig` liest beide Quellen:
  - `shot = useSceneStore(...cameraShot)` (legacy)
  - `sceneCameraConfig = useSceneStore(...cameraConfig)`
  - `figureCameraConfig = effectiveConfig?.activeConfiguration ? effectiveConfig.camera : null` aus URL-/State-Kontext.
- Precedence aktuell:
  - `cameraConfig = figureCameraConfig ?? sceneCameraConfig ?? { shot }`
- `figureTargetMeshes` kommt aus `effectiveConfig.cameraTargetMeshes` (nur bei `camera.fit === 'target'` relevant).
- `setGoal(resolveCameraTarget({...}))` wird aufgerufen, sobald `coords`, `cameraConfig`, `highlight`, `figureTargetMeshes` vorhanden sind.
- Für `fit='target'` wird ohne `targetBounds` abgebrochen.
- `sceneView`/globale Ansicht setzt separat `config: { shot: cameraView.name }` (ohne `target/margin/fov`), d.h. nur Shot-Einfluss.
- `setGoal` schreibt direkt: `cam.fov = resolved.fov` und Position/Target (`camera.position` + `controls.target`) via Lerp im Frame-Loop.

### 5) Auflösung in `cameraResolve.ts`

- `resolveCameraTarget` bildet `fov` aus `config.fov ?? fallbackFov`, `margin` aus `config.margin ?? DEFAULT_CAMERA_MARGIN`.
- `fit` defaultet auf `'bounds'`; bei `'target'` wird `input.targetBounds` verwendet, sonst `input.bounds`.
- `shot` wird aus `config.shot` genommen, sonst `fallbackShot`.
- `pose` hat Vorrang vor `shot` + `fit`.

## Runtime-Vertrag

- Effektive Kameraquelle ist: **aktive URL-Konfiguration (`effectiveConfig.camera`) > geladene Szene-Konfiguration (`scene.configCamera`) > Legacy `scene.brain.camera`**.
- `figureCameraConfig` ist nur aktiv wenn `activeConfiguration` gesetzt ist; sonst bleibt Scene-Fallback.
- `fit='target'` braucht aus Auflösungstabelle abgeleitete `targetBounds` (`computeEffectiveConfig` erzeugt `cameraTargetMeshes` über `camera.target -> catalog area.hosts`).
- `fov`, `margin`, `fit`, `shot` werden zur Laufzeit von `resolveCameraTarget` in einen Zielvektor umgerechnet und in `CameraRig` als tatsächliche Kamera-Setpoints/Projection genutzt.

## Smoke-Luecke

Aktuelle `apps/brain-app/scripts/smoke-scenes.mjs` liest zwar `atlas-config.json`, navigiert per Scene/Config, und prüft:

- Scene/Overlay-Integrität (Titel/Jump-UI/ERP-Polylines, Emission/Visibility)
- URL-Validierung (`scene=`, `config=`, `step=`-Konsistenz)
- pauschale Kamera-Differenz `|p3b - p3a| > 5`
- Config-Navigation führt zu sichtbarer Kamerabewegung (`configNavMove > 5`)

Aber es wird **kein** Feld aus `camera` explizit ausgewertet:
- kein `shot`-Wert aus `cfg.camera` im Test,
- kein `fit`/`target`-Bezug,
- kein `margin`-Bezug,
- kein `fov`-Abgleich.

Damit kann der Script-Check die aktuelle Regression „Config-Kamera belegt nicht“ aktuell nur indirekt (über irgendeine Bewegung) und nicht gezielt durchblicken.

## Minimaler Implementierungspfad

Vorschlag: nur `apps/brain-app/scripts/smoke-scenes.mjs` erweitern, ohne zusätzliche Berechnungsquelle:

1. Beim SCENES-Bau `camera` mitführen (`camera: cfg.camera ?? {}`).
2. Kamerastatus nach jedem Scene-Ladevorgang als `{pos, target?, fov}` erfassen (bereits `window.__CAMERA__` vorhanden).
3. Assertions ableiten aus **Config-Daten selbst**, nicht aus fest kodierten Sollwerten:
   - Shot-Nachweis:
     - Nachbar-Szenen mit unterschiedlichen `camera.shot` vergleichen => `camMove > Schwelle`.
     - Zusätzlich: optional gleiche Shot-Gruppen (falls vorhanden) dürfen *nicht* identisch bleiben.
   - `fit === 'target'`:
     - `target` gesetzt und `fit` == `'target'` => Verifikation, dass Kamerabewegung stattfindet (nicht stillstehend), obwohl andere Parameter unverändert bleiben (bestehend aus config-basierter Folge).
   - `fov`:
     - Wenn `cfg.camera.fov` gesetzt, nach Settle `await camFov()` gegen diesen Wert prüfen.
   - `margin`:
     - Wenn zwei Szenen mit gleichem `shot|fit|target` aber verschiedenem `margin` vorkommen, prüfen monotone Distanzänderung der Kamera-Position zwischen diesen Szenen.
     - (Aktueller Datensatz hat faktisch keine unterschiedlichen Margin-Werte; damit bleibt der Check automatisch aus, ohne harte Sollwerte einzuführen.)
4. Für `target`-Prüfung statt Geometrieberechnung (keine zweite Quelle): auf `scene.camera.target` + Kameraantwort nach Renderfensterwechsel referenzieren.

## Verifikationsvorschlag

1. Zielkorrigiert gegen Script laufen lassen:
   - `cd apps/brain-app`
   - `pnpm smoke` (falls Alias vorhanden) bzw. expliziter Aufruf mit `--` passend zum Projekt.
2. Erwartung:
   - neue `camera`-Assertions decken Shot/Fit-Target/FOV zumindest konsensbasiert ab.
   - Regression „Config-Kamera nicht belegt“ wird bei Änderung von `cfg.camera` sofort sichtbar.

## Skeptischer Review

Verdikt: FAIL

### Findings

1. Hoch: `apps/brain-app/scripts/smoke-scenes.mjs:14-121` baut den Kamera-Resolver faktisch noch einmal nach statt den Runtime-Vertrag zu konsumieren. `CAMERA_DIRECTIONS` dupliziert `apps/brain-app/src/scene/cameraPresets.ts:4-15`, `targetMeshesForCamera()` dupliziert `apps/brain-app/src/viewer/atlas/atlasConfig.ts:153-172`, und `expectedCamera()` dupliziert die Kernlogik aus `apps/brain-app/src/scene/cameraResolve.ts:51-88`. Damit ist die Forderung "ohne zweite harte Wahrheit" nicht erfuellt: jede Aenderung an Shot-Semantik, Fit-Regeln oder Distanzformel muss an zwei Stellen konsistent gehalten werden, und ein in Lockstep aktualisierter Mirror verliert seinen Beweiswert.

2. Mittel: Der `?config=`-Pfad wird gerade nicht auf Kamera-Verhalten belegt. `config-only-link` in `apps/brain-app/scripts/smoke-scenes.mjs:236-254` prueft nur Titel, Chrome, URL und sichtbare Mesh-Anzahl, aber kein `waitCameraMatchesConfig()`. Gerade fuer `fit="target"` haengt die Runtime in `apps/brain-app/src/scene/CameraRig.tsx:37-39` und `:67-75` von `useEffectiveConfig().cameraTargetMeshes` ab; wenn diese URL-getriebene Aufloesung regressiert, kann der Subtest weiterhin gruen sein, obwohl die Config-Kamera auf `?config=` nicht mehr angewendet wird.

3. Mittel: Der Smoke deckt nicht den vollen Kamera-Vertrag ab, den die App selbst unterstuetzt. `apps/brain-app/src/scene/cameraResolve.ts:58-74` und `apps/brain-app/src/scene/cameraResolve.test.ts:45-92` erlauben `pose` sowie `fallbackShot`; `apps/brain-app/scripts/smoke-scenes.mjs:100-121` behandelt beides nicht und wirft stattdessen bei fehlendem `camera.shot`. Zusaetzlich beweist der aktuelle gruene Lauf kein config-getriebenes `fov`, weil die geprueften Learning-Steps in `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:118-430` nur `fit`, `margin`, `shot` und einmal `target`, aber kein `fov` oder `pose` enthalten.

### Required Follow-up

1. Den Smoke auf den echten Runtime-Vertrag zurueckfuehren: entweder `resolveCameraTarget` plus gemeinsame Shot-/Target-Helfer direkt wiederverwenden oder im Dev-Build den bereits aufgeloesten Kamera-Sollwert exponieren und genau diesen gegen die Ist-Kamera pruefen.
2. Im `?config=`-Deep-Link-Test dieselbe Kamera-Assertion wie im Szenen-Loop ausfuehren, damit die URL-getriebene `effectiveConfig`-Kette wirklich belegt ist.
3. Entweder den Smoke auf den vollen `ConfigCamera`-Vertrag (`pose`, `fallbackShot`) erweitern oder den Vertragsumfang der Learning-Scenes explizit enger ziehen; falls `fov` als belegt gelten soll, braucht es mindestens einen Lernpfad-Fall mit gesetztem `camera.fov`.

## Skeptischer Nachreview

Verdikt: PASS

Die drei vorherigen Blocker sind geschlossen:

1. Kein zweiter Kamera-Resolver mehr im Smoke. `apps/brain-app/src/scene/CameraRig.tsx:24-37` und `:83-107` exponieren den bereits zur Laufzeit via `resolveCameraTarget()` aufgeloesten Vertrag als `window.__CAMERA_RIG__`, und `apps/brain-app/scripts/smoke-scenes.mjs:96-153` konsumiert genau diesen Vertrag statt Shot-Richtungen, Target-Mesh-Aufloesung oder Distanzformel lokal nachzubauen.
2. Der `?config=`-Pfad prueft jetzt dieselbe Kamera-Assertion wie der Szenen-Loop. `apps/brain-app/scripts/smoke-scenes.mjs:197-215` zieht `configOnlyCamera = await waitCameraMatchesConfig(...)` und macht den Deep-Link-Test damit kamera-relevant statt nur DOM-/URL-basiert.
3. Ein expliziter Lernpfad-FOV-Fall ist jetzt kanonisch vorhanden. `scripts/atlas/config.default.toml:351-356` setzt `fov = 36` fuer `p3a-konfliktmonitoring`, das generierte `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:252-258` enthaelt dieses Feld, und der Smoke verifiziert explizites `fov` sowohl gegen den Runtime-Resolver als auch gegen die echte Kamera (`apps/brain-app/scripts/smoke-scenes.mjs:111-118` und `:133-140`).

### Findings

1. Niedrig: Der Legacy-Fallback-Pfad `config.shot ?? fallbackShot` in `apps/brain-app/src/scene/cameraResolve.ts:68-70` bleibt end-to-end weiterhin unbewiesen. Das blockiert dieses Issue nicht, weil die kanonischen Learning-Scenes alle `camera.shot` explizit setzen und dieser Smoke gezielt `source=figure` verlangt (`apps/brain-app/scripts/smoke-scenes.mjs:107-109`), aber die Reststrecke `legacy -> resolved` ist damit weiter primär durch Unit-Tests und nicht durch den Scene-Smoke abgedeckt.

### Required Follow-up

1. Kein weiterer Schritt ist fuer den Abschluss dieses Issues noetig.
2. Optional: ein separater Integrations- oder Smoke-Fall fuer den Legacy-Fallback-Pfad, falls der volle `CameraRig`-Vertrag ausserhalb des kanonischen Learning-Pfads ebenfalls end-to-end abgesichert werden soll.
