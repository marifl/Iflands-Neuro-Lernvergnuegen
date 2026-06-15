# [SP5.1] Mapping: config/scene mismatch creates hybrid rendering (VEN10nKwQda8)

## Status

Not approved (read-only mapping completed).

## Scope

Issue analysis for deep-link path `?config=vcpt&scene=p3a-konfliktmonitoring` and any mismatch form `?config=<id>&scene=<id>`.

Focus:

1. `parseLocation`
2. `main.tsx` appMode switch
3. `LearnSidebar` start index
4. `loadScenes` in `scenes.ts`
5. `CameraRig` effective-config precedence
6. existing smokes

## Evidence (Trace)

1. `apps/brain-app/src/main.tsx`
   - Query handling is ordered: `scene` sets learn mode, `config` sets explore mode only if no `scene` exists.
   - So URLs containing both parameters enter learn mode.

2. `apps/brain-app/src/scene/router.ts`
   - `parseLocation()` parses both `scene` and `config` independently and does not cross-validate.

3. `apps/brain-app/src/scene/LearnSidebar.tsx`
   - On `loadScenes()` success, startup index is computed as:
     - `sceneId` first
     - then `configName`
     - else `0`
   - Later, `replaceCanonicalLocation()` rewrites URL to include `configName=scene.configName` and `scene=id`.

4. `apps/brain-app/src/scene/scenes.ts`
   - `loadScenes()` always reads the learning sequence (`kapitel11-pfad`) and sets `configName` to the sequence step name.

5. `apps/brain-app/src/scene/CameraRig.tsx`
   - Selected camera config uses `figureCameraConfig ?? sceneCameraConfig ?? legacyCameraConfig`.
   - `figureCameraConfig` is derived from `useEffectiveConfig()`.

6. `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
   - `computeEffectiveConfig()` sets `activeConfiguration` from URL `config` (URL takes precedence over local overrides).
   - `useEffectiveConfig()` refreshes on popstate and `ROUTE_CHANGE_EVENT`.

## Finding (root cause)

For mixed URL (`?config=<A>&scene=<B>`), state is split:

- learn pipeline selects scene `<B>` via sidebar index logic,
- effective config pipeline still uses `<A>` for camera/scopes via URL config.

This creates deterministic hybrid output: scene/overlay content from `<B>` and config-backed camera/scopes from `<A>`, with no fail-loud error.

Also:

- router/scene/config unit tests cover normal round-trips and single-parameter inputs only; no mismatch assertion.
- `apps/brain-app/scripts/smoke-scenes.mjs` already checks config-only and config nav, but no explicit mixed config+scene mismatch probe.

## Minimal fail-loud hook point

Recommended minimal hook:

- `apps/brain-app/src/scene/LearnSidebar.tsx`
  - In the existing `loadScenes().then(...)` block, after `all` is loaded and `loc` is parsed.
  - If both `loc.sceneId` and `loc.configName` are set, validate that they refer to the same loaded scene item.
  - On mismatch: throw explicit error (fail-loud).

This is minimal because this is the only single place that has both URL values and the loaded learn sequence together at startup.

## Suggested test/smoke updates

1. `apps/brain-app/src/scene/router.test.ts`
   - Keep parse tests focused on parsing behavior; mismatch behavior should be asserted at resolver layer instead.

2. `apps/brain-app/tests/e2e/learn-page.spec.ts` (new dedicated deep-link case)
   - Add case: `/?config=vcpt&scene=p3a-konfliktmonitoring`.
   - Assert fail-loud path (error surface / pageerror count > 0) rather than silent hybrid rendering.

3. `apps/brain-app/scripts/smoke-scenes.mjs`
   - Add explicit mixed URL case with expected fail-loud (or canonical hard-reject behavior, depending on fix choice).
   - Keep existing `config-only-link`, `config-only-nav` and per-scene checks intact.

4. Existing smoke suite references
   - `apps/brain-app/tests/e2e/learn-page.spec.ts`
   - `apps/brain-app/tests/e2e/composition-page.spec.ts`
   - `apps/brain-app/scripts/smoke-scenes.mjs`

## Owner Review Addendum (2026-06-15)

### Finding 1 — Critical — Blocks Done

- **Area:** [apps/brain-app/src/viewer/BodyParts3DViewer.tsx](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/BodyParts3DViewer.tsx:104), [apps/brain-app/src/scene/LearnSidebar.tsx](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/scene/LearnSidebar.tsx:58)
- **Problem:** `hasConfigUrl` is captured once at mount with `useMemo(..., [])`. A pure `?scene=<B>` entry later becomes canonical `?config=<sceneOfB>&scene=<B>&step=0` via `replaceCanonicalLocation()`, but the config-side effects in `ConfigLinkStateApplier` stay permanently gated off because they still believe there was no `config` in the URL.
- **Why this matters:** This leaves two different behaviors for the same final canonical URL. `?scene=p3a-konfliktmonitoring` and `?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring` end at the same URL, but not at the same rendered state. That is still a hybrid-truth bug and violates the requirement that pure `scene` links remain valid without a second truth.
- **Concrete runtime evidence:** With a fresh dev server on `http://127.0.0.1:5188`, I compared:
  - `/?scene=p3a-konfliktmonitoring`
  - `/?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring`
  - `/?config=p3a-konfliktmonitoring`
  After `4.5s`, all three had the same canonical search string `?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=0`, but `scene`-only kept **600** visible named meshes while the matching `config+scene` and `config` paths had **508**. The extra `92` meshes visible only on the `scene`-only path include `cerebral-hemisphere-segment-of-dura-mater`, `falx-cerebri`, `left-cingulate-gyrus`, `right-cingulate-gyrus`, and many other cortical gyri. That matches the missing `carve_on_taro=dkt` side effect for `p3a-konfliktmonitoring`.
- **Root cause path:** `LearnSidebar` canonicalizes the URL after scene load, but `BodyParts3DViewer` never re-evaluates whether the current URL has a `config`, so the effects at lines 110-160 do not run for the canonicalized `scene`-only entry path.
- **Coverage gap:** The current tests and smoke only prove mixed mismatch rejection plus config-entry success. They do not assert equivalence between `scene`-only and matching canonical `config+scene` entry for config-backed side effects such as carve/preset/cuts.

## Post-Fix Review

### Verdict

No blocking findings in the reviewed fix. The previously recorded blocker is resolved.

### Evidence

- **Code path fixed:** [apps/brain-app/src/viewer/atlas/atlasConfig.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/atlasConfig.ts:140) now exposes `hasUrlConfig` from the current URL, and [apps/brain-app/src/viewer/BodyParts3DViewer.tsx](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/BodyParts3DViewer.tsx:104) consumes `effectiveConfig?.hasUrlConfig ?? false` instead of a mount-time memoized flag. Because `useEffectiveConfig()` refreshes on `ROUTE_CHANGE_EVENT`, canonicalization from `LearnSidebar` now re-triggers config-side effects.
- **Unit coverage added:** [apps/brain-app/src/viewer/atlas/atlasConfig.test.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/atlasConfig.test.ts:127) now asserts `hasUrlConfig=false` for local-only config resolution and `hasUrlConfig=true` for URL-driven config resolution.
- **Smoke coverage added:** [apps/brain-app/scripts/smoke-scenes.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/scripts/smoke-scenes.mjs:120) now compares the visible named mesh count from the scene-only entry path against the matching canonical config entry path, which directly covers the regression I reported.
- **Fresh reviewer repro:** I re-ran the original entry-path comparison against a local dev server on `http://127.0.0.1:5188` with cleared `localStorage`. Both
  - `/?scene=p3a-konfliktmonitoring`
  - `/?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring`
  settled to the same canonical URL `?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=0` and the same visible named mesh count `508`, with presenter chrome present in both cases. That closes the previously documented hybrid-rendering path.

### Residual Risk

Residual risk is low and limited to future scene/config pairs that introduce new config-backed side effects without extending the same equality smoke. Nothing in the current reviewed diff reopens the original blocker.
