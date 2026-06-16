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

Im aktuellen Standalone-Runtimepfad ist kein Original-Gage-CT und kein
Gage-Schädel-GLB importiert. Gerendert werden die generischen Kontextmodelle
`apps/brain-app/public/assets/context/skull.glb`, `head.glb` und die
Knochen-Metadaten `skull.json`.

Der lokale Hauptrepo-Checkout
`/Users/marcusifland/CFH_REAL_LOCAL/brain-app-standalone` enthält aber bereits
Gage-Kandidaten und Quellenartefakte:

1. `public/figs3d/v2/glb/phineas-gage-skull-lod.glb`
2. `public/figs3d/v2/glb/phineas-gage-skull-calvarium-cut-lod.glb`
3. `public/figs3d/v2/glb/phineas-gage-iron-rod.glb`
4. `public/figs3d/v2/data/gage-reconstructions.json`

Diese Dateien sind ein echter Importpfad für den nächsten Slice, aber noch kein
Beleg, dass der neue Standalone-Viewer sie korrekt in den TARO-/BodyParts3D-
Raum montiert. Dafür müssen Koordinatenraum, Skalierung, Layer-Vertrag,
Attribution und Browser-Smoke separat geprüft werden.

Deshalb bleibt die Szene bewusst eine schematische TARO-Viewer-Rekonstruktion.
Die UI benennt das explizit: Das Schädelmodell ist nicht der historische
Originalschädel, die Trajektorie ist eine didaktische Übertragung in den
Viewer-Raum. Zusätzlich weist die UI darauf hin, dass Gage-GLB-Kandidaten im
Hauptrepo liegen, aber noch nicht in diesen Standalone-Viewer importiert sind.

## Implementierungsannahmen

1. Eintritt: linke Wange unter dem Jochbogen, passend zu Van Horn et al.
2. Durchtritt: hinter der linken Orbita durch den linken Frontallappen.
3. Austritt: superior/frontal nahe der Mittellinie.
4. Läsionsmarkierung: linke orbitofrontale und ventromediale präfrontale
   TARO-Strukturen, nicht als voxelgenaue Schadenskarte.
5. Animation: `rodPhase` trennt Eintritt, Durchtritt und Austritt. Die Stange
   wird als wachsender sichtbarer Abschnitt gerendert; das ist didaktisch, keine
   physikalische Ballistik.
