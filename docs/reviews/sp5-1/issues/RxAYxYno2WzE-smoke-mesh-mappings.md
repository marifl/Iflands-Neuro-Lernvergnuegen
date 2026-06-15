# SP5.1 Smoke Mesh-Mappings Mapping Review

## Scope

1. Fokus auf existenzielle vs vollständige Mesh-Mapping-Validierung in den Smoke-Skripten rund um Figure- und ERP-Flows.
2. Analysierte Dateien: `scripts/atlas/smoke-figures.mjs`, `scripts/atlas/smoke-eeg.mjs`, `scripts/atlas/smoke-eeg-p3b.mjs`, `scripts/atlas/smoke-eeg-p3z.mjs`, `apps/brain-app/scripts/smoke-scenes.mjs`, `apps/brain-app/public/assets/atlas-canonical/atlas-config.json` (`mesh_mappings.buckets|scene_regions`), `apps/brain-app/src/scene/regions.ts`, `apps/brain-app/src/viewer/meshMappings.generated.json`.

## Mapped Paths

1. `scripts/atlas/smoke-figures.mjs`
   1. Loads runtime config for mapping: line 15.
   2. Bucket->meshes lookup from `config.mesh_mappings.buckets`: lines 40-44.
   3. Config->bucket->preset mapping for expectations: lines 47-67.
   4. Expected meshes are checked via `mesh.every` and `wrong.length === 0`: lines 142 and 151-153.

2. `scripts/atlas/smoke-eeg.mjs`
   1. Loads `atlas-config.json`: line 13.
   2. Builds expected meshes via `cfg.regions?.scene_regions` + `config.mesh_mappings.scene_regions`: lines 21-27 and 42.
   3. Visibility check is currently existential (`some`): line 108.
   4. Intensity checks only span/max across samples: lines 109-115.

3. `scripts/atlas/smoke-eeg-p3b.mjs` and `scripts/atlas/smoke-eeg-p3z.mjs`
   1. Hard-coded filter target via env var only: line 1 each.
   2. Delegate to `smoke-eeg.mjs` unchanged: line 2 each.

4. `apps/brain-app/scripts/smoke-scenes.mjs`
   1. Loads same `atlas-config.json`: line 10.
   2. Build expected scene meshes from `cfg.regions.scene_regions` + `config.mesh_mappings.scene_regions`: lines 38-43 and 170.
   3. Poll loop stops on `want.every(...)`: line 174.
   4. Deterministic check only on missing meshes (`missing.length === 0`), no extra-lit set check: lines 181-183.

5. Mapping sources
   1. `atlas-config.json` contains canonical `mesh_mappings.buckets` and `mesh_mappings.scene_regions`: lines 496-709.
   2. `apps/brain-app/src/scene/regions.ts` consumes generated mapping JSON (`meshMappings.generated.json`): lines 8-10.
   3. `apps/brain-app/src/viewer/meshMappings.generated.json` mirrors same keys/shape for `buckets` + `scene_regions`: lines 1-214.

## Current Behavior

1. In `smoke-figures.mjs`, expected mesh sets are derived from config mapping and not hard-coded; checks assert every expected mesh in each row gets the expected color (`wrong.length === 0`) and legend count matches groups, but it does not verify no unexpected meshes in the figure state.
2. In `smoke-eeg.mjs`, expected mesh sets are also derived from config mapping, but the mesh-specific presence assertion is existential only: it only requires at least one sample with any visible mesh in the set (`samples.some(...)`).
3. In `smoke-scenes.mjs`, expected meshes are derived from scene-region mapping and polling requires all expected meshes to appear in `lit` once (`want.every(...)`), but still only checks missing set length; it does not assert deterministic equality between expected/actual lit mesh sets.
4. `smoke-eeg-p3b` and `smoke-eeg-p3z` are wrappers that only set `EEG_SMOKE_CONFIGS` and import `smoke-eeg.mjs`.

## Test/Smoke Gaps

1. `scripts/atlas/smoke-eeg.mjs`
   1. `samples.some((sample) => sample.vis)` is an existence-only check; not all expected meshes are validated to be visible (risk: only one of many region meshes pulses). (line 108)
2. `sampleSource` currently returns `{ vis, intensity }` for all expected names but does not emit per-mesh visibility identity; prevents deterministic completeness checks (lines 78-90).
3. `scripts/atlas/smoke-figures.mjs`
   1. No hard-coded mesh lists found, but no check for unexpected visible/colored meshes outside expectation set; false positives possible if extra meshes also get highlighted.
4. `apps/brain-app/scripts/smoke-scenes.mjs`
   1. Stops polling on all expected present, but final assertion only evaluates `missing.length === 0`, so unexpected lit meshes can still pass (lines 172-173, 181-183).

## Recommended Minimal Slice

1. Keep derivation from `atlas-config.json` as-is (already present), and tighten checks to deterministic set-completeness in only the existing smoke scripts.

2. `scripts/atlas/smoke-eeg.mjs` (minimal change set)
   1. Extend `sampleSource` to return visible expected mesh names (set/string array) per sample instead of only boolean.
   2. Replace `visible = samples.some(...)` with:
      1. aggregate seen mesh names across samples,
      2. `allExpectedSeen = expected.every(mesh => seen.has(mesh))`.
   3. Add optional deterministic extras check where feasible:
      1. compute `observedExtra = allObserved.filter(m => !expectedSet.has(m))` and assert if/where policy allows.

3. `apps/brain-app/scripts/smoke-scenes.mjs`
   1. Keep polling strategy (`want.every(...)`) but after capture compare both sides explicitly:
      1. `missing = want.filter(m => !litSet.has(m))`
      2. `extra = lit.filter(m => !wantSet.has(m))`
      3. assert missing == 0 and (if stable) log/track extras.

4. Optional follow-up (small consistency hardening)
   1. Add shared helper under `scripts/atlas/` for mapping lookup + deterministic mesh-set compare (no config schema changes), then use in the two smoke paths (`smoke-figures`, `smoke-eeg`, `smoke-scenes`) without changing runtime behavior.

## Skeptischer Review

1. Ist der erwartete Output für ERP-Scenes streng (alle erwarteten Meshes müssen gleichzeitig sichtbar sein) oder reicht „mindestens ein erwarteter Mesh-Punkt pulst“? Ohne diese Spezifikation kann ein zu strikter Extra/All-expected-Check in `smoke-eeg` false positives erzeugen, falls die Quelle absichtlich partiell emittiert.
2. Werden `meshMappings.generated.json` und `atlas-config.json` weiterhin parallel gepflegt, oder besteht hier künftig ein Canonical-Source-Risiko (mögliche Drift), wenn nur eines aktualisiert wird?

## Post-Implementation Review

Verdikt: FAIL

1. Die zentrale Vorab-Kritik an `scripts/atlas/smoke-eeg.mjs` ist behoben: der Smoke prüft nicht mehr nur existenziell. `sampleSource()` liefert pro erwartetem Mesh Sichtbarkeit und Emissive-Intensität (`scripts/atlas/smoke-eeg.mjs:80-96`), `summarizeMeshSamples()` verdichtet das je Mesh (`scripts/atlas/smoke-eeg.mjs:98-112`), und die Assertions laufen jetzt über `missing`, `hidden`, `weakSpan`, `weakMax` und `weakMin` für das vollständige erwartete Mesh-Set (`scripts/atlas/smoke-eeg.mjs:134-146`). Das passt zur Runtime: im Viewer pulsen gehighlightete ERP-Meshes zwischen `0.15 + 0.85 * erpPulse` und dem Ruhewert, nicht nur als bloßes On/Off (`apps/brain-app/src/viewer/BodyParts3DViewer.tsx:275-280`).
2. `scripts/atlas/smoke-figures.mjs` prüft weiterhin vollständig pro Bucket statt nur existenziell: für jeden Bucket werden alle aufgelösten Meshes gesammelt (`scripts/atlas/smoke-figures.mjs:57-67`), mehrfach gesampelt (`scripts/atlas/smoke-figures.mjs:138-144`) und per `wrong.length === 0` auf Vollständigkeit der Preset-Farbe geprüft (`scripts/atlas/smoke-figures.mjs:145-153`).
3. Der bestehende Report oberhalb dieser Sektion beschreibt damit teilweise den Vorzustand. Insbesondere die Aussagen zu `samples.some(...)` und rein existentialen ERP-Checks in `scripts/atlas/smoke-eeg.mjs` sind nach dem aktuellen Patch überholt.

### Blocking Findings

1. `scripts/atlas/smoke-eeg.mjs` lässt ERP-Configs mit null aufgelösten Source-Meshes weiterhin durch. `expectedMeshes()` wirft nur bei unbekannten oder leeren Region-Mappings, aber nicht bei einem insgesamt leeren Ergebnis (`scripts/atlas/smoke-eeg.mjs:21-28`). Dieses leere Array wird unverändert in `cfg.meshes` übernommen (`scripts/atlas/smoke-eeg.mjs:36-45`); danach passieren alle fünf Mesh-Assertions vakant über leere Arrays (`scripts/atlas/smoke-eeg.mjs:130-146`). Eine ERP-Config mit fehlendem `regions.scene_regions` würde damit trotz fehlender Source-Geometrie als `SMOKE OK` enden. Fix-Anweisung: direkt nach dem Auflösen `cfg.meshes.length > 0` erzwingen oder `expectedMeshes()` bei leerem Input/Output hart fehlschlagen lassen.
2. `scripts/atlas/smoke-eeg.mjs` protokolliert Browser-`pageerror`, wertet sie aber nicht als Testfehler. Der Handler loggt nur (`scripts/atlas/smoke-eeg.mjs:53-55`); der Exit-Status hängt ausschließlich an `fails` aus den manuellen Checks (`scripts/atlas/smoke-eeg.mjs:159-161`). `scripts/atlas/smoke-figures.mjs` ist hier bereits strenger und failt explizit auf `pageErrors.length !== 0` (`scripts/atlas/smoke-figures.mjs:112-116` und `scripts/atlas/smoke-figures.mjs:157`). Damit kann ein uncaught Runtime-Fehler im ERP-Overlay heute unbemerkt als grüner Smoke durchlaufen, solange Cursor/Text/Mesh-Samples zufällig noch antworten. Fix-Anweisung: dieselbe `pageErrors`-Sammlung und eine abschließende Null-Assertion in `smoke-eeg.mjs` ergänzen.
3. `scripts/atlas/smoke-figures.mjs` verliert einzelne Figure-Configs still aus der Abdeckung, wenn deren Mapping-Felder fehlen. `figureConfigs()` filtert nur Konfigurationen mit `replaces_figure`, `colors.preset` und nicht-leeren `regions.buckets` ein (`scripts/atlas/smoke-figures.mjs:47-55`); ein Fehler in genau einem Figure-Config entfernt diesen Datensatz damit einfach aus dem Smoke. Der Test schlägt erst fehl, wenn gar keine Figure-Config mehr übrig bleibt (`scripts/atlas/smoke-figures.mjs:107-108`). Für ein Mapping-Smoke ist das zu schwach: ein versehentlich geleertes Bucket-Mapping einer einzelnen Figur würde Coverage verlieren statt rot zu werden. Fix-Anweisung: zuerst alle `replaces_figure`-Configs enumerieren und hart fehlschlagen, sobald eine davon kein `colors.preset` oder keine nicht-leeren `regions.buckets` mehr hat.

### Verification Notes

1. Die vom Auftrag mitgelieferten Checks decken Syntax, Build-Tests, Typecheck und beide Smokes ab: `node --check scripts/atlas/smoke-eeg.mjs`, `node --test scripts/atlas/build-config.test.mjs`, `pnpm --dir apps/brain-app typecheck`, `SMOKE_URL=... node scripts/atlas/smoke-eeg.mjs`, `SMOKE_URL=... node scripts/atlas/smoke-figures.mjs`, `git diff --check`.
2. Ein frischer Browser-Smoke wurde in dieser Review nicht erneut gestartet; das Urteil oben stützt sich auf die gelaufenen Verifikationen plus statische Prüfung der aktuellen Implementierung.

## Post-Fix Nachreview

Verdikt: PASS

1. Der ERP-Smoke failt jetzt korrekt, wenn eine ERP-Config keine `regions.scene_regions` mitbringt oder daraus keine Source-Meshes aufgelöst werden. `expectedMeshes(regions, context)` wirft sowohl bei leerem Regions-Array als auch bei leerem aufgelöstem Mesh-Set (`scripts/atlas/smoke-eeg.mjs:21-30`), und jede ERP-Config läuft durch genau diesen Pfad (`scripts/atlas/smoke-eeg.mjs:39-49`).
2. `scripts/atlas/smoke-eeg.mjs` behandelt Browser-`pageerror` jetzt als echte Testverletzung. Die Fehler werden gesammelt (`scripts/atlas/smoke-eeg.mjs:58-62`) und vor dem Exit mit `check(pageErrors.length === 0, ...)` hart bewertet (`scripts/atlas/smoke-eeg.mjs:166-168`), analog zum Figure-Smoke.
3. Der Figure-Smoke verliert Color-Figure-Configs nicht mehr still aus der Abdeckung. `figureConfigs()` enumeriert jetzt alle `replaces_figure`-Configs außer den explizit abgeschalteten Fällen `colors.enabled === false` (`scripts/atlas/smoke-figures.mjs:47-49`) und wirft laut, wenn für eine Color-Figure `colors.preset` oder `regions.buckets` fehlt (`scripts/atlas/smoke-figures.mjs:50-55`). Die aktuelle Runtime-Config passt zu dieser Policy: ERP/vCPT-Replacements sind explizit mit `colors.enabled=false` markiert, während die echte Color-Figure `basalganglienschleifen` Preset plus Buckets liefert (`apps/brain-app/public/assets/atlas-canonical/atlas-config.json`, geprüft gegen aktuelle Konfigurationswerte in dieser Nachreview).
4. Im nachgereviewten Scope bleibt kein blockerartiger Restbefund. Die strengeren per-Mesh-ERP-Assertions bleiben inhaltlich konsistent mit der Runtime-Pulslogik des Viewers (`apps/brain-app/src/viewer/BodyParts3DViewer.tsx:274-280`), und die vom Auftrag gemeldete frische Verifikation deckt Syntax, Build-Tests, Typecheck und beide Smokes ab.

### Verification Notes

1. Diese Nachreview basiert auf statischer Prüfung der aktuellen Dateien plus den vom Auftrag mitgelieferten frischen Verifikationen: `node --check scripts/atlas/smoke-eeg.mjs && node --check scripts/atlas/smoke-figures.mjs`, `SMOKE_URL=... node scripts/atlas/smoke-figures.mjs`, `node --test scripts/atlas/build-config.test.mjs`, `pnpm --dir apps/brain-app typecheck`, `SMOKE_URL=... node scripts/atlas/smoke-eeg.mjs`, `git diff --check`.
2. Ein zusätzlicher Browser-Smoke wurde in dieser Nachreview nicht erneut gestartet.
