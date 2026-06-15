# ASzbSvjKiBaw — `[SP5.1] Loader blockiert wiederverwendete Scene-JSONs`

## 1) Where does the code currently reject duplicate scene IDs?

1. **Runtime loader (`apps/brain-app/src/scene/scenes.ts`)**
   - `scenesForSequence` tracks both step names and scene IDs.
   - Duplicate step rejection: `steps.has(step)` -> error `Sequenz enthaelt doppelten Step` at **line 62**.
   - Duplicate scene-id rejection: `sceneIds.has(scene.id)` -> error `Sequenz enthaelt doppelte Scene` at **line 65**.
   - `sceneForStep` derives `sceneId` via `config.overlay?.scene` and passes it as `id` in the sequence ref at **lines 50–55**.

2. **Build-time validation (`scripts/atlas/build-config.mjs`)**
   - `validateSequence` has the same duplicate guard set:
     - duplicate step check at **line 531**,
     - duplicate `sceneId` check at **line 538**.
   - For `learning` sequences, `validateSequence(..., { requiresScene: true })` is invoked in the sequence loop at **lines 594–601**, so learning sequences enforce `overlay.scene` presence plus duplicate checks.
   - Presentation sequences still call `validateSequence`, but with `requiresScene: false` (line 600), so they do not require `overlay.scene`.

## 2) Which identifier should remain unique, and where is it used downstream?

1. **Keep configuration step keys (sequence step key / `configName`) unique.**
   - `scenesForSequence` uses `step` as `configName` (`{ id: sceneId, configName: step, config: ... }`) at **line 55**.
   - `LoadedScene` carries `configName` and it is written into URL state via `replaceCanonicalLocation` in `LearnSidebar` (`line 59`).
   - Routing/search uses `configName` explicitly:
     - parsed from `?config=...` in `router.ts` (**line 12**),
     - included in `toCanonicalQuery`/`replaceCanonicalLocation` (**lines 27–37**, **44–48**),
     - preferred match path in `sceneIndexForLocation` is `configName` (**lines 94–103**).
   - Downstream, `configName` is the stable, explicit locator for sequence steps; using only `scene.id` is inherently many-to-one when scene JSON is reused.

2. **`id` should identify scene content/file, not sequence position.**
   - `scene.id` is loaded from `scene.json` (`/scenes/${ref.id}.json`) and validated for exact match with the config’s `overlay.scene` (**line 86–87**).
   - Reusing a scene JSON under different configs is therefore semantically valid at file/content level.

## 3) Minimal test cases needed to prove the requested behavior

1. **Runtime path (`apps/brain-app/src/scene/scenes.test.ts`)**
   - Existing `wirft laut bei doppelten Scene-Zuordnungen` currently asserts rejection at **lines 186–198**.
   - Minimal proof set:
     - replace/relax that test to assert load success when same `overlay.scene` appears in different steps,
     - assert returned array keeps both entries and preserves step/config distinction, e.g. `configName` differs while `id` repeats.

2. **Build path (`scripts/atlas/build-config.test.mjs`)**
   - Add one new test near sequencing checks:
     - a `learning` sequence with steps `['a','b']`, both configs having `overlay.scene: 'vcpt'`, `VALIDATION_CONTEXT.sceneIds` containing `'vcpt'`, and assert `validateConfig(... )` does not throw.
   - Keep to one new behavior test (build side); no extra fixture/schema changes needed.

3. **Navigation ambiguity guard (optional, same scope, not a second truth source)**
   - Add/adjust a runtime assertion in `sceneIndexForLocation` behavior to enforce that deep links with duplicates require `configName` (or continue to fail deterministically if only `scene` is provided), so intent aligns with unique `configName`.

## 4) Risk of allowing duplicate scene IDs in runtime sequence output

1. **URL ambiguity by `sceneId` alone.**
   - `sceneIndexForLocation` first branch can still search by `sceneId` only (`findIndex(...)`) at **lines 105–106**.
   - If callers use `?scene=<id>` without `?config=...`, reused scenes can map unpredictably to first occurrence, masking duplicates instead of failing fast.

2. **Potential UX/analytics/state ambiguity.**
   - Runtime state transitions and router replacement currently set both `sceneId` and `configName` (**LearnSidebar line 59**), but any external path using only `scene` loses step/config specificity.

3. **Performance side effect (non-breaking).**
   - Reused `id` causes repeated fetching/parsing of the same scene file per sequence step (`loadScene` calls `/scenes/${ref.id}.json` for every step, **line 86**), resulting in duplicate network/cache pressure.

## Recommendation (minimal change)

1. **Runtime:** remove only the `sceneIds` duplicate guard in `scenesForSequence` (keep step uniqueness check).
2. **Build:** remove only the `sceneIds` duplicate guard in `validateSequence` (keep step uniqueness + `overlay.scene` requirement for learning).
3. **Regression safety:** keep/extend `sceneIndexForLocation`/URL behavior so `configName` is required or treated as authoritative when scene IDs are reused.

## Post-Implementation Review

Verdikt: FAIL

1. **Builder-seitige Regression fuer den erhaltenen Duplicate-Step-Guard ist nicht abgesichert.**
   - Im Code ist das Ziel aktuell korrekt umgesetzt: Runtime `scenesForSequence` wirft weiter bei doppelten Steps, hat aber keinen Duplicate-Scene-Guard mehr ([apps/brain-app/src/scene/scenes.ts](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/scene/scenes.ts:58>)). Builder `validateSequence` wirft weiter bei doppelten Steps, verlangt `overlay.scene` nur fuer Learning-Sequenzen und prueft keine doppelten Scene-IDs mehr ([scripts/atlas/build-config.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:527>), [scripts/atlas/build-config.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:591>)).
   - Runtime-Tests pinnen das neue Verhalten sauber: wiederverwendete `/scenes/vcpt.json` wird akzeptiert und `configName` disambiguiert wiederverwendete Scene-IDs ([apps/brain-app/src/scene/scenes.test.ts](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/scene/scenes.test.ts:186>), [apps/brain-app/src/scene/scenes.test.ts](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/scene/scenes.test.ts:238>)).
   - Auf Builder-Seite decken die neuen Tests nur `overlay.scene`-Pflicht und erlaubte Wiederverwendung ab ([scripts/atlas/build-config.test.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.test.mjs:169>), [scripts/atlas/build-config.test.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.test.mjs:184>)). Es fehlt weiterhin ein expliziter Test fuer `learning.steps = ['a', 'a'] -> throw`. Da genau diese Funktion in diesem Issue relaxiert wurde, ist das ein relevanter Regression-Gap und sollte vor `Done` geschlossen werden.

2. **Verifikation**
   - `node --test scripts/atlas/build-config.test.mjs`: 28/28 gruen.
   - `pnpm --dir apps/brain-app exec vitest run src/scene/scenes.test.ts`: 14/14 gruen.

## Post-Fix Nachreview

Verdikt: PASS

1. **Runtime entspricht weiter der Issue-Absicht.**
   - `scenesForSequence` verwirft nur doppelte Steps und erlaubt wiederverwendete Scene-IDs, weil nur `steps` dedupliziert werden ([apps/brain-app/src/scene/scenes.ts](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/scene/scenes.ts:58>)).
   - Die Runtime-Tests pinnen sowohl wiederverwendete `/scenes/vcpt.json` als auch die Disambiguierung ueber `configName` ab ([apps/brain-app/src/scene/scenes.test.ts](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/scene/scenes.test.ts:186>), [apps/brain-app/src/scene/scenes.test.ts](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/scene/scenes.test.ts:238>)).

2. **Builder deckt jetzt auch den zuvor fehlenden Duplicate-Step-Invariant explizit ab.**
   - `validateSequence` verwirft doppelte Steps weiter, verlangt `overlay.scene` nur fuer Learning-Sequenzen und erlaubt wiederverwendete Scene-IDs, weil kein Scene-ID-Dedupe mehr existiert ([scripts/atlas/build-config.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:527>), [scripts/atlas/build-config.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:597>)).
   - Der neue Test `validateConfig wirft bei doppelten Learning-Steps` schliesst genau die vorherige Luecke und erwartet `learning "learn" enthaelt doppelten Step "a"` fuer `steps: ['a', 'a']` ([scripts/atlas/build-config.test.mjs](</Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.test.mjs:195>)).

3. **Frische Verifikation**
   - `node --test scripts/atlas/build-config.test.mjs`: 29/29 gruen.
   - `pnpm --dir apps/brain-app exec vitest run src/scene/scenes.test.ts`: 14/14 gruen.
   - `pnpm --dir apps/brain-app typecheck`: Exit 0.
   - `git diff --check`: Exit 0.
