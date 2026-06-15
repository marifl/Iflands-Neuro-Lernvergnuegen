# SP5.1.5 Review — Camera-Config

Reviewer: Codex

## Scope

Review von `[SP5.1.5] CameraRig vollständig config-gesteuert machen` im
aktuellen uncommitted Worktree. Fokusdateien:

- `apps/brain-app/src/scene/CameraRig.tsx`
- `apps/brain-app/src/scene/cameraResolve.ts`
- `apps/brain-app/src/scene/cameraResolve.test.ts`
- `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
- `apps/brain-app/scripts/smoke-scenes.mjs`
- `scripts/atlas/config.default.toml`
- `scripts/atlas/build-config.mjs`

R3F/Three-Linse: keine React-State-Updates im `useFrame`-Hotpath, keine
unnötigen Remounts, keine versteckten Kamera-Defaults.

## Findings

1. High — `fit = "target"` und `camera.target` sind Runtime-tot

   `scripts/atlas/config.default.toml:181` bis `185`, `217` bis `221` und
   `350` bis `354` deklarieren konkrete Zielareale mit `fit = "target"`.
   `scripts/atlas/build-config.mjs:268` bis `275` validiert diese Felder auch.
   Im Runtime-Pfad werden sie aber nicht verwendet: `CameraRig.tsx:63` bis
   `68` übergibt immer `unionBounds(coords, highlight)`, und
   `cameraResolve.ts:67` bis `83` liest nur `config.fit` als Rückgabewert,
   setzt `target` aber immer auf `input.bounds.center`. `config.target` wird in
   `cameraResolve.ts` gar nicht gelesen.

   Effekt: Änderungen an `camera.target` haben außer Build-Validation keine
   Kamera-Wirkung. `fit = "target"` verhält sich geometrisch identisch zu
   `fit = "bounds"`, solange dieselben Highlight-Bounds übergeben werden.
   Damit ist ein Kernteil der Acceptance nicht erfüllt.

2. High — URL-Config kann die Szenen-Kamera nach Navigation pinnen

   `CameraRig.tsx:37` bis `38` bevorzugt `effectiveConfig.camera` vor
   `sceneCameraConfig`, sobald `activeConfiguration` gesetzt ist.
   `useEffectiveConfig()` liest `window.location.search` aber nur einmal beim
   Mount (`atlasConfig.ts:194` bis `202`). Gleichzeitig schreibt
   `LearnSidebar.tsx:54` bis `56` bei Szenenwechseln neue kanonische URLs, und
   `LearnSidebar.tsx:37` bis `39` aktualisiert die eigentliche
   `sceneCameraConfig`.

   Effekt: Wird die App mit einem kanonischen Link wie
   `?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=0`
   geladen, bleibt `effectiveConfig.activeConfiguration` auf diesem Startwert.
   Beim Weiterblättern gewinnt diese alte Config weiter gegen die aktuelle
   `sceneCameraConfig`; die Kamera kann dann auf dem Start-Shot hängen bleiben.

3. Medium — Explizite `pose` hängt unnötig an Highlight- und Bounds-State

   `cameraResolve.ts:57` bis `65` kann eine explizite Pose ohne Bounds
   auflösen. `CameraRig.tsx:61` bis `68` ruft den Resolver aber nur auf, wenn
   `coords` geladen sind und `highlight.length > 0` ist. Das blockiert
   `camera.pose` in allen Zuständen ohne aktive Highlight-Meshes.

   Besonders relevant ist der reine Config-Link: `main.tsx:22` bis `25` setzt
   bei `?config=<id>` den Explorer-Modus, dort mountet `LearnSidebar` nicht und
   setzt keine Highlight-Slugs. Eine per Config gesetzte Pose kann so nicht als
   eigenständige Kamera-Definition wirken.

4. Medium — Smoke prüft nicht belastbar, ob zwei verschiedene Figure-Shots genutzt werden

   `smoke-scenes.mjs:27` bis `34` übernimmt aus der Config zwar Regionen und
   Overlay-Metadaten, aber nicht den erwarteten `camera.shot`. Die eigentliche
   Kamera-Prüfung in `smoke-scenes.mjs:117` bis `123` vergleicht nur den
   Positionsabstand zwischen `p3b-engagement` und
   `p3a-konfliktmonitoring`.

   Dieser Abstand kann auch dann größer als 5 sein, wenn der Shot ignoriert
   wird, weil die beiden Szenen unterschiedliche Region-Bounds haben. Der Smoke
   belegt damit Bewegung, aber nicht, dass die zwei konfigurierten Shots
   tatsächlich angewendet werden.

5. Medium — Globale Center-/Radius-Defaults sind benannt, aber nicht overridebar

   `DEFAULT_GLOBAL_CAMERA_BOUNDS` benennt die alten Globalwerte in
   `cameraResolve.ts:27` bis `30`. Der globale Kamera-View-Pfad in
   `CameraRig.tsx:72` bis `78` übergibt aber immer diese Konstante und baut die
   Config nur als `{ shot: cameraView.name }`. In der Build-Schema-Liste
   `scripts/atlas/build-config.mjs:63` und `72` gibt es keine Felder, mit denen
   dieser Center/Radius-Default überschrieben werden könnte.

   Effekt: Der alte globale Mittelpunkt und Radius sind nicht mehr magische
   Inline-Zahlen, aber die Acceptance fordert auch Overridebarkeit. Die ist im
   aktuellen Pfad nicht vorhanden.

## Evidence Inspected

1. `CameraRig` verwendet im `useFrame`-Hotpath nur Refs und Three-Objekte; keine
   React-State-Updates im Frame-Loop gefunden (`CameraRig.tsx:81` bis `91`).
2. Config-Schema und Build-Validator akzeptieren `target`, `shot`, `fit`,
   `margin`, `fov` und `pose` (`atlasConfig.ts:12` bis `19`,
   `build-config.mjs:63`, `264` bis `282`).
3. Resolver-Tests decken `shot`, `margin`, `fov`, Pose-Priorität und
   Fehlerfälle ab (`cameraResolve.test.ts:7` bis `75`), aber keinen
   Unterschied zwischen `fit = "bounds"` und `fit = "target"`.
4. Lernsequenz-Kamera-Config wird aus `atlas-config.json` in die Szenen
   übertragen (`scenes.ts:68` bis `73`) und im Lernmodus in den Store
   geschrieben (`LearnSidebar.tsx:35` bis `40`).
5. Das Canvas selbst bleibt mit statischem Start-FOV konfiguriert
   (`BodyParts3DViewer.tsx:731` bis `739`); dynamische FOV-Änderungen laufen
   über `CameraRig.setGoal()`.

## Verification Run

1. `git diff --check -- apps/brain-app/src/scene/CameraRig.tsx apps/brain-app/src/scene/cameraResolve.ts apps/brain-app/src/scene/cameraResolve.test.ts apps/brain-app/src/viewer/BodyParts3DViewer.tsx apps/brain-app/scripts/smoke-scenes.mjs scripts/atlas/config.default.toml scripts/atlas/build-config.mjs` — Exit 0.
2. Statische Review-Kommandos: `nl -ba`, `rg`, `git diff`, `git status --short`.
3. Keine Vitest-, Typecheck- oder Playwright-Smoke-Ausführung durch den Reviewer,
   weil der Auftrag nur Schreibzugriff auf diese Reportdatei erlaubt und Runtime
   Smokes/Testläufe potenziell Cache-/Artefakt-Writes auslösen können.

## Residual Risk

1. Die Review war statisch. Ob die Kamera visuell jitterfrei settled, ist ohne
   Browser-Smoke nicht belegt.
2. Die konkrete Ziel-Bounds-Auflösung für `camera.target` braucht eine
   belastbare Mapping-Entscheidung: Areal-ID zu Mesh-Slug, Scene-Region,
   Bucket oder expliziter Pose. Der aktuelle Diff validiert Zielareale, hat aber
   keinen Runtime-Pfad von Zielareal zu Bounds.
3. FOV-Fallback bleibt implizit der aktuell gesetzte PerspectiveCamera-FOV.
   Nach einer Config mit explizitem `fov` kann eine spätere Config ohne `fov`
   diesen Wert erben, sofern kein anderer Pfad ihn zurücksetzt.
