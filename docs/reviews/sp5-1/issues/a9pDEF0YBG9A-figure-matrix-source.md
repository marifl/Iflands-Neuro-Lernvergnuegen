# a9pDEF0YBG9A — Figuren-Matrix validiert gegen sich selbst

## 1) Ergebnis

1. `loadKnownFigures()` leitet den bekannten Figurensatz aktuell aus der SP5.1-Matrix-Datei ab, nicht aus der Kapitel-11-Mapping-Quelle.
   - `scripts/atlas/build-config.mjs:15` bindet `FIGURE_MATRIX` auf `docs/SP5_1_FIGURE_MATRIX.md`.
   - `scripts/atlas/build-config.mjs:267-273` liest diese Datei und extrahiert IDs per Regex aus Tabellenzeilen.
   - `scripts/atlas/build-config.mjs:298` speist das Ergebnis in `knownFigures` für die Config-Validierung.

2. Ja: Die aktuelle Regression nutzt dieselbe Matrix als Vergleichs- und Referenzquelle.
   - `docs/SP5_1_FIGURE_MATRIX.md` ist im Test der einzige harte Datensatz (`FIGURE_MATRIX_DOC`), siehe `scripts/atlas/build-config.test.mjs:49`, `360-364`.
   - Test prüft `matrix` gegen `loadKnownFigures()` in `360-364`, wobei beide aus derselben Matrixdatei lesen.
   - Konfigurations-`replaces_figure` wird gegen `matrix.has(figure)` geprüft (`377-391`).
   - Damit werden Lücken in der Kapitel-Mapping-Datei nicht entdeckt.

3. Minimaler Weg zur unabhängigen Mapping-Quelle (ohne zweite harte Liste):
   1. Neues Test-Parsing (`scripts/atlas/build-config.test.mjs`) direkt aus `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`.
   2. Parser nimmt die erste Tabellenspalte (`Abb.`) im Abschnitt `Zuordnung Abbildung → Bilddatei` (`docs/KAPITEL11_ABBILDUNGEN_MAPPING.md:12-16`) und normalisiert nur über Regeln, nicht über ein eingebettetes Array.
   3. Normalisierungsvorschlag:
      - `**`-Marker entfernen, Whitespace bereinigen.
      - `11-8 (C)` → `11-8C`.
      - `11-15 (1a/b/c)` → `11-15(1)` (Aggregation auf Panelgruppe wie in SP5-Matrix `11-15(1)`/`(2)`/`(3)`).
      - anschließend mit bestehender `canonicalFigureId()` harmonisieren.
   4. Optional (härtere Konsistenz): `loadKnownFigures()` in `build-config.mjs` auf dieselbe Mapping-Quelle umstellen, so die Laufzeit-Validierung `replaces_figure` unabhängig von der Matrix bleibt.
   5. Beleg, dass die Mapping-Quelle im Scope ist: `docs/SP5_1_FIGURE_MATRIX.md:3-4`.

4. Empfohlene Assertions/Änderungen gegen Drift (SP5-Matrix/Mapping/Config):
   1. Ergänze im Test vor der bisherigen Loop:
      - `const mappingFigures = parseMappingFigures(readFileSync(MAPPING_DOC,'utf8'))`
      - `assert.deepEqual([...matrix.keys()].sort(), [...mappingFigures].sort())` (driftfrei: `mapping` ↔ `matrix`).
   2. Ersetze/ergänze die aktuelle `knownFigures`-Ermittlung durch die Mapping-basierte Menge (oder nutze beide für Vergleichsassertionen).
      - Bestehende Zeile `360-364` wäre dann Mapping-driven statt self-referential.
   3. In der Replacements-Loop ergänzen:
      - `assert.ok(mappingFigures.has(figure))` für jede `cfg.replaces_figure`.
      - optional zusätzlich: `assert.deepEqual([...new Set([...replacements.keys()]).sort()], [...matrix.keys()].filter(f => mappingFigures.has(f)).sort())` nur falls Business-Rule explizit „jede Mapping-Figur soll in Matrix auftauchen“ bedeuten soll.
   4. Belege im bestehenden Code:
      - `scripts/atlas/build-config.test.mjs:360-390`, `249-254` (unbekannte `replaces_figure` in Config-Schema).
      - `scripts/atlas/build-config.mjs:325-326`/`388-390` (`replaces_figure`-Validierung gegen `knownFigures`).

5. Verifikation (nach gewünschter Fix-Umsetzung):
   1. `node --test scripts/atlas/build-config.test.mjs`
   2. `cd apps/brain-app && pnpm exec vitest run src/viewer/atlas/configExport.test.ts`
   3. `cd apps/brain-app && pnpm typecheck`
   4. Optional zusätzlicher Runtime-Check: `node scripts/atlas/build-config.mjs`

## 2) Minimaler Patch (Lesbarkeit zuerst, kein hartkodierter zweiter Satz)

1. `scripts/atlas/build-config.test.mjs` (read-only report scope)
   1. Add:
      - `const KAPITEL11_MAPPING_DOC = new URL('../../docs/KAPITEL11_ABBILDUNGEN_MAPPING.md', import.meta.url)`
      - `parseFigureMapping(markdown)`-Parser für 1. Spalte der Mapping-Tabelle.
      - Normalizer `normalizeFigureFromMapping()` nach Regeln aus Punkt 3.3.
   2. In `SP5.1-Figurenmatrix deckt Known-Figures und Runtime-Config ab`:
      - replace `knownFigures` aus `loadKnownFigures()` mit `mappingFigures`.
      - keep `matrix`-vs-`configs` assertions, add matrix/mapping equality assertion.
      - keep `matrix.has(figure)` for config coverage, but augment with `mappingFigures.has(figure)`.

2. `scripts/atlas/build-config.mjs` (falls Laufzeit-Validierung auch mapping-backed werden soll)
   1. Add `KAPITEL11_FIGURE_MAPPING = join(REPO,'docs/KAPITEL11_ABBILDUNGEN_MAPPING.md')`.
   2. `loadKnownFigures()` auf Mapping-Parser umstellen.
   3. Keep existing `replaces_figure` validation (`validateFigureFields`) but now backed by Mapping set instead of matrix self-reference.

## 3) Status

1. Die Anfrage ist durch Dateizeilen belegt; keine Produktdatei wurde geändert.
2. Risiko, das der fixe Patch sofort adressiert: `replaces_figure`-Validierung und Matrix-Konsistenz sind aktuell auf derselben Datei aufgebaut (`docs/SP5_1_FIGURE_MATRIX.md`), nicht auf dem deklarierten Kapitel-11-Quellinventar (`docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`, siehe `docs/SP5_1_FIGURE_MATRIX.md:3-4`).

## Kritischer Review nach Implementierung

Keine Blocker gefunden.

### Critical

Keine.

### High

Keine.

### Medium

Keine.

### Low

1. `canonicalFigureId()` ist an der rechten Seite nicht strikt abgeschlossen und akzeptiert daher Trailingschrott statt laut zu scheitern.
   - Beleg: `scripts/atlas/build-config.mjs:267-278`.
   - Repro: `canonicalFigureId('11-8 B extra')` liefert aktuell `11-08B`.
   - Auswirkung: Ein versehentlich verunreinigtes Figure-Label in Mapping oder Matrix koennte auf eine gueltige kanonische ID zusammenfallen, statt als Quellfehler aufzufallen.
   - Bewertung: fuer den vorliegenden Fix kein Blocker, aber die Fail-loud-Eigenschaft an der Parser-Grenze ist dadurch weicher als noetig.

2. `loadKnownFigures()` ist jetzt korrekt mapping-backed, parst das Markdown aber abschnittsunabhaengig ueber zwei Regexe statt nur ueber die beabsichtigten Inventar-Abschnitte.
   - Beleg: `scripts/atlas/build-config.mjs:287-297`.
   - Positiv: Im aktuellen Dokument werden die relevanten Figure-Zeilen sauber erfasst, waehrend die Nicht-Figure-Bullets unter `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md:46-58` nicht matchen, weil sie nach dem Fettdruck mit `:` statt mit `—`/`-` weiterlaufen.
   - Restrisiko: Eine spaetere zusaetzliche Markdown-Tabelle mit fetter erster Spalte oder ein weiterer Figure-aehnlicher Bullet anderswo im Dokument koennte unbeabsichtigt in den Known-Figure-Satz geraten.

### Gepruefte Kernfragen

1. Self-reference behoben: Ja.
   - `loadKnownFigures()` liest jetzt `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md` (`scripts/atlas/build-config.mjs:15`, `287-297`) und nicht mehr die Matrix.
   - Die Matrix wird im Test separat aus `docs/SP5_1_FIGURE_MATRIX.md` geparst (`scripts/atlas/build-config.test.mjs:50`, `89-108`, `348-386`).
   - Damit stammen Referenzmenge und Review-Matrix aus zwei unterschiedlichen Dokumentquellen; eine Selbstvalidierung der Matrix gegen sich selbst liegt im aktuellen Slice nicht mehr vor.

2. Kanonisierung der gefragten Faelle: sauber im Ist-Zustand.
   - `11-8 A` -> `11-08A`
   - `11-8 (C)` -> `11-08C`
   - `11-11 A/B` -> `11-11A/B`
   - `11-15 (1a)` -> `11-15(1)`
   - `11-12` -> `11-12`
   - Grundlage: `scripts/atlas/build-config.mjs:250-285`.
   - Zusaetzliche Evidenz: Die Matrix-Gleichheitsassertion (`scripts/atlas/build-config.test.mjs:348-353`) waere mit den realen Mapping-Zeilen aus `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md:21-35, 41-44` sofort rot, wenn einer dieser Faelle auslassen oder falsch aggregieren wuerde.

3. `replaces_figure`-Validierung ist im Runtime-Build-Pfad mapping-backed und fail-loud.
   - `buildConfig()` ruft `validateConfig(config, idx, loadValidationContext(config))` auf (`scripts/atlas/build-config.mjs:549-554`).
   - `loadValidationContext()` fuellt `knownFigures` aus `loadKnownFigures()` (`scripts/atlas/build-config.mjs:313-325`).
   - `validateFigureFields()` wirft bei unbekannter `replaces_figure` hart (`scripts/atlas/build-config.mjs:411-414`).
   - Die Unit-Absicherung dafuer existiert mit einem negativen Fall (`scripts/atlas/build-config.test.mjs:237-243`).
   - Einschraenkung: Der exportierte Helfer `validateConfig(config, idx)` kann ohne `ctx.knownFigures` weiter direkt aufgerufen werden und ueberspringt dann genau diese Pruefung. Das betrifft den Helper-API-Pfad, nicht den eigentlichen Build-/Runtime-Pfad dieses Issues.

4. Teststaerke: fuer das behobene Self-reference-Problem ausreichend und ohne zweite harte Wahrheit.
   - Kein zweites hartcodiertes Figure-Inventar: Die Known-Figures kommen aus dem Mapping-Dokument, die Matrix aus dem Matrix-Dokument, und die Runtime-Replacements aus der echten TOML-Config (`scripts/atlas/build-config.test.mjs:348-386`).
   - Der Test zwingt beide Richtungen:
     - Matrix-Keyset == mapping-backed Known-Figures (`351-353`)
     - jede `replaces_figure` muss mapping-backed und in der Matrix gelistet sein (`355-365`)
     - jede `done`-Matrixzeile muss exakt durch Runtime-Configs erklaert werden (`367-381`)
   - Was fehlt, ist nur eine direkte, kleine Unit-Assertion fuer die Kanonisierungsfunktion selbst; funktional ist das aktuell durch den Dokumentabgleich aber bereits abgedeckt.

### Verifikation

1. Frisch ausgefuehrt: `node --test scripts/atlas/build-config.test.mjs`
2. Ergebnis: 21/21 Tests gruen.

### Nachreview nach Low-Fix

Keine verbleibenden Findings im geprueften Slice.

1. `canonicalFigureId()` ist jetzt rechts strikt geankert (`scripts/atlas/build-config.mjs:267-278`); der fruehere Trailingschrott-Fall wird durch den neuen Test explizit abgefangen (`scripts/atlas/build-config.test.mjs:332-339`).
2. `loadKnownFigures()` parst jetzt nur noch die beiden beabsichtigten Mapping-Abschnitte (`scripts/atlas/build-config.mjs:287-307`) und ist damit nicht mehr abschnittsunabhaengig.
3. Die self-referential Regression bleibt behoben: Known-Figures kommen aus `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`, die Matrix wird separat aus `docs/SP5_1_FIGURE_MATRIX.md` geprueft, und `replaces_figure` wird im Build-Pfad weiter mapping-backed validiert.
4. Frisch verifiziert: `node --test scripts/atlas/build-config.test.mjs` mit 22/22 gruener Testsuite.

Review-Status: `pass`

### Nachreview nach Trackability-Fix

Keine verbleibenden Findings zum Trackability-Fix.

1. `.gitignore` enthaelt keinen Ignore-Eintrag fuer `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`; `git check-ignore -v docs/KAPITEL11_ABBILDUNGEN_MAPPING.md` liefert keinen Treffer.
2. Die harte Mapping-Source ist jetzt Git-bekannt: `git status --short -- docs/KAPITEL11_ABBILDUNGEN_MAPPING.md .gitignore` zeigt `A  docs/KAPITEL11_ABBILDUNGEN_MAPPING.md` und ` M .gitignore`, und `git ls-files --error-unmatch docs/KAPITEL11_ABBILDUNGEN_MAPPING.md` gibt den Pfad aus.
3. Frisch verifiziert: `git diff --check` ohne Befund.

Review-Status: `pass`

### Review-Status

pass
