# Phineas-Gage-Standalone-Import

Stand: 2026-06-17.

## Runtime-Assets

Die erste Standalone-Stufe versioniert nur die leichten, bereits kuratierten
Kandidaten:

1. `apps/brain-app/public/assets/phineas/phineas-gage-skull-lod.glb`
2. `apps/brain-app/public/assets/phineas/phineas-gage-skull-calvarium-cut-lod.glb`
3. `apps/brain-app/public/assets/phineas/phineas-gage-iron-rod.glb`
4. `apps/brain-app/public/assets/phineas/gage-reconstructions.json`
5. `apps/brain-app/public/assets/phineas/asset-manifest.json`
6. `apps/brain-app/public/assets/phineas/transform-contract.json`

`asset-manifest.json` pinnt URI, Node-Namen, Lizenzhinweis, Provenienz und
SHA-256 für die drei GLBs. Der Test
`apps/brain-app/src/viewer/phineasStandaloneAssets.test.ts` prüft die Manifest-
Form, die GLB-Hashes, die Rekonstruktionsdaten, den Transform-Vertrag und die
lokalen Quellen.

Die Eisenstange ist kein übernommener Legacy-Mesh-Kandidat mehr. Sie wird mit
`apps/brain-app/scripts/generate-phineas-iron-rod.mjs` aus
`transform-contract.json` erzeugt: 1100 mm Länge, 32 mm Schaftdurchmesser,
6,4 mm Spitzendurchmesser, ausgerichtet entlang der im Viewer verwendeten
Eintritts-/Austrittstrajektorie. `pnpm --dir apps/brain-app run
verify:phineas-transform` lädt das GLB erneut und misst diese Werte entlang der
Trajektorienachse nach.

## Wissenschaftliche Unterlagen

Die PDFs und OCR-Artefakte liegen unter `raw_protected/phineas-gage/`:

1. Ratiu et al. 2004
2. Damasio et al. 1994
3. Van Horn et al. 2012
4. Harlow 1848

Damit ist der Standalone-Bestand lokal nachvollziehbar. Die Dateien sind
Quellenmaterial und ersetzen keine Lizenzfreigabe für öffentliche
Weiterverbreitung.

## Runtime-Mount

Der Phineas-Viewer rendert die Standalone-GLBs jetzt im Modus `?mode=phineas`:

1. Vollschädel im ersten Schritt.
2. Calvarium-Cut in den Durchtritts-/Austrittsschritten.
3. generiertes 1,1-m-Eisenstangen-GLB statt des früheren Zylinder-Markers.

Der normale TARO-/BodyParts3D-Kontextschädel bleibt für Explorer und
Strukturbaum erhalten, wird im Phineas-Modus aber ausgeblendet. Offen bleibt:

1. final gepinnte Attribution für Schädel/Calvarium in
   `THIRD-PARTY-NOTICES.md`, falls das Modell öffentlich ausgeliefert wird.
2. generische AuthoringScene-Persistenz mit Transform-Gizmo für frei
   importierte GLBs.

Die sichtbaren Gage-Teile hängen im Phineas-Modus bereits an stabilen
`case-phineas-gage`-`asset-part`-Zielen. Picking und Snapshot-State sehen damit
dieselben ObjectGraph-IDs wie die Sequenzdaten, auch wenn der generische
GLB-Loader noch separat bleibt.
