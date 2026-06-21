# Criteria Review — 2026-06-20-phineas-gage-case-study-migrat

## Verdict: PASS mit Anmerkungen

Alle 10 Kriterien sind binär testbar. Kein Kriterium ist vage oder unmessbar.

### Bewertung je Kriterium

| ID | Testbar | Anmerkung |
|----|---------|-----------|
| C1 | ✓ | grep-basiert, deterministisch |
| C2 | ✓ | grep + wc, LOC-Delta messbar |
| C3 | ✓ | grep-basiert |
| C4 | ✓ | Datei-Existenz-Check |
| C5 | ✓ | grep-basiert |
| C6 | ✓ | grep + manuelles Code-Review für Pflichtfelder |
| C7 | ✓ | Browser-Smoke, manuell aber klar definiert |
| C8 | ✓ | Browser-Smoke mit spezifischem Deep-Link |
| C9 | ✓ | CLI-Commands mit Exit-Codes |
| C10 | ✓ | Import-Test mit konkretem JSON — benötigt ggf. einen Unit-Test |

### Anmerkungen

1. **C2 LOC-Delta:** "mindestens 40 Zeilen weniger als 684" ist messbar, aber die
   Baseline (684) könnte sich durch andere Commits verschieben. Empfehlung: relative
   Messung beibehalten, aber mit aktuellem Stand vergleichen statt hartcodierter Baseline.
   → Akzeptabel für diesen Contract.

2. **C6 Interface-Prüfung:** "Prüfe dass das CaseStudy-Interface id, title,
   collectionId, steps enthält" ist nicht als reines grep formuliert. → Akzeptabel,
   da TypeScript-Compiler erzwingt, dass satisfies-Annotation nur bei vollständigem
   Interface kompiliert.

3. **C10 Snapshot-Kompatibilität:** Benötigt einen konkreten Test (nicht nur Browser-
   Smoke). → Empfehlung: Unit-Test der Snapshot-Import-Funktion mit Feldern die
   im neuen Schema nicht mehr existieren.

### Fehlende Kriterien

Keine kritischen Lücken identifiziert. Die Criteria decken:
- Code-Entfernung (C1, C2, C3, C4, C5)
- Neues Interface (C6)
- Funktionalität (C7, C8)
- Regression (C9)
- Edge-Case (C10)

## Ergebnis

Criteria sind implementierungsreif. Contract kann aktiviert werden.
