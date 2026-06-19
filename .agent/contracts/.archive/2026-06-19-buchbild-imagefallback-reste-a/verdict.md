---
contract: 2026-06-19-buchbild-imagefallback-reste-a
round: 1
verdict: pass
scores:
  - criterion: "C1 Kein Runtime-Figure-Ordner"
    score: 5
    note: "`test ! -d apps/brain-app/public/figures` lief mit Exit 0."
  - criterion: "C2 Figure-Scenes verbieten Buchbild-Fallbacks"
    score: 5
    note: "`pnpm --dir apps/brain-app exec vitest run src/scene/figureScenePackages.test.ts` lief gruen mit 1 Datei und 3 Tests."
  - criterion: "C3 Config-Validator verbietet Fallback-Keys"
    score: 5
    note: "`node --test scripts/atlas/build-config.test.mjs` lief gruen mit 39 Tests, inklusive `validateConfig verbietet Buchbild-Fallbacks im Overlay`."
  - criterion: "C4 Aktuelle Arbeitsdoku ist nicht stale"
    score: 5
    note: "docs/ASSET_UND_INHALTSINVENTUR.md, docs/MASTERPLAN.md und docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md beschreiben keinen aktiven Buchbild-/ImageFallback-Runtime-Vertrag mehr."
  - criterion: "C5 Such-Gate trennt aktuelle Pfade von historischen Plaenen"
    score: 5
    note: "`rg -n \"fallbackImage|fallback_image|ImageFallback|public/figures\" apps/brain-app/src apps/brain-app/public scripts docs/ASSET_UND_INHALTSINVENTUR.md docs/MASTERPLAN.md docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` liefert nur NF-006-Verifikationsbefehl und negative Tests."
summary: |
  PASS. Der aktuelle Runtime-Vertrag enthält keinen Figure-Ordner und keine
  Buchbild-Fallback-Komponente. Aktuelle Arbeitsdoku beschreibt Figure-
  Ersetzungen als eigene Szene-/Overlay-/3D-Inhalte; historische
  `docs/superpowers/**`-Planungen bleiben Verlaufsevidenz. Zusaetzliche
  Evidenz: `pnpm --dir apps/brain-app docs:drift`, `git diff --check` und
  `pnpm --dir apps/brain-app typecheck` liefen gruen.
---
