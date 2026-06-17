# Szenen anlegen

Eine Szene = eine Datei `public/scenes/<id>.json`. Kein React nötig.

## Pflichtfelder
- `id`, `section`, `author`, `order` (Sortierung im Vortrag), `title`
- `brain.regions`: Liste semantischer Region-Slugs (verfügbare siehe `src/scene/regions.ts`)
- `brain.camera`: einer von `lateral-left | lateral-right | anterior | medial-midline | superior`
- `overlay.kind`: `prose | erp | flowchart | table | topography`
- `companion.summary` + `companion.sources`

## Overlay-Daten
- `prose`: nur `companion.summary`.
- `erp`: `overlay.data.series = [{ label, color?, points: [[x,wert], …] }]`, optional `markers`.
- `flowchart`: `overlay.data.nodes = [{ id, label, result }]`.
- Buch-/Kapitelbilder dürfen nicht in `public/` liegen und nicht als Overlay gerendert werden.

> Hinweis: `table` und `topography` haben noch keinen nativen Renderer — sie fallen auf
> `companion.summary` zurück. Native Renderer folgen.

## Neue Region gebraucht?
Slug + Mesh-Namen in `src/scene/regions.ts` ergänzen. Mesh-Namen aus
`public/scenes/structure-coords.json` verifizieren (Centroid plausibilisieren), Vorbild
`src/viewer/animations.ts` (BG-Helper). Unbekannte Slugs werfen laut — kein stiller Fallback.

## Sub-Region-Slugs (MNI-Atlas-Registrierung, echte TARO-Geometrie)

Die folgenden Slugs zeigen auf präzise Sub-Patches aus `public/assets/bodyparts3d/k11-subparcels.glb`
(aus `mni152-learn-brain.glb` DKT-ACC + `mni152-allen-fullbrain-gage-context.glb` Julich-BA6
registriert; Pipeline unter `scripts/atlas/`). Sub-Patches sind echter TARO-Geometrie-Ausschnitt
(kein schwebendes MNI-Mesh). Residuen: H1=0.1mm, H2-LOO=21.9mm, H4-Median 1.8–3.5mm.

| Slug | Meshes | Bedeutung |
|------|--------|-----------|
| `acc-anterior` | left/right-anterior-cingulate | Anteriores Cingulum (DKT caudalACC) — P3a |
| `sma` | left/right-sma | SMA (Julich Area 6mp) |
| `pre-sma` | left/right-pre-sma | pre-SMA (Julich Area 6ma) |
| `sma-presma` | beide oben zusammen | SMA + pre-SMA — P3z |

## Testen
`pnpm dev` → `http://localhost:5173/?scene=<id>` öffnet deine Szene direkt.
`?mode=explore` öffnet den freien Struktur-Explorer.
