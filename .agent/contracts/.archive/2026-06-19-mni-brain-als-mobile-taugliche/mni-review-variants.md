# MNI Review-Varianten

Quelle: ehemaliges Monorepo-HQ-MNI-Brain unter
`/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/MU - SS26 - Kognitive Neurowissenschaften/apps/brain-app/public/figs3d/v2/glb/mni152-native-highqual-brain.glb`.

Die neu erzeugten Varianten nutzen `gltf-transform optimize` mit Draco, Weld,
Simplify und `--simplify-lock-border true`. Mesh-Joins, Instancing und
Texture-Kompression bleiben aus, damit die 544 Mesh-Grenzen für spätere
Registry-/Pinpoint-Arbeit erhalten bleiben.

Nach dem ersten Export hatten die MNI-Varianten 0/544 Meshes mit expliziten
`NORMAL`-Attributen, während TARO 600/600 Meshes mit Normalen hat. Deshalb wurden
alle MNI-Varianten über Blender 5.1.1 mit `normals_make_consistent(inside=False)`
neu normalisiert, Smooth Shading gesetzt und anschließend wieder per Draco
komprimiert.

| Option | Datei | Größe | Meshes | GPU-Upload-Vertices | Bemerkung |
|--------|-------|-------|--------|---------------------|-----------|
| `mni-mobile-r05` | `apps/brain-app/public/assets/brain-models/mni152/mni152-mobile-r05.glb` | 7.26 MB | 544 | 1,020,655 | 544/544 Normalen, aggressivste Mobile-Review-Variante |
| `mni-mobile-r06` | `apps/brain-app/public/assets/brain-models/mni152/mni152-mobile-r06.glb` | 8.38 MB | 544 | 1,203,987 | 544/544 Normalen, neue balancierte Mobile-Review-Variante |
| `mni-mobile-r08` | `apps/brain-app/public/assets/brain-models/mni152/mni152-mobile-r08.glb` | 10.28 MB | 544 | 1,523,550 | 544/544 Normalen, ehemalige `mobile-balanced`-Referenz |
| `mni-desktop-r18` | `apps/brain-app/public/assets/brain-models/mni152/mni152-desktop-r18.glb` | 18.98 MB | 544 | 3,054,545 | 544/544 Normalen, Desktop-Referenz für Detailvergleich |

Normalen-QA:

| Asset | Normalen-Coverage | Face/Normal-Abweichung | Outward-Heuristik |
|-------|-------------------|------------------------|-------------------|
| TARO `brain.glb` | 600/600 | 0.0085 % | 2 inward-likely, 58 ambiguous |
| `mni-mobile-r05` | 544/544 | 2.8801 % | 1 inward-likely, 48 ambiguous |
| `mni-mobile-r06` | 544/544 | 2.5266 % | 1 inward-likely, 43 ambiguous |
| `mni-mobile-r08` | 544/544 | 2.1083 % | 1 inward-likely, 48 ambiguous |
| `mni-desktop-r18` | 544/544 | 1.2229 % | 2 inward-likely, 44 ambiguous |

Review-Links in der App:

1. `?brainModel=mni-mobile-r05`
2. `?brainModel=mni-mobile-r06`
3. `?brainModel=mni-mobile-r08`
4. `?brainModel=mni-desktop-r18`

Einschränkung: Diese Option bewertet zunächst Geometrie, Detailtiefe,
Rendering und Performance. Die finale atlas-semantische MNI-Registry für
granulare qEEG-/sLORETA-/ROI-Pinpoints ist ein separater Schritt; TARO-spezifische
Auswahl-Slugs sind damit noch nicht automatisch auf MNI gemappt. Für eine
finale Produktionsfreigabe muss die Normalen-QA als harter Gate in die
Asset-Pipeline, damit der alte TARO-Fehlerpfad nicht erneut unbemerkt entsteht.
