---
outcome:
  user_signal: |
    Release-Review sieht Atlas-/Alignment-Fallback-Treffer als migrierte
    aktuelle Methoden oder ausdrücklich erlaubte Negativtests.
  observable_in: |
    scripts/atlas, scripts/assets/bodyparts3d, scripts/alignment,
    docs/ATLAS_* und docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md.
  guardrail: |
    Keine Atlas-GLBs, Pick-Dateien oder BrainModel-Assets werden ohne
    Re-Bake-/Topology-Gates verändert.
  read_horizon: |
    Nach Abschluss-rg, Atlas-Tests, Docs-Drift und ALRAH-Eval.
---

# Akzeptanzkriterien — Atlas Alignment Fallbacks migrieren

> Contract-ID: `2026-06-19-atlas-alignment-fallbacks-migr`
> Revision: v1 (2026-06-19)

## C1 — Trefferinventur
- Szenario: NF-009-Scope wird nach alten Begriffen durchsucht.
  - Input: `rg -n "Fallback|fallback|Legacy-Fasertrakte|legacy|Legacy" scripts/atlas scripts/assets scripts/alignment docs/ATLAS_* --glob '!node_modules' --glob '!**/.venv/**'`.
  - Erwartet: Jeder Treffer ist migriert, ein explizit negativer Test, eine
    No-Fallback-Regel oder in der NF-009-Inventurzeile erklärt.

## C2 — Datenlabel
- Szenario: Alignment-Hierarchy enthält Fasertrakt-Knoten.
  - Input: `scripts/alignment/learn_brain_hierarchy.json`.
  - Erwartet: Kein sichtbares Label `Legacy-Fasertrakte (vor HCP1065)` bleibt
    als aktueller Strukturbaum-Name.

## C3 — Algorithmische Semantik
- Szenario: Atlas-Skripte behandeln Lücken, offene Patches, Namen oder
  Null-Normalen.
  - Input: betroffene Skripte und Doku.
  - Erwartet: Begriffe benennen deterministische aktuelle Methoden statt
    `Fallback` als Endzustand.

## C4 — Negativfall Tests
- Szenario: Tests prüfen, dass verbotene Fallbacks abgelehnt werden.
  - Input: `scripts/atlas/build-config.test.mjs`.
  - Erwartet: Negative Testnamen dürfen `Fallback` behalten, wenn sie Verbot
    oder Ablehnung explizit ausdrücken.

## C5 — Verifikation
- Szenario: NF-009 ist reine Semantik-/Datenmigration ohne GLB-Rebuild.
  - Input: `node --test scripts/atlas/build-config.test.mjs`,
    `node --test scripts/atlas/carve_cut.test.mjs`,
    `node --test scripts/atlas/build-catalog.test.mjs`,
    `pnpm --dir apps/brain-app docs:drift`, `git diff --check`.
  - Erwartet: Alle Befehle beenden mit Exit 0 oder ein externer Datenblocker
    wird konkret benannt.
