---
outcome:
  user_signal: |
    Neue Agents finden in aktueller Arbeitsdoku denselben Modus-, Atlas-,
    Config- und No-Fallback-Vertrag statt widersprüchlicher Altbegriffe.
  observable_in: |
    `README.md`, `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`,
    `apps/brain-app/*.md`, `docs/ARCHITECTURE.md`,
    `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` und der neue
    Doku-Drift-Check.
  guardrail: |
    Keine Runtime-Änderung, keine historischen Protokolle umschreiben,
    keine stillen Companion-/T6-/Editor-Begriffe als aktuelle Architektur.
  read_horizon: |
    Direkt vor Done über Drift-Check, gezieltes rg, App-Tests, Typecheck,
    Dart-Kommentar und ALRAH-Eval auswerten.
---

# Akzeptanzkriterien — Doku-Drift auf aktuellen brain-app Architekturvertrag migrieren

> Contract-ID: `2026-06-19-doku-drift-auf-aktuellen-brain`
> Revision: v1 (2026-06-19)

## C1 — Aktueller Modusvertrag ist konsistent

- Szenario: Ein Agent liest die aktuelle Arbeitsdoku.
  - Input: `PRODUCT.md`, `README.md`, `apps/brain-app/DESIGN.md`,
    `apps/brain-app/PRODUCT.md`, `apps/brain-app/README.md`, `CLAUDE.md`
    und `docs/ARCHITECTURE.md`.
  - Erwartet: Die regulären Modi werden als `learn`, `explore`, `phineas`
    beschrieben; `atlas` wird als internes/deep-linkbares Supplement oder
    Expert-Referenz beschrieben, nicht als gleichrangiger Startmodus.

## C2 — Legacy-Produktbegriffe sind nicht mehr aktueller Vertrag

- Szenario: Zentrale Drift-Begriffe werden in aktueller Arbeitsdoku gesucht.
  - Input: `rg -n "Drei Grundmodi|vier Modus-Karten|T6|/deck|/editor|src/features|public/companion|colors\\.groups" ...`
  - Erwartet: Kein Treffer beschreibt diese Begriffe als aktuelle Produkt-,
    Config- oder Architekturquelle.

## C3 — App-lokale Doku verweist auf zentrale Verträge

- Szenario: Ein Agent startet im Unterverzeichnis `apps/brain-app`.
  - Input: `apps/brain-app/README.md`, `apps/brain-app/PRODUCT.md`,
    `apps/brain-app/DESIGN.md`.
  - Erwartet: Die Dateien verweisen auf `../../PRODUCT.md`,
    `../../DESIGN.md`, `../../docs/ARCHITECTURE.md` oder erklären nur
    app-lokale Ergänzungen, ohne einen parallelen Produktvertrag zu erzeugen.

## C4 — Doku-Topologie ist sichtbar

- Szenario: Ein Agent sucht die zuständige Quelle für Produkt, Design,
  Architektur, Atlas, Areal-Färbungen oder No-Fallback-Reste.
  - Input: `docs/ARCHITECTURE.md`.
  - Erwartet: Ein Abschnitt benennt die zuständigen Dokumente und grenzt
    aktuelle Arbeitsdoku von historischen Protokollen ab.

## C5 — Drift-Check blockiert Rückfall

- Szenario: Der Doku-Drift-Check läuft im aktuellen Worktree.
  - Input: `pnpm --dir apps/brain-app docs:drift`.
  - Erwartet: Exit 0 im bereinigten Zustand.

## C6 — Drift-Check meldet verbotene Reintroduktion

- Szenario: Ein aktuelles Arbeitsdokument enthält einen blockierten Altbegriff
  ohne Allowlist-Kontext.
  - Input: Das Check-Skript enthält mindestens eine Regel für blockierte
    Altbegriffe und würde mit Fundstellen Exit 1 liefern.
  - Erwartet: Die Regel ist im Skript nachvollziehbar implementiert und die
    aktuelle Bereinigung läuft ohne solche Fundstellen.

## C7 — No-Fallback-Inventur bleibt Source of Truth

- Szenario: NF-008 wird nach der Migration gelesen.
  - Input: `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`.
  - Erwartet: NF-008 nennt die migrierten Dateien, den aktiven
    Doku-Drift-Check und die Abschlussverifikation.

## C8 — Repo-native Verifikation läuft

- Szenario: Abschluss vor Dart-`Done`.
  - Input:
    `pnpm --dir apps/brain-app test -- src/viewer/appModeDefinitions.test.ts src/viewer/settingsRuntime.test.ts src/viewer/atlas/atlasConfig.test.ts`
    und `pnpm --dir apps/brain-app typecheck`.
  - Erwartet: Beide Befehle laufen erfolgreich oder ein harter Blocker wird
    mit konkreter Fehlermeldung in Dart und ALRAH dokumentiert.
