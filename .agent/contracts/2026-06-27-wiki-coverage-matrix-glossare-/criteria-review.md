# Criteria-Review — 2026-06-27-wiki-coverage-matrix-glossare-

## Verdict

VERDICT FAIL

## Findings

1. Die erste Fassung deckte den 100%-Anspruch nicht binaer ab. Es fehlte ein Kriterium fuer vollständige Crosswalks ueber alle Glossar-/Index-Begriffe, alle lokalen Paper und alle Areale/Subareale mit eindeutigem Status je Zeile.
2. Die erste Fassung erlaubte offene oder akzeptierte Duplikate als PASS-faehig. Fuer das Nutzerziel braucht es 0 ungeloeste Duplikat-Kollisionen.
3. APA7- und Quellen-Echtheit waren nicht testbar genug. Pflichtfelder pro Quellentyp und Regeln fuer URL-only, Abstract-only und approximierte Quellen mussten explizit werden.
4. Paper- und Areal-/Subareal-Inventare waren nicht als PASS-Bedingung operationalisiert.
5. Ein Review-Artefakt allein reicht nicht; die Extraktions- und Pruefartefakte muessen gespeichert werden.

## Ergebnis

`criteria.md` wurde entsprechend geschaerft: Inventarlisten pro Domaene,
`total = matched + partial + open`, 100% nur bei `partial=0` und `open=0`,
0 ungeloeste Duplikate, APA7-/Quellenpflichtfelder und gespeicherte
Pruefarbeitsdaten.
