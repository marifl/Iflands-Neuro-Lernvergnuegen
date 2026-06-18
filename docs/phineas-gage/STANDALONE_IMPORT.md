# Phineas-Gage-Standalone-Import

Stand: 2026-06-18.

## Runtime-Assets

Die Standalone-Stufe versioniert die aus dem Archiv extrahierten, einzeln
schaltbaren Gage-Teile:

1. `apps/brain-app/public/assets/phineas/phineas-gage-skull-base.glb`
2. `apps/brain-app/public/assets/phineas/phineas-gage-skull-calvaria.glb`
3. `apps/brain-app/public/assets/phineas/phineas-gage-iron-rod.glb`
4. `apps/brain-app/public/assets/phineas/archive-extract-report.json`
5. `apps/brain-app/public/assets/phineas/gage-reconstructions.json`
6. `apps/brain-app/public/assets/phineas/asset-manifest.json`
7. `apps/brain-app/public/assets/phineas/transform-contract.json`

`asset-manifest.json` pinnt URI, Node-Namen, Lizenzhinweis, Provenienz und
SHA-256 für die drei GLBs. Der Test
`apps/brain-app/src/viewer/phineasStandaloneAssets.test.ts` prüft die Manifest-
Form, die GLB-Hashes, die Rekonstruktionsdaten, den Transform-Vertrag und die
lokalen Quellen.

Schädelbasis und Calvaria werden mit
`apps/brain-app/scripts/extract-phineas-archive-assets.py` aus
`archive/2026-06-11-mni-stack/public/figs3d/v2/glb/mni152-allen-fullbrain-gage-context.glb`
extrahiert. Der Transform-Vertrag nutzt danach nur positive Scale-Komponenten:
es wird kein Spiegeln mehr angewendet. Beide Schädelteile teilen dieselbe
TARO-Fit-Matrix, damit das TARO-Hirn in die kombinierte Gage-Schädelhülle passt.

Die Eisenstange ist kein übernommener Legacy-Mesh-Kandidat. Sie wird mit
`apps/brain-app/scripts/generate-phineas-iron-rod.mjs` aus
`transform-contract.json` erzeugt: 1100 mm Länge, 32 mm Schaftdurchmesser,
6,4 mm Spitzendurchmesser, ausgerichtet entlang der im Viewer verwendeten
Eintritts-/Austrittstrajektorie. Diese Trajektorie stammt aus demselben
Archiv-Kontext und wird durch dieselbe TARO-Fit-Matrix wie Base und Calvaria
geführt. `pnpm --dir apps/brain-app run verify:phineas-transform` lädt die GLBs
erneut, misst die Stange entlang der Trajektorienachse und prüft den
kombinierten Schädel-Bounds-Fit gegen TARO-Kontextschädel, Head-Kontext und
TARO-Hirn.

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

1. Schädelbasis und Calvaria im ersten Schritt.
2. dieselben Schädelteile transparent in den Durchtritts-/Austrittsschritten.
3. generiertes 1,1-m-Eisenstangen-GLB statt des früheren Zylinder-Markers.

Der normale TARO-/BodyParts3D-Kontextschädel bleibt für Explorer und
Strukturbaum erhalten, wird im Phineas-Modus aber ausgeblendet.

Im Explore-Modus rendert `ManifestAssetObjects` dieselben Manifest-Assets direkt
aus `asset-manifest.json`. Der Strukturbaum und der Viewport hängen dadurch am
gleichen `asset-part`-ObjectGraph: `Gage-Schädelbasis`, `Gage-Calvaria` und
`Gage-Eisenstange` sind separat sichtbar, pickbar und ausblendbar.

## Registry-/Authoring-Pfad

Phineas nutzt dieselbe Contract-Fläche wie spätere Dozenten-Objekte:

1. `KnowledgeRegistry` deklariert die Collection `case-phineas-gage` und die
   Slots `skull-base`, `skull-calvaria` und `iron-rod`.
2. `asset-manifest.json` erfüllt diese Slots mit GLB-URI, Hash, Quelle,
   Normalisierung und stabilen Parts.
3. `loadAuthoringAssetIntoScene(...)` legt daraus `AuthoringScene`-
   Instanzen mit `collectionId`, `assetId`, `instanceId`, Transform, Origin und
   Parts an.
4. `AuthoringSnapshotState` speichert diese Scene zusammen mit
   `registryContext.collectionIds = ["case-phineas-gage"]` und kann sie über
   die Snapshot-Datei-UI wieder importieren.
5. `validateBrainAppContracts(...)` prüft den Roundtrip gegen Registry,
   Manifest, AuthoringScene und Snapshot-State.

Der Test
`apps/brain-app/src/viewer/authoringAssetLoader.test.ts` nutzt dafür das echte
Phineas-Manifest und legt alle drei GLBs als `AuthoringScene` an. Das
Standalone-Repo hat keine Datenbank-Persistenz; der absicherte Speicherpfad ist
hier die versionierte Manifest-Datei plus importier-/exportierbarer
Unterrichts-/Authoring-Snapshot. Eine spätere Multiplayer-/DB-Persistenz muss
diesen Contract übernehmen, darf aber keinen zweiten Asset-Pfad erfinden.

Offen bleibt:

1. final gepinnte Attribution für Schädelbasis/Calvaria in
   `THIRD-PARTY-NOTICES.md`, falls das Modell öffentlich ausgeliefert wird.
2. eine echte Multiplayer-/DB-Persistenz außerhalb des Standalone-Repo-Scopes.

Die sichtbaren Gage-Teile hängen in Phineas- und Explore-Modus an stabilen
`case-phineas-gage`-`asset-part`-Zielen. Picking und Snapshot-State sehen damit
dieselben ObjectGraph-IDs wie die Sequenzdaten.
