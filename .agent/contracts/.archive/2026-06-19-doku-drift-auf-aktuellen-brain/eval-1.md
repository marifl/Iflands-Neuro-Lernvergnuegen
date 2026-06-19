---
contract: 2026-06-19-doku-drift-auf-aktuellen-brain
round: 1
verdict: pass
scores:
  - criterion: "C1 Aktueller Modusvertrag ist konsistent"
    score: 5
    note: "PRODUCT, README, CLAUDE, apps/brain-app/DESIGN und docs/ARCHITECTURE beschreiben learn/explore/phineas als reguläre Modi und Atlas als internes/deep-linkbares Supplement."
  - criterion: "C2 Legacy-Produktbegriffe sind nicht mehr aktueller Vertrag"
    score: 5
    note: "Abschluss-rg zeigt nur erlaubte Negativ- und Inventarstellen: README colors.groups, NF-008/NF-013, app DESIGN historische Markierung, Matrix negative colors.groups-Regel."
  - criterion: "C3 App-lokale Doku verweist auf zentrale Verträge"
    score: 5
    note: "apps/brain-app/PRODUCT.md verweist auf Root-PRODUCT, Root-DESIGN und docs/ARCHITECTURE; app README und DESIGN verweisen auf Architektur und Atlas-Config."
  - criterion: "C4 Doku-Topologie ist sichtbar"
    score: 5
    note: "docs/ARCHITECTURE.md enthält neuen Abschnitt Doku-Topologie mit Produkt, Design, CLAUDE, App-Design, Atlas, Areal-Matrix und No-Fallback-Inventur."
  - criterion: "C5 Drift-Check blockiert Rückfall"
    score: 5
    note: "pnpm --dir apps/brain-app docs:drift läuft mit Exit 0 und prüft 10 aktuelle Arbeitsdokumente."
  - criterion: "C6 Drift-Check meldet verbotene Reintroduktion"
    score: 5
    note: "scripts/check-doc-drift.mjs enthält Regeln für old-mode-count, old-shell-routes, old-companion-contract und old-color-groups-path mit enger Allowlist."
  - criterion: "C7 No-Fallback-Inventur bleibt Source of Truth"
    score: 5
    note: "NF-008 in docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md nennt migrierte Dateien, scripts/check-doc-drift.mjs und pnpm --dir apps/brain-app docs:drift."
  - criterion: "C8 Repo-native Verifikation läuft"
    score: 5
    note: "pnpm --dir apps/brain-app test -- src/viewer/appModeDefinitions.test.ts src/viewer/settingsRuntime.test.ts src/viewer/atlas/atlasConfig.test.ts lief grün; pnpm --dir apps/brain-app typecheck lief grün."
summary: |
  Die Doku-Migration erfüllt den Contract. Aktuelle Arbeitsdoku ist auf den
  Runtime-Vertrag learn/explore/phineas plus Atlas-Supplement vereinheitlicht,
  app-lokale Doku erzeugt keinen parallelen Produktvertrag mehr, und ein
  mechanischer docs:drift-Gate verhindert die wichtigsten Reintroduktionen.
---
