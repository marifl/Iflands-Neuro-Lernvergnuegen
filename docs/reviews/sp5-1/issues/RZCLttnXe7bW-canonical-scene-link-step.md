# RZCLttnXe7bW Code Mapping

## Betroffene Pfade
1. `apps/brain-app/src/scene/LearnSidebar.tsx`
   - `parseLocation`, `sceneIndexForLocation`, `goto`, `replaceCanonicalLocation` in der Initialisierung und im Canonicalisierungseffekt.
2. `apps/brain-app/src/scene/sceneStore.ts`
   - `SceneState` (`index`, `step`) und Store-Action `goto(index, step?)`.
3. `apps/brain-app/src/scene/router.ts`
   - `parseLocation`, `toCanonicalQuery`, `replaceCanonicalLocation`, `ROUTE_CHANGE_EVENT`.
4. `apps/brain-app/src/scene/scenes.ts`
   - `sceneIndexForLocation` (Mappt URL-`scene`/`config` auf Reihenindex, ignoriert `step`).
5. Tests: `apps/brain-app/src/scene/router.test.ts`, `apps/brain-app/src/scene/scenes.test.ts`
   - Keine direkte Abdeckung für `LearnSidebar.tsx` in bestehender Test-Matrix.
6. Route-Sync-Kontext: `apps/brain-app/src/main.tsx`, `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
   - Initiales Mode-Parsing aus URL, danach Reaktionskette auf `ROUTE_CHANGE_EVENT` für Atlas-Config.

## Aktueller URL-/Step-Vertrag
1. Router-Contract (`router.ts`): URL kann `scene`, optional `config`, optional `step` enthalten; `parseLocation` liefert `step` default `0` bei fehlendem/invalidem Wert.
2. Canonicalisierung (`toCanonicalQuery`/`replaceCanonicalLocation`): schreibt `step` immer mit, sobald `sceneId` gesetzt ist.
3. Scene-Contract (`sceneStore.ts`): Store hält sowohl `index` als auch `step`; `goto(index, step = 0)` setzt beide Felder zusammen.
4. Initialer Ladevorgang in `LearnSidebar`: `loadScenes()` → `sceneIndexForLocation` → `goto(start, loc.step)`.
5. `OverlayPanel` nutzt nur `Scene`-Props und keinen `step` aus dem `SceneStore` (keine Step-abhängige Rendering-Logik dort).

## Fehlerpfad
1. Beim ersten Laden wird die Deep-Link-Stepzahl korrekt geparst und an `goto(start, loc.step)` weitergereicht.
2. Direkt im Anschluss normalisiert der zweite Effekt in `LearnSidebar` die URL auf jede Szenenänderung mit `replaceCanonicalLocation(..., step: 0)`.
3. Dadurch wird das initiale `step` aus dem Link sofort auf `0` zurückgesetzt (`sceneId`/`config` bleiben gleich, `step` immer `0`).
4. Der Step wird danach auch nicht über andere Listener wieder aus der URL zurückgespiegelt (weder `LearnSidebar` noch `main.tsx` konsumieren spätere URL-Step-Änderungen), weshalb der initiale Stepverlust stabil bleibt.
5. `sceneIndexForLocation` liefert Indexkonsistenz, aber `step` wird nach der Canonicalisierung nicht persistiert – der Fehler ist rein zwischen `LearnSidebar`-URL-Normalisierung und State-Initialisierung.

## Minimaler Implementierungspfad
1. In `LearnSidebar.tsx` im Canonicalisierungseffekt nicht hart auf `step: 0` zurückfallen, sondern den aktuellen Store-Step wiederverwenden:
   - `const step = useSceneStore((s) => s.step)` ergänzen und `replaceCanonicalLocation({ configName: scene.configName, sceneId: scene.id, step })` verwenden.
2. Alternativ/ergänzend (gleiche Riskoklasse) beim Initialisierungs-Effect nach `loadScenes()` auf `goto(start, clampNonFinite(loc.step))` normalisieren und den Canonicalisierungseffekt danach ohne harte Default-Schritte durchführen.
3. Optionaler Sicherheitsanker: `replaceCanonicalLocation`-Tests sollten explizit nicht nur `step: 0`, sondern auch einen nicht-zero Wert absichern.
4. `SceneStore` kann unverändert bleiben; `step` wird aktuell bereits von `goto` unterstützt, ist aber in der UI-Pfadkette ungenutzt.

## Verifikationsvorschlag
1. Bestehende Testmatrix erweitern (niedrigster Aufwand):
   - `apps/brain-app/src/scene/router.test.ts`: zusätzlicher Fall `replaceCanonicalLocation({ ..., step: 3 })` → Query enthält `step=3`.
2. Neue kleine Regression für `LearnSidebar` (oder bestehende Integration aufbauen):
   - Einstieg per `window.location.search='?scene=...&step=4'`.
   - Nach Initialisierung prüfen: `window.location.search` enthält wieder denselben `step`-Wert und nicht `step=0`.
3. Laufzeitsicherheitscheck:
   - `cd apps/brain-app && pnpm typecheck`
   - `cd apps/brain-app && pnpm test`
4. Browser-Smoke wie in AGENTS gefordert nach Render-/URL-Änderung:
   - Initialer Deep-Link mit `?scene=<id>&step=<n>` bleibt erhalten.

## Skeptischer Review

**Verdict:** PASS

### Findings nach Schwere
1. Keine Blocker.
2. Keine Major-Findings.
3. Keine Minor-Findings.

### Beurteilung
1. Der Fix in [`apps/brain-app/src/scene/LearnSidebar.tsx`](../../../apps/brain-app/src/scene/LearnSidebar.tsx) ist sachlich korrekt: Der Canonicalisierungseffekt serialisiert jetzt den aktuellen Store-`step` statt hart `0`, womit der zuvor beschriebene Verlustpfad geschlossen ist.
2. Die Implementierung bleibt im bestehenden Vertrag: `parseLocation()` liefert den initialen `step`, `goto(index, step?)` persistiert ihn im Store, und `replaceCanonicalLocation()` schreibt denselben Wert in die kanonische URL. Es gibt im aktuell gelesenen Code keinen zweiten Pfad mehr, der den initialen Step danach wieder auf `0` zurücksetzt.
3. Die Regressionstests sind fuer diesen Bug ausreichend: [`apps/brain-app/src/scene/LearnSidebar.test.tsx`](../../../apps/brain-app/src/scene/LearnSidebar.test.tsx) beweist den kritischen Pfad `/?scene=vcpt&step=2 -> ?config=vcpt&scene=vcpt&step=2` und prüft zusaetzlich den Store-Wert; der erweiterte Browser-Smoke in [`apps/brain-app/scripts/smoke-scenes.mjs`](../../../apps/brain-app/scripts/smoke-scenes.mjs) bestaetigt denselben Vertrag im Runtime-Pfad.

### Frische Evidenz
1. `pnpm --dir apps/brain-app test --run src/scene/LearnSidebar.test.tsx src/scene/router.test.ts src/scene/scenes.test.ts` -> 3 Testdateien, 20 Tests gruen.
2. `SMOKE_URL=http://127.0.0.1:5176 node apps/brain-app/scripts/smoke-scenes.mjs` gegen lokal gestartetes Vite -> `ALLE SMOKES GRÜN`, inklusive `PASS scene-step-link ... step=2`.

### Required Follow-up
1. Keiner.
