---
contract: 2026-06-19-atlas-alignment-fallbacks-migr
round: 1
verdict: pass
scores:
  - criterion: "C1 Trefferinventur"
    score: 5
    note: "Abschluss-rg im NF-009-Scope mit Ausschluss von scripts/atlas/work zeigt nur negative build-config-Tests zu fallback_image und legacy review_status."
  - criterion: "C2 Datenlabel"
    score: 5
    note: "learn_brain_hierarchy.json nutzt pre-hcp1065 und Archivierte Fasertrakte (vor HCP1065); das sichtbare Legacy-Fasertrakte-Label ist entfernt."
  - criterion: "C3 Algorithmische Semantik"
    score: 5
    note: "Atlas-Begriffe sind auf Backfill-Inzidenzmodus, offenen Pial-Patch-Modus, globale Zentroid-Affine-Review-Projektion, namebasierte Lappenauflösung und deterministische Normalen-Ersatzkette migriert."
  - criterion: "C4 Negativfall Tests"
    score: 5
    note: "Verbleibende Fallback-/legacy-Treffer in build-config.test.mjs sind explizite Ablehnungstests fuer verbotene Overlay- und Review-Status-Pfade."
  - criterion: "C5 Verifikation"
    score: 5
    note: "node --test scripts/atlas/build-config.test.mjs, carve_cut.test.mjs und build-catalog.test.mjs, pnpm --dir apps/brain-app docs:drift und git diff --check liefen mit Exit 0."
summary: |
  NF-009 ist als Semantik- und Vertragsmigration umgesetzt. Es wurden keine
  Atlas-GLBs, Pick-Dateien oder BrainModel-Assets veraendert. Der einzige
  alte n_open_fallback-Treffer liegt in scripts/atlas/work/atlas3d_report.json,
  einem untracked generierten Report, der laut Inventur keine Runtime-Wahrheit
  ist.
---
