# Phineas-Gage-Szene

## Quellenentscheidung

Die Szene nutzt Van Horn et al. (2012) als primäre Rekonstruktionsquelle für
Trajektorie und Netzwerkbezug. Der Artikel beschreibt die CT-basierte
Rekonstruktion des Gage-Schädels und den simulierten Verlauf des Tampiereisens
durch linke Wange, linken Frontallappen und Schädeldach.

Referenzen:

1. Van Horn, J. D. et al. (2012). Mapping Connectivity Damage in the Case of
   Phineas Gage. PLoS ONE 7(5): e37454.
   https://doi.org/10.1371/journal.pone.0037454
2. Damasio, H. et al. (1994). The Return of Phineas Gage: Clues About the Brain
   from the Skull of a Famous Patient. Science 264(5162), 1102-1105.
   https://doi.org/10.1126/science.8178168

## Asset-Entscheidung

Die Gage-Kandidaten liegen jetzt im Standalone-Repo:

1. `apps/brain-app/public/assets/phineas/phineas-gage-skull-base.glb`
2. `apps/brain-app/public/assets/phineas/phineas-gage-skull-calvaria.glb`
3. `apps/brain-app/public/assets/phineas/phineas-gage-iron-rod.glb`
4. `apps/brain-app/public/assets/phineas/archive-extract-report.json`
5. `apps/brain-app/public/assets/phineas/gage-reconstructions.json`
6. `apps/brain-app/public/assets/phineas/asset-manifest.json`
7. `apps/brain-app/public/assets/phineas/transform-contract.json`

Die wissenschaftlichen Unterlagen liegen unter `raw_protected/phineas-gage/`.
Damit verweist der Standalone-Bestand nicht mehr auf lokale Dateien außerhalb
dieses Repos.

Der aktuelle Viewer rendert im Phineas-Modus die Standalone-Gage-GLBs:
Schädelbasis und Calvaria im ersten Schritt, dieselben Teile transparent in den
Durchtritts-/Austrittsschritten und das generierte Eisenstangenmodell. Die
generischen
Kontextmodelle `apps/brain-app/public/assets/context/skull.glb`, `head.glb` und
`skull.json` bleiben für Explorer und Strukturbaum erhalten, sind aber nicht
mehr der Phineas-Ersatzpfad.

Schädelbasis und Calvaria stammen aus dem archivierten
`mni152-allen-fullbrain-gage-context.glb` und werden mit
`apps/brain-app/scripts/extract-phineas-archive-assets.py` als stabile Einzel-
GLBs exportiert. Der Transform-Vertrag wendet keine Spiegelung mehr an; Base,
Calvaria und generierte Eisenstange teilen eine TARO-Fit-Matrix bzw. die daraus
abgeleitete Trajektorie.

Der Transform-Vertrag `transform-contract.json` pinnt Einheit, Viewer-Achsen,
Quellen, Eintritts-/Austrittspunkt und historische Stangenmaße. Die
Eisenstange wird mit `apps/brain-app/scripts/generate-phineas-iron-rod.mjs`
aus diesem Vertrag erzeugt und mit `pnpm --dir apps/brain-app run
verify:phineas-transform` nach GLB-Load gemessen: Länge 1100 mm,
Schaftdurchmesser 32 mm, Spitzendurchmesser 6,4 mm, ausgerichtet entlang der
Phineas-Trajektorie.

Die drei sichtbaren Gage-Teile sind als Slots der Collection
`case-phineas-gage` registriert und tragen stabile `asset-part`-
`SequenceTargetRef`s. Dadurch verwenden Sequenzlogik, Picking, Explorer-
Strukturbaum und ObjectGraph dieselben IDs für Schädelbasis, Calvaria und
Eisenstange.

Die UI benennt weiter die Modellgrenze: Schädelbasis und Calvaria sind lokale
Standalone-Kandidaten, Attribution/Lizenz sind im Manifest markiert und müssen
vor öffentlicher Auslieferung final gepinnt werden. Die Eisenstange ist
projektgenerierte Geometrie aus dokumentierten historischen Maßen. Die
Läsionsmarkierung bleibt eine didaktische TARO-Hervorhebung, keine voxelgenaue
Schadenskarte.

## Implementierungsannahmen

1. Eintritt: linke Wange unter dem Jochbogen, passend zu Van Horn et al.
2. Durchtritt: hinter der linken Orbita durch den linken Frontallappen.
3. Austritt: superior/frontal nahe der Mittellinie.
4. Läsionsmarkierung: linke orbitofrontale und ventromediale präfrontale
   TARO-Strukturen, nicht als voxelgenaue Schadenskarte.
5. Animation: `rodPhase` trennt Eintritt, Durchtritt und Austritt im
   Fallstudienablauf. Sichtbar ist im Phineas-Modus das generierte
   Eisenstangen-GLB; `rodPhase` steuert die didaktische Schrittlogik, keine
   physikalische Ballistik.
