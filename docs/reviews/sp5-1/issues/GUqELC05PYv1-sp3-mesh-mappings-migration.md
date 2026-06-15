# GUqELC05PYv1 Code Mapping

## Betroffene Pfade
- `scripts/atlas/build-config.mjs:54-59`, `:78-79`, `:197-214`, `:517-531`, `:604-607` — `mesh_mappings` ist als Root- und Konfigurationsfeld mit eigener Struktur/Validierung definiert und beim Build zweimal serialisiert (`atlas-config.json`, `meshMappings.generated.json`).
- `scripts/atlas/build-config.test.mjs:52-62`, `:64-77`, `:270-290` — Testfixture enthält `mesh_mappings`; Negativtest deckt leere / ungültige Mapping-Knoten ab.
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts:44-47`, `:65-72`, `:213-218` — Typvertrag verlangt `mesh_mappings` im geladenen Canonical-JSON; `CONFIG_URL` lädt `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`.
- `apps/brain-app/src/scene/regions.ts:5-15`, `apps/brain-app/src/viewer/bucketMeshes.ts:5-11`, `apps/brain-app/src/scene/brainBridge.ts:7-16`, `:22-33` — Runtime-Auflösung von Region-/Bucket-Highlighting nutzt `meshMappings.generated.json` als harte Quelle für Mesh-Mappings.
- `scripts/atlas/config.default.toml:45-167` — `mesh_mappings.buckets.*` und `mesh_mappings.scene_regions.*` sind primäre Autorenquelle für die Pflicht-Felder.
- `apps/brain-app/src/viewer/meshMappings.generated.json` (untracked im Worktree) wird von Runtime-Modulen importiert.

## Aktueller Vertrag
- Build-Validierung ist hart: `REQUIRED_ROOT_KEYS` enthält `mesh_mappings`; `validateMeshMappings()` verlangt Objekt + genau beide Sektionen (`buckets`, `scene_regions`), nicht-leere Knoten und Mapping-Node-Checks inkl. `known_gap`/`gap_reason`.
- Das ist bereits als Pflichtfeld definiert: `validateConfig(...): assertRequiredKeys(..., REQUIRED_ROOT_KEYS, 'root')` und `validateMeshMappings(config.mesh_mappings, ctx)`.
- Exportiert wird das Ergebnis in das Runtime-JSON `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`; zugleich schreibt der Builder separat `apps/brain-app/src/viewer/meshMappings.generated.json`.
- Der Runtime-Resolver geht davon aus, dass `mesh_mappings` im geladenen Configfile und die importierten Mapping-Dateien konsistent sind; unbekannte/leer gemappte Slugs führen zu harten Fehlern in `bucketMeshes.ts` und `brainBridge.ts`.

## Migrationsluecke in der Doku
- In den Produkt-/SSoT-Dokumenten wurde der SP3->SP5.1-Break nicht als Ablauf dokumentiert (`README.md`, `apps/brain-app/README.md`, `docs/SP5_1_CANONICAL_LINKS.md`, `docs/SP5_1_FIGURE_MATRIX.md`, `docs/MASTERPLAN.md`, `scripts/atlas/README.md`).
- Die einzige dokumentierte Aussage dazu ist im Review-Befund: `docs/reviews/sp5-1/SP5.1.1-schema-review.md:42-48` (Hinweis auf fehlenden Migrationspfad bei neu eingeführter `mesh_mappings`-Pflicht).
- Geeignete Aufnahmeorte:
  - `docs/SP5_1_CANONICAL_LINKS.md` (authoritärer Konfigurations- und Exportpfad),
  - `scripts/atlas/README.md` (Build/Authors-Flow),
  - `README.md`/`apps/brain-app/README.md` (onboarding + Canonical-Config-Hinweise),
  - `docs/MASTERPLAN.md` (SP5.1-Dokuindex und Abhängigkeitsübersicht).
- Zusätzlich sollte `docs/reviews/sp5-1/issues/` einen separaten „SP3-Migrationsnotiz“ enthalten, weil mehrere Issues bereits auf diese Lücke verweisen (`SP5.1.1-schema-review`/`SP5.1.2`/`SP5.1.4`/`SP5.1.7`).

## Minimaler Implementierungspfad
- **Code-Pfad (erforderlich, wenn alte SP3-Configs tatsächlich verarbeitet werden sollen):**
  1) Builder-seitig SP3-Eingaben erkennen (fehlende `mesh_mappings`) und deterministische Migrationshilfe liefern: entweder (a) automatische Defaults/Mapping-Abbildung aus bestehendem Baseline-Authoring ableiten oder (b) klarer, normalisierter Fehler mit Upgrade-Guide + optionalem Reparatur-Snippet.
  2) Danach Laufzeitkonsistenz erzwingen: Build-Pipeline sollte das `meshMappings.generated.json` für App-Builds reproduzierbar erzeugen oder als tracked Artefakt sichern.
- **Dokumentations-Pfad (ohne Logik-Änderung):**
  1) Migrations-SOP in den oben genannten Dokumenten ergänzen: "SP3-Config: Schrittweise Migration nach SP5.1 mit Pflichtfeldern (`mesh_mappings`)".
  2) Beispiel-Checkliste inkl. erwarteter Fehlermeldung (`build-config: mesh_mappings fehlt oder ist kein Objekt`) + Transformschritt + Validierung (`pnpm typecheck` / Builder-Validation).

## Verifikationsvorschlag
- Evidence-zentriert prüfen, ob die Lücke geschlossen ist:
  1) `node --test scripts/atlas/build-config.test.mjs` (bestehende Negative-Fälle + zusätzlicher SP3-kompatibler Fixture-Fall für „mesh_mappings fehlt“).
  2) `cd apps/brain-app && pnpm typecheck` + `pnpm test -- --run` (inkl. `apps/brain-app/src/scene/brainBridge.test.ts`, `viewer/atlas/atlasConfig.test.ts`).
  3) `node scripts/atlas/build-config.mjs` und Diff prüfen gegen `apps/brain-app/public/assets/atlas-canonical/atlas-config.json` sowie `apps/brain-app/src/viewer/meshMappings.generated.json`.
  4) Browser-Smoke mit der Migrations-Doku verifizierter SP3-fallback-less Konstellation (falls die Migrations-Logik im Builder ergänzt wird).

## Kritischer Review nach Implementierung

### Critical
- Keine.

### High
- Keine.

### Medium
- `docs/SP5_1_CANONICAL_LINKS.md:25-30` dokumentiert die Migrations-/Verifikations-Kommandos ohne Arbeitsverzeichnis. Das ist in diesem Repo nicht nur kosmetisch: Aus dem haeufigen App-CWD schlagen beide gezeigten Builder-Kommandos sofort fehl. Frische Repro: `cd apps/brain-app && node scripts/atlas/build-config.mjs` -> `MODULE_NOT_FOUND`; `cd apps/brain-app && node --test scripts/atlas/build-config.test.mjs` -> `Could not find 'scripts/atlas/build-config.test.mjs'`. `README.md:253-257` loest das korrekt mit "Aus dem Repo-Root bauen und pruefen", aber der zweite autoritative SP5.1-Pfad bleibt damit fuer die Akzeptanzidee unvollstaendig.

### Low
- Keine.

### Testbewertung
- Vom Hauptagenten frisch verifiziert: `node --test scripts/atlas/build-config.test.mjs` gruen (25/25), `cd apps/brain-app && pnpm typecheck` Exit 0, `git diff --check` Exit 0.
- Fuer die eigentliche Fachlogik ist der Docs-only-Scope ausreichend: `scripts/atlas/build-config.mjs:197-214` bricht bei fehlendem `mesh_mappings` weiterhin laut ab, und die Runtime-Pfade (`apps/brain-app/src/viewer/bucketMeshes.ts`, `apps/brain-app/src/scene/brainBridge.ts`) behalten fail-loud Verhalten bei unbekannten oder leeren Mapping-Slugs.
- Ein zusaetzlicher Test- oder Code-Slice ist fuer dieses konkrete Issue nicht review-blockierend; der offene Restpunkt ist Dokumentationspraezision, nicht fehlende Validierungslogik.

### Verifikationseinschaetzung
- Die Implementierung deckt den SP3->SP5.1-Bruch, den neuen Autoritaetsort (`scripts/atlas/config.default.toml`) und das Verbot stiller Rekonstruktion inhaltlich sauber ab (`README.md:235-262`, `docs/SP5_1_CANONICAL_LINKS.md:7-36`).
- Es gibt in den geaenderten Texten keine neue Suggestion eines stillen Fallbacks oder einer manuell gepflegten zweiten Wahrheit; beide Dokumente markieren die JSON-Dateien als abgeleitete Artefakte.
- Review-blockierend bleibt nur, dass `docs/SP5_1_CANONICAL_LINKS.md` die Builder-Kommandos nicht explizit an den Repo-Root bindet, obwohl derselbe Befehl aus `apps/brain-app` nachweislich scheitert.

### Finaler Status
- `fail`

## Nachreview

### Findings
- Keine neuen Befunde. Der zuvor blockierende Arbeitsverzeichnis-Fehler in der Doku ist geschlossen.

### Frische Verifikation
- `README.md:253-257` dokumentiert den Repo-Root-Flow jetzt korrekt mit `pnpm --dir apps/brain-app typecheck`.
- `docs/SP5_1_CANONICAL_LINKS.md:25-30` benennt den Abschnitt explizit als "Migration und Verifikation aus dem Repo-Root" und verwendet denselben funktionierenden Typecheck-Befehl.
- Frisch aus dem Repo-Root ausgefuehrt: `node scripts/atlas/build-config.mjs` Exit 0; `node --test scripts/atlas/build-config.test.mjs` 25/25 gruen; `pnpm --dir apps/brain-app typecheck` Exit 0; `git diff --check` Exit 0.

### Finaler Status
- `pass`
