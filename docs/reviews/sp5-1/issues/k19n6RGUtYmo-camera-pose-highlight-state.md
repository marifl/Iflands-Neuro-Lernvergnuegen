# Issue-Review k19n6RGUtYmo: `[SP5.1] Explizite camera.pose hängt an Highlight-State`

## 1) Wo wird `camera.pose` aktuell am `highlight`-State gehangen?
- In `apps/brain-app/src/scene/CameraRig.tsx` wird die Zielauflösung nur ausgeführt, wenn `highlight` nicht leer ist: `if (!coords || !cameraConfig || highlight.length === 0) return` in `useEffect` (Zeilen 97–99).
- Damit wird selbst bei vorhandenem `cameraConfig.pose` keine Auflösung gestartet, sobald `highlight` leer ist.
- Die eigentliche Auflösung (`resolveCameraTarget`) wird danach unverändert aufgerufen (Zeilen 102–108), aber vorheriger Early-Return blockiert den Pose-Case.

## 2) Kann `resolveCameraTarget` `pose` ohne Bounds auflösen?
- Ja, die Resolverlogik ist Pose-first: `if (config.pose) { return { position: config.pose.position, target: config.pose.look_at, fit: 'pose', ... } }` in `apps/brain-app/src/scene/cameraResolve.ts` (Zeilen 74–81).
- Die Bounds-/Fit-Validierung liegt danach (`assertFit`, `shot`, `bounds`, `targetBounds`), also nur für Nicht-Pose-Pfade aktiv.
- Ergebnis: Pose-Pfad braucht semantisch keine Szene-Bounds, weil er vor den Bounds-/Shot-Prüfungen zurückkehrt.

## 3) Minimale Änderungsempfehlung (konkret)
- Ziel: Pose sollen auch mit leerem `highlight` wirksam werden, ohne non-pose Verhalten zu verändern.

Empfehlter minimaler Patch in `apps/brain-app/src/scene/CameraRig.tsx`:
1. Gate anpassen:
   - aktuell: `if (!coords || !cameraConfig || highlight.length === 0) return`
   - ersetzt durch Pose-sensible Logik, z. B.:
     - frühe Rückgabe nur, wenn `!cameraConfig`.
     - zusätzliche Bedingung: nur bei **non-pose** auf `highlight` prüfen.
2. `bounds`-Berechnung nur bei non-pose aus Highlight ableiten.
   - Pose-Fall: `bounds = globalCameraBoundsForConfig(cameraConfig)` (oder `DEFAULT_GLOBAL_CAMERA_BOUNDS` als Fallback).
   - Non-Pose-Fall: bestehendes `unionBounds(coords, highlight)` beibehalten.
3. `globalCameraBoundsForConfig` aus `cameraResolve` importieren.

Minimaler Effekt auf Non-Pose:
- Verhalten bleibt gleich: bei leerem Highlight wird weiterhin nicht geframt.
- Bestehender `bounds`/`targetBounds`-Pfad bleibt unverändert aktiv.

## 4) Tests: bestehend / empfehlenswert
- Bereits abgedeckt:
  - `apps/brain-app/src/scene/cameraResolve.test.ts`: Pose-Präferenz über Shot/Bounds (Test „bevorzugt eine explizite Pose...“, Zeilen 94–110).
  - `apps/brain-app/src/scene/cameraRigConfig.test.ts`: Kamerakonfig-Auswahl (figure/scene/legacy) – zeigt Route der Config-Quelle, aber nicht Pose vs. Highlight-Verhalten.
  - `apps/brain-app/src/scene/router.test.ts` + `LearnSidebar.test.tsx` + `scenes.test.ts`: `?config`/`configName`-Routing und Sequenzbindung.
- Noch nicht abgedeckt und empfehlenswert:
  1. `CameraRig`-Spezifik-Test (neu oder bestehende Rig-Komponente erweitern): Pose-Konfig mit `highlight: []` führt zur Auflösung + `fit: 'pose'` und `setGoal` wird gesetzt.
  2. Gleicher Testfall als Regression: non-pose Config + `highlight: []` bleibt unverändert inaktiv.
  3. Optionaler Resolver-Fokus: in `cameraResolve.test.ts` zusätzlich dokumentieren, dass Pose-Pfad auch bei fehlender `shot`-Angabe funktioniert (mit explizit gesetztem `pose`).

## 5) R3F/useFrame-Risiko nach Minimal-Änderung
- Gering.
- Auswirkungen: Nur ein zusätzlicher, deterministischer `setGoal`/`useFrame`-Anlauf für Pose-Configs ohne Highlight; `useFrame`-Update-Loop läuft wie bisher bis `want.current` false ist.
- Kein neuer Renderpfad-Job pro Frame ohne Zielwechsel.
- Kein Risiko für bestehendes Highlight-Framing, solange non-pose weiterhin auf `highlight.length === 0` bleibt.

## 6) Relevanter Config-Runtime-Pfad `?config=<id>` -> CameraRig
- `main.tsx`: `?config` setzt `appMode` auf `explore` (Zeile 24–26).
- `atlasConfig.ts`: `computeEffectiveConfig` liest `url.get('config')` in `activeConfiguration` und `hasUrlConfig` (ca. Zeilen 184–193), wodurch URL-Konfiguration im Effekt als aktive Figure-Konfiguration geliefert wird.
- `cameraRigConfig.ts`: bei `figureCameraConfig` wird sie in `selectCameraRigConfig` bevorzugt (`cameraConfig = figureCameraConfig ?? sceneCameraConfig ?? legacyCameraConfig`).
- `CameraRig.tsx` verwendet dieses selektierte `cameraConfig` als eigentliche Basis für die Auflösung.

## Post-Implementation Review

Verdikt: PASS

Keine blockierenden Findings im umgesetzten Delta.

1. Pose-Configs umgehen `highlight` und ungeladene `coords` jetzt korrekt. `CameraRig` verzweigt zuerst auf `cameraConfig.pose !== undefined` und legt die `coords`-/`highlight`-/`targetBounds`-Guards nur noch in den Non-Pose-Pfad; der Pose-Pfad läuft direkt in `resolveCameraTarget(...)` weiter. Evidence: `apps/brain-app/src/scene/CameraRig.tsx:98-114`.
2. Non-Pose-Verhalten bleibt geschützt. Ohne geladene `coords` oder bei leerem `highlight` wird weiter früh zurückgegeben; `fit='target'` bleibt zusätzlich an vorhandene `targetBounds` gebunden. Evidence: `apps/brain-app/src/scene/CameraRig.tsx:102-107`. Der Resolver selbst bleibt pose-first und prüft Bounds/Fit erst nach dem frühen Pose-Return. Evidence: `apps/brain-app/src/scene/cameraResolve.ts:67-90`.
3. Der `useFrame`-Pfad bleibt R3F-sicher und rein imperativ. Pro Frame werden nur `camera.position`, `controls.target` und `want.current` mutiert; es gibt dort keine React-State-Updates und damit keinen neuen Render-Loop über `setState`. Evidence: `apps/brain-app/src/scene/CameraRig.tsx:140-149`.
4. Die neuen Regressionstests treffen den Kern des Issues: R3F-Hooks sind gemockt, `loadCoords()` bleibt absichtlich ungelöst, `highlight` bleibt leer, und trotzdem greift `camera.pose`, während eine Non-Pose-Konfiguration inaktiv bleibt. Evidence: `apps/brain-app/src/scene/CameraRig.test.tsx:8-15`, `apps/brain-app/src/scene/CameraRig.test.tsx:17-38`, `apps/brain-app/src/scene/CameraRig.test.tsx:72-105`.
5. Kleine Restabdeckung: Der neue Komponenten-Test deckt den `fit='target'`-Guard nicht direkt im `CameraRig` ab; diese Branch ist aktuell nur per Code-Inspektion in `CameraRig.tsx:105-106` und indirekt im Resolver-Test für fehlende `targetBounds` abgesichert (`apps/brain-app/src/scene/cameraResolve.test.ts:136-140`). Das ist kein Release-Blocker für dieses Delta, aber die naheliegendste verbleibende Testlücke.

Verifikation:

1. `pnpm --dir apps/brain-app exec vitest run src/scene/CameraRig.test.tsx src/scene/cameraResolve.test.ts src/scene/cameraRigConfig.test.ts` -> 13/13 Tests grün.
2. `pnpm --dir apps/brain-app typecheck` -> Exit 0.
