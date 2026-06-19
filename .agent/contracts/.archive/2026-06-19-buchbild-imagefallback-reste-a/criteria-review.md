# Criteria Review — Buchbild-/ImageFallback-Reste entfernen

Status: PASS

Die Kriterien sind binär testbar:

1. C1 prüft den realen Filesystem-Zustand.
2. C2 und C3 binden Runtime- und Config-Verbot an konkrete Tests.
3. C4 prüft die aktuellen Arbeitsdokumente gegen den alten Runtime-Claim.
4. C5 trennt aktuelle Pfade von historischen Planungsdokumenten und erlaubt nur
   negative Tests oder Verifikationsbefehle als Treffer.

Vollständigkeit: ausreichend für diese Slice. Es gibt keinen
`apps/brain-app/public/figures`-Ordner mehr, daher ist keine Asset-Verschiebung
Teil der Umsetzung.
