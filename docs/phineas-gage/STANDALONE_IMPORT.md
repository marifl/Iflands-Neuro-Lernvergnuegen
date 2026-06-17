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

`asset-manifest.json` pinnt URI, Node-Namen, Lizenzhinweis, Provenienz und
SHA-256 für die drei GLBs. Der Test
`apps/brain-app/src/viewer/phineasStandaloneAssets.test.ts` prüft die Manifest-
Form, die GLB-Hashes, die Rekonstruktionsdaten und die lokalen Quellen.

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
3. Eisenstangen-GLB statt des früheren Zylinder-Markers.

Der normale TARO-/BodyParts3D-Kontextschädel bleibt für Explorer und
Strukturbaum erhalten, wird im Phineas-Modus aber ausgeblendet. Offen bleibt:

1. final gepinnte Attribution in `THIRD-PARTY-NOTICES.md`, falls das Modell
   öffentlich ausgeliefert wird.
2. Pick-/ObjectGraph-Integration für die Gage-Teile; aktuell sind die GLBs
   bewusst sichtbar, aber nicht anklickbar.
