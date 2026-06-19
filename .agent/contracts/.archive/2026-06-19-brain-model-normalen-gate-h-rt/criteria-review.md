# Criteria Review — Brain-Model-Normalen-Gate härten

Status: PASS

Die Kriterien sind binär testbar:

1. C1 prüft den echten `verify:brain-models`-Pfad gegen Exit 0 und die
   bestehende Success-Zeile.
2. C2 erzwingt einen Negativfall für `maxInwardLikelyMeshes` mit Exit ungleich
   0 und konkreter Fehlermeldung.
3. C3 erzwingt Drift-Schutz für den schlechtesten Outward-Mesh-Namen und die
   Ratio.
4. C4 hält den CI-Pfad über `.github/workflows/brain-app.yml` nachweisbar aktiv.

Vollständigkeit: ausreichend für diese Slice. Der Contract verändert keine
Assets und keinen Viewer; deshalb sind Browser-Smoke und GLB-Visual-Review
nicht Teil der Abnahme. Die frühere ca. 17%-Normalenklasse wird über
`faceNormalBadRatio` abgedeckt, die bisher nur diagnostische
Orientierungs-Klasse über C2/C3.

Review-Modus: lokaler Criteria-Review. Externer Dispatch wurde nicht genutzt,
weil frühere Runs in dieser Session wiederholt hängen blieben; die Kriterien
sind klein genug für einen direkten, reproduzierbaren Review.
