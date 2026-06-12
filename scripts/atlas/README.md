# Atlas-Subparzellierung (scripts/atlas)

Pipeline: MNI-Atlas-Parzellen (DKT ACC aus `mni152-learn-brain.glb`, Julich SMA/pre-SMA aus
`mni152-allen-fullbrain-gage-context.glb`, beide aus `archive/2026-06-11-mni-stack/`) →
auf das TARO-`brain.glb` registriert → Sub-Patches als TARO-Geometrie in `k11-subparcels.glb`.

## Reproduktion

```bash
# 1. Python-Deps
cd scripts/atlas && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

# 2. GLBs dekodieren (Playwright+three, braucht apps/brain-app/node_modules)
# node_modules-Symlink bereits vorhanden (-> apps/brain-app/node_modules)
node decode_glb.mjs ../../apps/brain-app/public/assets/bodyparts3d/brain.glb work/taro_hosts.json "^(left|right)-(cingulate-gyrus|superior-frontal-gyrus|middle-frontal-gyrus|supramarginal-gyrus|superior-parietal-lobule)$"
# MNI GLBs: learn-brain (DKT) und allen-fullbrain (Julich) -> work/mni_learn.json, mni_allen.json

# 3. Registrierung (H1-H4)
./.venv/bin/python register.py

# 4. Sub-Patches bauen + structure-coords.json ergaenzen
node build_subparcels.mjs
```

## Gemessene Residuen (2026-06-12)

| Stufe | Wert |
|-------|------|
| H1 allen→learn Frame-Konsolidierung | mean 0.1 mm, max 0.1 mm |
| H2 learn→TARO Affine LOO-Residuum | mean 21.9 mm, max 36.1 mm |
| H3 CPD vs. Affine (pro Host-Gyrus) | ~0.1 mm Verbesserung (CPD marginal besser) |
| H4 left-anterior-cingulate | 536 Vertices, Median 1.75 mm < 6 mm ✓ |
| H4 right-anterior-cingulate | 481 Vertices, Median 2.16 mm < 6 mm ✓ |
| H4 left-sma | 159 Vertices, Median 2.77 mm < 6 mm ✓ |
| H4 right-sma | 194 Vertices, Median 3.49 mm < 6 mm ✓ |
| H4 left-pre-sma | 252 Vertices, Median 2.37 mm < 6 mm ✓ |
| H4 right-pre-sma | 242 Vertices, Median 2.15 mm < 6 mm ✓ |

Vollständige Residuen: `work/residuals.json`.

## Präzisions-Decke

MNI152 = Populations-Mittel, TARO = Einzelindividuum; keine 1:1-Sulcus-Korrespondenz möglich.
Mediale Wand (SMA/ACC) ist stereotyp gefaltet → dort am besten (~1–3 mm). Sub-Patches sind
anatomisch korrekt lokalisiert (richtiger Gyrus-Teil), nicht zytoarchitektonisch grenz-exakt.
Sub-Patches sind **echte TARO-Geometrie** (kein Schweben, kein Registrierungs-Versatz im Render).

## Ausgabe-GLB

`apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb` — 6 Meshes:
- `left/right-anterior-cingulate` (DKT caudalACC)
- `left/right-sma` (Julich Area 6mp)
- `left/right-pre-sma` (Julich Area 6ma)

Mesh-Namen = Slugs in `src/scene/regions.ts` + Einträge in `public/scenes/structure-coords.json`.
