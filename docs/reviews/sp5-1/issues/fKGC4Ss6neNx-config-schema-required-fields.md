# Review — fKGC4Ss6neNx Config-Schema Required Fields

## Scope

Reviewt wurde ausschliesslich der aktuelle Fix fuer Dart-Issue `fKGC4Ss6neNx` in:

1. `scripts/atlas/build-config.mjs`
2. `scripts/atlas/build-config.test.mjs`
3. `scripts/atlas/config.default.toml` (nur der neue Schema-Kommentar zur Optionalitaet von `replaces_figure`)
4. `docs/reviews/sp5-1/SP5.1.1-schema-review.md` als Review-Vorgeschichte

Ausdruecklich nicht reviewt: sonstige vorbestehende Dirty-Worktree-Aenderungen ausserhalb dieses Scopes.

## Gepruefte Dateien

1. `scripts/atlas/build-config.mjs`
2. `scripts/atlas/build-config.test.mjs`
3. `scripts/atlas/config.default.toml`
4. `docs/reviews/sp5-1/SP5.1.1-schema-review.md`

## Verifikation

1. Selbst ausgefuehrt: `node --test scripts/atlas/build-config.test.mjs` -> Exit 0.
2. Selbst ausgefuehrt: read-only Repro gegen `validateConfig()` mit einer gueltigen Scene-/Lern-Configuration ohne `replaces_figure` -> `PASS`.
3. Uebernommen vom Hauptagenten: `cd apps/brain-app && pnpm typecheck` -> Exit 0.

## Findings By Severity

### None

Im angeforderten Scope habe ich keine neuen Bugs, Regressionen oder stillen Fallbacks gefunden.

Die frueheren SP5.1.1-Befunde zu fehlender Pflichtfeld-Erzwingung und zu falschen primitiven Typen sind in der aktuellen Fassung fuer `configuration`-Nodes adressiert:

1. `validateConfigurationSchema()` erzwingt die erwarteten Required-Felder via `assertRequiredKeys()` in `scripts/atlas/build-config.mjs:318-385`.
2. Primitive Typen werden fuer die betroffenen Konfigurationsfelder fail-loud geprueft, statt still akzeptiert zu werden, ebenfalls in `scripts/atlas/build-config.mjs:318-385`.
3. Die neuen Negativtests decken die Kernfaelle fuer fehlende Required-Felder und falsche primitive Typen ab in `scripts/atlas/build-config.test.mjs:181-215`.

## Residual Risk

1. Der Patch in denselben Dateien ist breiter als das Issue `fKGC4Ss6neNx`: er umfasst zusaetzlich Mesh-Mapping-Validierung, Figure-Matrix-Helfer, Formatierung und Build-Output-Nebenwirkungen. Ich habe in diesem Review keine konkrete Fehlfunktion daraus belegt, aber die Aenderung ist nicht Karpathy-minimal.
2. Die aelteren SP5.1.1-Themen ausserhalb des erwarteten Fix-Scopes, insbesondere tief verschachtelte Unknown-Keys und weitergehende Sequencing-/Migrationsfragen, werden durch diesen Report nicht erneut als erledigt bestaetigt.

## Verdict

Approve fuer `fKGC4Ss6neNx`.

Die Entscheidung, `replaces_figure` optional zu lassen, ist plausibel und konsistent mit der realen Default-Config: `scripts/atlas/config.default.toml` dokumentiert das jetzt explizit in den Schema-Kommentaren (`scripts/atlas/config.default.toml:6-12`), und dieselbe Datei enthaelt mehrere legitime nicht-figurenersetzende Scene-/Lern-Atoms ohne dieses Feld, etwa `go-nogo-intro`, `ica-uebersicht` und `zusammenfassung`.
