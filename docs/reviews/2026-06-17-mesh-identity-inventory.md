# Mesh-Identity-Inventory

Aktueller Runtime-Vertrag: `bodyparts3d-taro` für BodyParts3D-/Context-Assets und `phineas-gage-taro-fit-v1` für die in TARO-Viewer-Space eingepassten Phineas-GLBs. Die alte `t6-master-brain`-Bezeichnung kommt im Repo-Scope nicht mehr vor; der Check bleibt trotzdem als Drift-Gate aktiv.

Reproduzierbar mit:

```bash
pnpm --dir apps/brain-app run inventory:mesh-identity
```

## Zusammenfassung

| Asset | Contract | Nodes | Meshes | Materials | Manifest-Nodes | Fehlende Nodes | Hash |
|-------|----------|-------|--------|-----------|----------------|----------------|------|
| `bodyparts3d-brain` | `bodyparts3d-taro` | 601 | 600 | 1 | 600 | 0 | n/a |
| `bodyparts3d-subparcels` | `bodyparts3d-taro-subparcels` | 60 | 60 | 1 | 0 | 0 | n/a |
| `bodyparts3d-skull-context` | `bodyparts3d-taro` | 21 | 20 | 1 | 20 | 0 | n/a |
| `bodyparts3d-head-context` | `bodyparts3d-taro` | 314 | 313 | 1 | 313 | 0 | n/a |
| `phineas-gage-skull-base` | `phineas-gage-taro-fit-v1` | 1 | 1 | 1 | 1 | 0 | ok |
| `phineas-gage-skull-calvaria` | `phineas-gage-taro-fit-v1` | 1 | 1 | 1 | 1 | 0 | ok |
| `phineas-gage-iron-rod` | `phineas-gage-taro-fit-v1` | 1 | 1 | 1 | 1 | 0 | ok |

## Details

### bodyparts3d-brain

- URI: `/assets/bodyparts3d/brain.glb`
- Manifest: `/assets/bodyparts3d/structures.json`
- Größe: 5.83 MiB
- SHA-256: `sha256:5a0213c5c871d674e6fc349cf614de2ce84bb67b5d592921cabf88133706cca8`
- Nodes: 601 gesamt, 601 benannt, 0 unbenannt
- Meshes: 600 gesamt, 600 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `anterior-commissure`, `anterior-communicating-artery`, `anterior-communicating-artery-v2`, `anterior-intercavernous-sinus`, `anterior-part-of-left-superior-temporal-gyrus`, `anterior-part-of-right-superior-temporal-gyrus`, `anterior-spinal-artery`, `anterior-vein-of-left-septum-pellucidum`, `anterior-vein-of-right-septum-pellucidum`, `anterolateral-central-branch-of-left-middle-cerebral-artery`, `anterolateral-central-branch-of-right-middle-cerebral-artery`, `anteromedial-frontal-branch-of-left-callosomarginal-artery`
- Beispiel-Materials: `(unnamed-material)`

### bodyparts3d-subparcels

- URI: `/assets/bodyparts3d/k11-subparcels.glb`
- Manifest: `atlas-config scene_regions`
- Größe: 1.85 MiB
- SHA-256: `sha256:f65dcab707c0b2d7d8bafefe6c3218cd7b0ce8b8b6aec0fde8c6b400a4e1f75b`
- Nodes: 60 gesamt, 60 benannt, 0 unbenannt
- Meshes: 60 gesamt, 60 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `left-anterior-cingulate`, `left-caudal-anterior-cingulate`, `left-frontopolar`, `left-gpe`, `left-gpi`, `left-julich-8d1`, `left-julich-8d2`, `left-julich-8v1`, `left-julich-8v2`, `left-julich-fp1`, `left-julich-fp2`, `left-julich-frontal-i-2-gapmap`
- Beispiel-Materials: `(unnamed-material)`

### bodyparts3d-skull-context

- URI: `/assets/context/skull.glb`
- Manifest: `/assets/context/skull.json`
- Größe: 0.51 MiB
- SHA-256: `sha256:247c12cbe522f2a1ea05fa56c5125ebbb400d0b58f8d113f90da22260a9b389d`
- Nodes: 21 gesamt, 21 benannt, 0 unbenannt
- Meshes: 20 gesamt, 20 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `ethmoid-bone`, `frontal-bone`, `left-lacrimal-bone`, `left-maxilla`, `left-nasal-bone`, `left-palatine-bone`, `left-parietal-bone`, `left-temporal-bone`, `left-zygomatic-bone`, `occipital-bone`, `perpendicular-plate-of-ethmoid`, `right-lacrimal-bone`
- Beispiel-Materials: `(unnamed-material)`

### bodyparts3d-head-context

- URI: `/assets/context/head.glb`
- Manifest: `/assets/context/head.json`
- Größe: 3.43 MiB
- SHA-256: `sha256:b049ca29cb79149ee1cd4a7ec1a479fe3c9dbd65f72c0dad0ce13c8703e55721`
- Nodes: 314 gesamt, 314 benannt, 0 unbenannt
- Meshes: 313 gesamt, 313 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `anterior-chamber-of-left-eyeball`, `anterior-chamber-of-right-eyeball`, `anterior-temporal-branch-of-left-lateral-occipital-artery`, `anterior-temporal-branch-of-right-lateral-occipital-artery`, `artery-of-right-pterygoid-canal`, `atlas`, `axis`, `buccal-branch-of-left-facial-nerve`, `buccal-branch-of-right-facial-nerve`, `check-ligament-of-left-lateral-rectus`, `check-ligament-of-left-medial-rectus`, `check-ligament-of-right-lateral-rectus`
- Beispiel-Materials: `(unnamed-material)`

### phineas-gage-skull-base

- URI: `/assets/phineas/phineas-gage-skull-base.glb`
- Manifest: `/assets/phineas/asset-manifest.json`
- Größe: 1.55 MiB
- SHA-256: `sha256:70ad306f070c0a2a97de84d906df8917cc924142132d7640f8e9756c126d2358`
- Nodes: 1 gesamt, 1 benannt, 0 unbenannt
- Meshes: 1 gesamt, 1 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `phineas-gage-skull-base`
- Beispiel-Materials: `gage_skull_intact_base`

### phineas-gage-skull-calvaria

- URI: `/assets/phineas/phineas-gage-skull-calvaria.glb`
- Manifest: `/assets/phineas/asset-manifest.json`
- Größe: 0.59 MiB
- SHA-256: `sha256:7d1ded2f87de911841f366a7bb8d3f826db60472baa67ef59c63556a8e074e1e`
- Nodes: 1 gesamt, 1 benannt, 0 unbenannt
- Meshes: 1 gesamt, 1 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `phineas-gage-skull-calvaria`
- Beispiel-Materials: `gage_skull_intact_calvaria`

### phineas-gage-iron-rod

- URI: `/assets/phineas/phineas-gage-iron-rod.glb`
- Manifest: `/assets/phineas/asset-manifest.json`
- Größe: 0.01 MiB
- SHA-256: `sha256:ec7a2d8878a8e6d5812c79b139435122338603b0cfae05f7ccf4344e8bf9686a`
- Nodes: 1 gesamt, 1 benannt, 0 unbenannt
- Meshes: 1 gesamt, 1 benannt, 0 unbenannt
- Materials: 1
- Beispiel-Meshes: `phineas-gage-iron-rod`
- Beispiel-Materials: `phineas-gage-iron`

## Drift-Gates

- Aktive stale `t6-master-brain`-Referenzen: 0
- Archivierte historische `t6-master-brain`-Referenzen: 45
- Fehlende Manifest-Node-Namen: 0
- Duplicate Node-/Mesh-Namen: 0
- Manifest-Hash-Mismatches: 0

