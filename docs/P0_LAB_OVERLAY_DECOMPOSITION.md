# P0 Lab-Overlay — Slice-Decomposition

Stand: 26. Juni 2026. Single Source of Truth fuer die Zerlegung der Epic
[wxHwlA8S0Z6i](https://app.dartai.com/t/wxHwlA8S0Z6i) (EEG-lab-taugliche granulare
ROI-/Atlas-/Probability-Overlays auf austauschbaren Brain Models, fail-loud).

## Arbeitsweise
- Jede Slice ist ein-Session-machbar und einzeln verifizierbar.
- Daten-Vertraege (Zod, render-frei) zuerst; Render-/Shader-Risk zuletzt.
- Dart-Task + dieses Doc parallel pflegen. Slice fertig -> Task In Review (Review: Marcus).
- Split-Tasks werden just-in-time in Dart angelegt, wenn die Slice gestartet wird
  (kein spekulatives Board-Cluttering).

## Erledigt
- `qn3qwiJMev1p` [P0.1] MNI Mobile/Desktop-LODs — **Done**.
- `b4U4JPZcVwMw` Lab-Overlay-Datenvertrag (`overlayContract.ts`) — **In Review** (Commit cbd5458).
- `9xGQeXYPZqS1` BrainModel-Registry, AK-Bar (`brainModelOptions.ts` +space +validator) — **In Review** (Commit 0b2967e). Restpunkte siehe Slice C/D/„-C".

## Dependency-DAG (verkuerzt)
```
overlayContract (done) ── ContinuousScale ─┐
brainModelOptions+space (done) ─ validator ┤
A kszuLGgyaTzx (manifest subcortical) ── B IgzKaj2bV9aS (subcortex pick) ── Z.iv smoke
C 9xGQeXYPZqS1-A (BrainModelManifest + PickTargetContract) ─┐
D 9xGQeXYPZqS1-B (SpaceTransformGraph) ───────────────────── E d1QSeLP9T2g7-A (PinpointResult)
                                                              └ F d1QSeLP9T2g7-B (Projection)
G GDXRWz0ZsFoT-A (ActivationMapping Zod) ── H GDXRWz0ZsFoT-D (Demo-JSON + Loader)
K wGWNtFmxljyc-A (Colormap + Colorbar) ── L wGWNtFmxljyc-B (CanonicalSurface Shader) ── Z.iii smoke
M wcaWy1qc25Wx (granulare Carve-Verifikation + Destrieux)
Z ZkRPFEFqW1sy (4 Smoke-Routen) <- A,B,K,L
```

## Slices
| Slice | Dart-Task | Typ | Neue/Geaenderte Files | Verify | Vorbedingung |
| --- | --- | --- | --- | --- | --- |
| A ✅ | kszuLGgyaTzx | asset/JSON | build_subcortical_manifest.mjs, manifest.json (+subcortical), subcorticalManifest.test.ts | vitest 4/4 | — |
| B | IgzKaj2bV9aS | render | SubcorticalMeshes.tsx, CanonicalAtlasMode.tsx | smoke pick Thalamus | A |
| C ✅ | 9xGQeXYPZqS1-A (Dart aWlm6sw5cSal) | data | brainModelManifest.ts, pickTargetContract.ts | vitest 11/11 | — |
| D ✅ | 9xGQeXYPZqS1-B (Dart oH8Hq0z9tnVd) | data | spaceTransformGraph.ts | vitest 6/6 | overlayContract |
| E | d1QSeLP9T2g7-A | data | pinpointContract.ts | vitest limits/throw | C, D |
| F | d1QSeLP9T2g7-B | data/math | pinpointProjection.ts | vitest synth buffer | E, A |
| G | GDXRWz0ZsFoT-A | data | activationMappingContract.ts | vitest | overlayContract |
| H | GDXRWz0ZsFoT-D | data | demo-zscore-mni.json, labOverlayLoader.ts | vitest fetch-mock | overlayContract |
| K | wGWNtFmxljyc-A | data+CSS | heatmapColormap.ts, HeatmapColorbar.tsx | vitest colormap | overlayContract |
| L | wGWNtFmxljyc-B | render/shader | CanonicalSurface.tsx, CanonicalAtlasMode.tsx | smoke pixel-inhomogen | K, H |
| M | wcaWy1qc25Wx | render/asset | e2e spec (+evtl. bake) | smoke Julich-Subparzel | CanonicalAtlasMode |
| Z | ZkRPFEFqW1sy | verifikation | tests/e2e/visual-production.spec.ts | playwright 4 Routen | A,B,K,L |

## Empfohlene Reihenfolge (render-frei zuerst)
1. **A** kszuLGgyaTzx — Subkortex-Manifest (Quick Win, unblockt B + Z.iv)
2. **C** 9xGQeXYPZqS1-A — BrainModelManifest + PickTargetContract
3. **G** GDXRWz0ZsFoT-A — ActivationMapping-Vertrag (parallel zu C moeglich)
4. **K** wGWNtFmxljyc-A — Colormap + Colorbar (letzter Baustein vor Shader-Risk)
5. **D** 9xGQeXYPZqS1-B — SpaceTransformGraph (unblockt Pinpoint-Ast)

## Subkortex-Asset-Counts (aus Dateigroessen, fuer Slice A)
accumbens L 740/1484 · R 687/1374 · caudate L 2857/5722 · R 2985/5970 ·
gpe L 1918/3832 · R 1864/3724 · gpi L 1060/2116 · R 1076/2148 ·
putamen L 3396/6788 · R 3424/6844 · thalamus L 3856/7708 · R 3790/7576.
Hippocampus + Amygdala fehlen -> explizite Gaps (kein stilles Weglassen).

## Split-Empfehlung Uebergroesse-Tasks
- `9xGQeXYPZqS1` Rest: A (Manifest+PickTarget), B (TransformGraph), C (MNI voll-registriert).
- `GDXRWz0ZsFoT` (XL): A (Stufen-Zod), B (Solver/Band/TimeWindow), C (NormRef/Uncertainty), D (Demo+Loader).
