# U6B3BgjWhRzw Code Mapping

## Betroffene Pfade

- `apps/brain-app/src/scene/LearnSidebar.tsx`
  - `useEffect(() => loadScenes())` lädt Sequenz-Szenen, liest Start-Location via `parseLocation(window.location.search)` und ruft `goto(start, loc.step)`.
  - `useEffect(() => replaceCanonicalLocation(...))` wird bei jedem Szenenwechsel bzw. Step-Wechsel ausgelöst und schreibt `?config=<scene.configName>&scene=<scene.id>&step=<step>`.
- `apps/brain-app/src/scene/router.ts`
  - `replaceCanonicalLocation()` macht `window.history.replaceState(..., query)` und feuert `new Event(ROUTE_CHANGE_EVENT)`.
  - `ROUTE_CHANGE_EVENT` ist der String `'brain-app:urlchange'`.
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
  - `useEffect` in `useEffectiveConfig()` lädt `atlas-config` + Katalog, setzt `eff` initial und registriert Listener für `popstate` und `ROUTE_CHANGE_EVENT`.
  - `refresh()` liest `window.location.search` neu und baut `computeEffectiveConfig(file, catalog, localOverrides, url)`.
- `apps/brain-app/src/scene/CameraRig.tsx`
  - Holt `effectiveConfig = useEffectiveConfig()` plus `sceneCameraConfig` aus Scene-Store und `shot` aus `cameraShot`.
  - Bildet `cameraConfig = figureCameraConfig ?? sceneCameraConfig ?? legacyCameraConfig`.
- `apps/brain-app/scripts/smoke-scenes.mjs`
  - enthält bestehende End-to-End-Prüfung `config-only-nav` und `config-only-link`.

## Runtime-Vertrag

- URL-Pfad: `LearnSidebar` → `replaceCanonicalLocation` → `ROUTE_CHANGE_EVENT`.
- Hook-Pfad: `useEffectiveConfig` subscribed auf `ROUTE_CHANGE_EVENT` und `popstate`, liest bei jedem Event die aktuelle Query neu ein.
- Routing-Pfad in Config-Resolver:
  - `computeEffectiveConfig()` nimmt `activeConfiguration` aus `url.get('config')` mit Vorrang vor LocalStorage (`urlConfig ?? local.configuration`).
  - `activeConfiguration` wird zu `configuration`, `camera`, `cameraTargetMeshes`.
- `CameraRig` konsumiert beide Schichten (`figureCameraConfig` aus `effectiveConfig`, `sceneCameraConfig` aus Scene-Store) und rechnet via `resolveCameraTarget` auf konkrete Kamera-Position/Target/FOV.
- `replaceCanonicalLocation()` nutzt `history.replaceState` (kein Navigationssprung), also wird URL ohne Reload aktualisiert; die Reaktion erfolgt durch den Custom-Event.

## Pinning-Risiko

- Aktuelle Präzedenz in `CameraRig.tsx` ist eindeutig:
  - 1. aktive Konfigurationskamera (`useEffectiveConfig().camera`) als `figureCameraConfig`
  - 2. Fallback auf Lern-Scene-Konfig (`scene.configCamera`)
  - 3. Legacy-Fallback auf `scene.brain.camera` als Shot.
- Dadurch kann eine URL-Config die Kamera **pinnen**, solange `useEffectiveConfig` auf die aktuelle URL reagiert.
- Beim Start über `?config=...`:
  - `LearnSidebar` resolves start scene by `sceneIndexForLocation`.
  - `replaceCanonicalLocation` ergänzt danach i.d.R. `scene` und `step`.
  - `ROUTE_CHANGE_EVENT` löst eine Neu-Berechnung von `effectiveConfig` aus, wodurch die aktive URL-Config in `CameraRig` wirksam bleibt.
- Risiko bleibt, dass nach Navigation nur eine Bewegung (`cameraMove > 5`) geprüft wird; der Codepfad selbst prüft nicht explizit „Pinning bleibt auf `figure`-Quelle“ für den Folge-Step.

## Minimaler Implementierungspfad

- Fail-loud für diesen Issue ohne Refactor:
  1. `apps/brain-app/scripts/smoke-scenes.mjs` im Block `config-only-nav` erweitern:
     - Vor/nach `ArrowRight` und `ArrowLeft` `waitCameraMatchesConfig()` aufrufen.
     - Zusätzlich prüfen: `debug.source === 'figure'` und `debug.activeConfiguration === '<expected>'` für Start- und Ziel-Config.
     - Optional zusätzlich `cameraConfigMatches` gegen die erwartete Config (`shot/fit/margin/fov/pose` für die jeweilige `config`).
  2. Gleiches Muster als kurzer negativer Regressionstest in Vitest:
     - Startseite `?config=<configA>&step=2`, nach `replaceState`/Keydown auf `ArrowRight` und `ArrowLeft` via `window.location.search` verifizieren, dass `useEffectiveConfig` neu liest (`ROUTE_CHANGE_EVENT` getriggert) bzw. `window.__CAMERA_RIG__?.activeConfiguration` den erwarteten Config-Namen trägt.
- Diese Änderungen sind lokal auf Tests/Smoke beschränkt und decken genau das Pinning-/Navigationsrisiko ab.

## Verifikationsvorschlag

- Unit:
  - `apps/brain-app/src/scene/router.test.ts` bleibt als Event-Basis.
  - neue Smoke-basierte Regression (`config-only-nav`) als harte Kamera-Contract-Assertion statt nur `cameraMove > 5`.
- Runtime/Smoke:
  - `apps/brain-app/scripts/smoke-scenes.mjs`
    - `config-only-link` bereits prüft Camera-Contract gegen `waitCameraMatchesConfig(sc)`.
    - `config-only-nav` auf `figure`-Quelle + passende `activeConfiguration` erweitern.
- Optionaler Zusatz-Check:
  - `ArrowLeft` ebenso testen, um beide Navigationsrichtungen abzudecken (`config-only-nav-left`).

## Skeptischer Review

**PASS**

- Keine blockierenden Findings fuer dieses Issue. Der relevante Laufzeitpfad ist konsistent und die neue Smoke-Evidenz trifft jetzt den eigentlichen Fehlerfall statt nur einen Bewegungs-Proxy:
  `LearnSidebar` navigiert per `goto(...)` und schreibt danach die kanonische URL via `replaceCanonicalLocation(...)` (`apps/brain-app/src/scene/LearnSidebar.tsx:46-60`), `replaceCanonicalLocation` feuert synchron `ROUTE_CHANGE_EVENT` nach `history.replaceState(...)` (`apps/brain-app/src/scene/router.ts:44-48`), `useEffectiveConfig` subscribed auf genau dieses Event und liest `window.location.search` bei jedem Wechsel neu ein (`apps/brain-app/src/viewer/atlas/atlasConfig.ts:222-244`), und `CameraRig` priorisiert danach weiter `figureCameraConfig ?? sceneCameraConfig ?? legacyCameraConfig` (`apps/brain-app/src/scene/CameraRig.tsx:53-57`).
- Die neue Smoke-Assertion fuer `config-only-nav` ist fuer den Claim ausreichend fail-loud. `waitCameraMatchesConfig(...)` verlangt nicht nur eine veraenderte Kamera, sondern bestaetigt `window.__CAMERA_RIG__` gegen den erwarteten Config-Schritt: `source === 'figure'`, `activeConfiguration === sc.configName`, Debug-`config` entspricht der kanonischen Config, und die reale Kamera folgt `resolved.position/target/fov` (`apps/brain-app/scripts/smoke-scenes.mjs:96-154`, `238-257`). Damit wird genau ausgeschlossen, dass die Szenenkamera nach Navigation wieder auf `scene` oder `legacy` zurueckfaellt.
- Einziger verbleibender Gap ist symmetrische Coverage, nicht Korrektheit: der Smoke prueft den Vorwaertsfall per `ArrowRight`, aber nicht explizit den Rueckweg per `ArrowLeft` (`apps/brain-app/scripts/smoke-scenes.mjs:241-257`). Das ist aus meiner Sicht kein Blocker fuer das Schliessen dieses Tickets, weil der produktive Pfad fuer beide Richtungen derselbe `goto(...)` -> `replaceCanonicalLocation(...)` -> `ROUTE_CHANGE_EVENT`-Mechanismus ist (`apps/brain-app/src/scene/LearnSidebar.tsx:46-60`), aber es bleibt ein sinnvoller Haertungspunkt.

**Required Follow-up**

1. Keiner fuer das Schliessen von `U6B3BgjWhRzw`.
2. Optional zur Haertung: `config-only-nav-left` als Spiegeltest fuer `ArrowLeft` ergaenzen, falls dieser Pfad kuenftig separat regressionskritisch wird.

**Frische Evidenz**

1. Lokal verifiziert: `node --check apps/brain-app/scripts/smoke-scenes.mjs` -> Exit 0.
2. Lokal verifiziert: `node --test scripts/atlas/build-config.test.mjs` -> 25/25 Tests gruen.
3. Lokal verifiziert: `pnpm --dir apps/brain-app test --run src/scene/cameraResolve.test.ts src/scene/scenes.test.ts src/scene/LearnSidebar.test.tsx src/scene/router.test.ts` -> 4 Dateien, 26 Tests gruen.
4. Lokal verifiziert: `pnpm --dir apps/brain-app typecheck` -> Exit 0.
5. Lokal verifiziert: `git diff --check` -> Exit 0.
6. Nicht lokal wiederholt: `SMOKE_URL=http://127.0.0.1:5184 node apps/brain-app/scripts/smoke-scenes.mjs`, weil auf `127.0.0.1:5184` in dieser Session kein Server erreichbar war. Ich stütze mich dafür auf die im Ticket-Kontext mitgelieferte frische Laufzeit-Evidenz.
