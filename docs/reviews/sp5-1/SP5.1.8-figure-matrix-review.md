# SP5.1.8 Figure-Matrix Review

## Findings

### High - Known-Figures validation is self-referential instead of mapping-backed

`docs/SP5_1_FIGURE_MATRIX.md:3-4` declares `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md` as the source for the figure inventory, but the builder does not load that source. Instead, `scripts/atlas/build-config.mjs:15` points `FIGURE_MATRIX` at the matrix document, `scripts/atlas/build-config.mjs:221-226` builds `knownFigures` by parsing rows from that same matrix, and `scripts/atlas/build-config.mjs:264-266` validates `replaces_figure` against those matrix-derived aliases.

The regression test repeats the same source: `scripts/atlas/build-config.test.mjs:315-319` parses the matrix and compares it to `loadKnownFigures()`, which also parsed the matrix. That means a missing mapping row, a fake matrix row, or a future change in the ignored local mapping can pass the test as long as the matrix is internally consistent. The current local matrix manually matches the local mapping, but the acceptance criteria are not enforced by automation.

Impact: acceptance checks for "all figures from mapping have status" and "every `replaces_figure` references a known figure" can silently drift. A config can be treated as known because a row exists in the matrix, not because it exists in the Kapitel-11 mapping source.

Required fix direction: parse the mapping source, or a tracked generated fixture derived from it, as the known-figure set. Then test matrix rows against that mapping-backed set and validate `replaces_figure` against the same mapping-backed set. Because `.gitignore:52` ignores `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`, CI also needs either a tracked fixture or an explicit failure mode when the source is absent.

## Scope

Reviewed the current uncommitted worktree for `[SP5.1.8] Kapitel-11-Figuren-Matrix in Config abgleichen`.

Focused files:

- `docs/SP5_1_FIGURE_MATRIX.md`
- `docs/MASTERPLAN.md`
- `scripts/atlas/build-config.mjs`
- `scripts/atlas/build-config.test.mjs`
- `scripts/atlas/config.default.toml`
- `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`
- local ignored `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`
- relevant smoke/test files referenced by the matrix

## Evidence Inspected

- Local ignored mapping exists and is ignored by `.gitignore:52`.
- Mapping rows inspected at `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md:16-39` plus the text-only 11-12 entry at `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md:41-44`.
- Matrix rows inspected at `docs/SP5_1_FIGURE_MATRIX.md:13-30`; the status summary is at `docs/SP5_1_FIGURE_MATRIX.md:32-38`.
- Masterplan mirrors the matrix summary at `docs/MASTERPLAN.md:267-285`.
- Runtime source configs inspected at `scripts/atlas/config.default.toml:242-340` and `scripts/atlas/config.default.toml:436-471`.
- Generated replacements inspected in `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:47`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:286`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:330`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:371`, and `apps/brain-app/public/assets/atlas-canonical/atlas-config.json:419`.
- Smoke coverage inspected:
  - `scripts/atlas/smoke-figures.mjs:30-38` discovers figure configs with `replaces_figure`, color preset, and buckets.
  - `apps/brain-app/scripts/smoke-scenes.mjs:18-35` derives scene checks from `kapitel11-pfad`.
  - `scripts/atlas/smoke-eeg.mjs:30-51` discovers or filters ERP configs.
  - `scripts/atlas/smoke-eeg-p3b.mjs:1-2` and `scripts/atlas/smoke-eeg-p3z.mjs:1-2` pin the P3b/P3z smoke configs.
- Manual read-only comparison found no current row drift: mapping and matrix both resolve to 18 figure units, with no missing or extra matrix rows.
- Runtime `replaces_figure` entries resolve to exactly five done rows: `11-04`, `11-14`, `11-15(1)`, `11-15(2)`, and `11-15(3)`.

## Verification Run

- `node --test scripts/atlas/build-config.test.mjs` - pass, 19/19 tests.
- `cd apps/brain-app && pnpm exec vitest run src/viewer/atlas/configExport.test.ts` - pass, 5/5 tests.
- `node --input-type=module ... buildConfig()/formatConfig() compare` - pass, generated `atlas-config.json` matches `buildConfig()` output.
- `node --input-type=module ... mapping-vs-matrix compare` - pass, no missing/extra rows in the current local files.

Browser-smoke commands were not run because the referenced scripts write screenshots into ignored work directories, e.g. `scripts/atlas/smoke-figures.mjs:139-140` and `scripts/atlas/smoke-eeg.mjs:56,126`, while this review was only allowed to write the report file.

## Residual Risk

- The local mapping is ignored, so the matrix can remain green in a different checkout without the actual mapping source being present.
- Fresh browser-smoke evidence was not produced in this review due to the write constraint. Existing ignored screenshots under `scripts/atlas/work/` were not treated as current verification evidence.
- The current matrix status appears consistent with the current generated Runtime-Config, but the missing mapping-backed validator means future drift is still under-tested.
