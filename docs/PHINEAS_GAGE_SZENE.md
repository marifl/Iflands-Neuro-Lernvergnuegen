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

Im Standalone-Repo liegt kein Original-Gage-CT, kein Gage-Schädel-GLB und kein
lizenzierter Warren-Anatomical-Museum-Mesh vor. Verfügbar sind nur die
generischen Kontextmodelle `apps/brain-app/public/assets/context/skull.glb`,
`head.glb` und die Knochen-Metadaten `skull.json`.

Deshalb bleibt die Szene bewusst eine schematische TARO-Viewer-Rekonstruktion.
Die UI benennt das explizit: Das Schädelmodell ist nicht der historische
Originalschädel, die Trajektorie ist eine didaktische Übertragung in den
Viewer-Raum.

## Implementierungsannahmen

1. Eintritt: linke Wange unter dem Jochbogen, passend zu Van Horn et al.
2. Durchtritt: hinter der linken Orbita durch den linken Frontallappen.
3. Austritt: superior/frontal nahe der Mittellinie.
4. Läsionsmarkierung: linke orbitofrontale und ventromediale präfrontale
   TARO-Strukturen, nicht als voxelgenaue Schadenskarte.
5. Animation: `rodPhase` trennt Eintritt, Durchtritt und Austritt. Die Stange
   wird als wachsender sichtbarer Abschnitt gerendert; das ist didaktisch, keine
   physikalische Ballistik.
