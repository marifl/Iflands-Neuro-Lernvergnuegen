---
contract: 2026-06-19-phineas-asset-space-legacy-fig
round: 1
verdict: pass
scores:
  - criterion: "C1 Aktueller Space-Vertrag ohne Legacy-Namen"
    score: 5
    note: "Manifest und Transform-Contract nutzen `spaceId: phineas-gage-taro-fit-v1`; der alte `phineas-gage-legacy-figs3d`-Vertrag ist aus aktuellen Runtime-Dateien entfernt."
  - criterion: "C2 Phineas Asset-Tests sichern den neuen Vertrag"
    score: 5
    note: "`pnpm --dir apps/brain-app exec vitest run src/viewer/phineasStandaloneAssets.test.ts src/viewer/authoringAssetLoader.test.ts` lief gruen mit 2 Dateien und 13 Tests; phineasStandaloneAssets.test.ts assertet den neuen Space direkt."
  - criterion: "C3 Mesh-Identity-Inventar ist regeneriert"
    score: 5
    note: "`pnpm --dir apps/brain-app run inventory:mesh-identity` lief gruen; JSON- und Markdown-Inventar nennen `phineas-gage-taro-fit-v1`."
  - criterion: "C4 Transform- und Runtime-Smoke bleiben gruen"
    score: 5
    note: "`pnpm --dir apps/brain-app run verify:phineas-transform` und `SMOKE_URL=http://localhost:5174 pnpm --dir apps/brain-app run smoke:phineas-gage` liefen gruen."
  - criterion: "C5 Legacy-Begriff bleibt nur historische Quelle"
    score: 5
    note: "`rg -n \"phineas-gage-legacy-figs3d|legacy-figs3d\" apps docs scripts --glob '!docs/reviews/**' --glob '!docs/END_SESSION_*'` lieferte keine Treffer."
summary: |
  PASS. Der app-seitige Phineas-Space ist auf `phineas-gage-taro-fit-v1`
  migriert; Archiv-Provenienz bleibt in Source-Feldern erhalten, ohne als
  Legacy-Runtime-Vertrag durchzuschlagen. Keine GLBs, Hashes oder Transforms
  wurden geändert. Zusätzliche Evidenz: `pnpm --dir apps/brain-app docs:drift`,
  `git diff --check`, `pnpm --dir apps/brain-app typecheck`,
  `pnpm --dir apps/brain-app test` (82 Dateien, 442 Tests) und
  `pnpm --dir apps/brain-app build` liefen grün.
---
