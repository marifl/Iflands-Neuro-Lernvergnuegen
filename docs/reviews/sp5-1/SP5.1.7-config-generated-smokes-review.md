# Scope

Critical review for `[SP5.1.7] Config-generierte Tests und Browser-Smokes ergänzen` in the current uncommitted worktree.

Reviewed focus areas:

1. `apps/brain-app/scripts/smoke-scenes.mjs`
2. `scripts/atlas/smoke-figures.mjs`
3. `scripts/atlas/smoke-preset.mjs`
4. `scripts/atlas/smoke-subparcels.mjs`
5. `scripts/atlas/smoke-eeg.mjs`
6. `scripts/atlas/smoke-eeg-p3b.mjs`
7. `scripts/atlas/smoke-eeg-p3z.mjs`
8. `scripts/atlas/build-config.test.mjs`
9. generated config JSON and generated mesh mapping consumers

# Findings

1. High — `smoke-scenes` still does not verify the camera claimed by Runtime-Config.

   `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:119`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:159`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:252`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:306`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:347`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:388`, and `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:437` define per-config camera settings (`shot`, `fit`, `target`, `margin`). The smoke records camera positions in `apps/brain-app/scripts/smoke-scenes.mjs:73` and `apps/brain-app/scripts/smoke-scenes.mjs:86`, but the only camera assertion is the hard-coded `p3b-engagement` vs. `p3a-konfliktmonitoring` distance check in `apps/brain-app/scripts/smoke-scenes.mjs:117`. A regression that ignores `superior` for `ica-uebersicht`, ignores `fit=target`/`target` for `p3a-konfliktmonitoring`, or drops `margin`/`fov` would still pass as long as those two scenes end up more than five units apart.

2. High — the figure color smoke manually activates the preset and therefore does not prove that config-declared colors are runtime-applied.

   `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:10` and `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:205` declare `colors.preset` on configurations, but `scripts/atlas/smoke-figures.mjs:116` navigates to `?config=<name>` and `scripts/atlas/smoke-figures.mjs:118` then clicks the same preset through the footer UI. The app-side effective config currently exposes `facets`, `view`, `camera`, and `scopes`, but no `colors`, in `apps/brain-app/src/viewer/atlas/atlasConfig.ts:139` and `apps/brain-app/src/viewer/atlas/atlasConfig.ts:171`; the actual preset activation path is the manual `setPreset(p)` click in `apps/brain-app/src/viewer/FooterBar.tsx:169`. This means the smoke can pass even if `colors.preset` in atlas config is dead metadata.

3. High — `meshMappings.generated.json` is still a local-only generated file while app code imports it directly.

   `apps/brain-app/src/scene/regions.ts:7` and `apps/brain-app/src/viewer/bucketMeshes.ts:7` import `apps/brain-app/src/viewer/meshMappings.generated.json` at module load. `scripts/atlas/build-config.mjs:399` writes that file only in the CLI writer path. In the current worktree, `git status --short` reports `?? apps/brain-app/src/viewer/meshMappings.generated.json`, while `git ls-files` lists `atlas-config.json`, `regions.ts`, and `bucketMeshes.ts` but not the generated mapping. Typecheck and Vitest passed only because the untracked local file exists; a clean checkout or CI run without that file will fail unless it is committed or generated before TypeScript/Vite loads the app.

4. Medium — figure and ERP smokes use existential mesh checks, so partial stale mappings can pass.

   `scripts/atlas/smoke-figures.mjs:124` iterates every config bucket, but `scripts/atlas/smoke-figures.mjs:128` stops once any mesh in that bucket has the legend color and `scripts/atlas/smoke-figures.mjs:131` reports only one matched mesh. Large buckets such as `dlpfc` contain many expected meshes in `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:509`, so a regression coloring only one mesh per bucket would pass. `scripts/atlas/smoke-eeg.mjs:103` has the same shape for ERP sources: it samples aggregate visibility/intensity over the config mesh list and checks `visible`, `max`, and `min` in `scripts/atlas/smoke-eeg.mjs:108`, not per expected mesh.

# Evidence Inspected

1. Archex repository architecture profile for the local repo.
2. `git status --short` and `git diff --stat` for the uncommitted worktree.
3. Full current contents and targeted diffs for all requested smoke scripts.
4. `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`, especially configuration camera/color declarations and `mesh_mappings`.
5. Runtime consumers: `LearnSidebar`, `CameraRig`, `cameraResolve`, `atlasConfig`, `FooterBar`, `SubParcels`, `regions`, `brainBridge`, `bucketMeshes`, and `colorPresets`.
6. `scripts/atlas/build-config.mjs` and `scripts/atlas/build-config.test.mjs`.
7. Read-only builder parity check: current `atlas-config.json` matches `formatConfig(await buildConfig())`, and current `meshMappings.generated.json` matches `formatConfig(config.mesh_mappings)`.
8. Search for stale copied expectation lists in the focused smoke scripts. The old hard-coded mesh arrays were removed from the current smoke files; remaining mesh lists in `scripts/atlas/build-config.test.mjs:27` are synthetic unit-test fixtures, not duplicate real expectations.

# Verification Run

1. `pnpm typecheck` in `apps/brain-app` — exit 0.
2. `pnpm exec vitest run` in `apps/brain-app` — exit 0, 22 test files / 111 tests passed. React `act(...)` warnings remain in `FooterBar.test.tsx`.
3. `node --test scripts/atlas/build-config.test.mjs` — exit 0, 19 tests passed.
4. `SMOKE_URL=http://localhost:5174 node apps/brain-app/scripts/smoke-scenes.mjs` — exit 0, all scene smoke checks passed.
5. Attempted `pnpm test -- --run` first; it started Vitest watch mode (`vitest -- --run`) and was terminated before the proper `pnpm exec vitest run`.

# Residual Risk

1. I ran one Browser-Smoke (`smoke-scenes`) to satisfy the acceptance evidence, but did not run every atlas smoke (`smoke-figures`, `smoke-eeg`, `smoke-subparcels`, and wrappers).
2. The green browser smoke used a reachable local Vite server at `http://localhost:5174`; older Vite processes already existed on the machine and were left running.
3. The review focused on SP5.1.7 smoke/config coverage and did not perform a full product-code audit of the broader uncommitted diff.
