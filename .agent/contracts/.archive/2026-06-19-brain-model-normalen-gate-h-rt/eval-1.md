---
contract: 2026-06-19-brain-model-normalen-gate-h-rt
round: 1
verdict: pass
scores:
  - criterion: "C1 Baseline bleibt grün"
    score: 5
    note: "`pnpm --dir apps/brain-app verify:brain-models` lief nach der finalen Baseline grün und meldete `brain model asset gate passed (5 assets)`."
  - criterion: "C2 Unerwartete Orientierungsverschlechterung bricht"
    score: 5
    note: "Mit testweise `maxInwardLikelyMeshes: 1` für TARO brach das Gate mit `inward likely meshes 2 > 1` ab."
  - criterion: "C3 Worst-Mesh-Drift ist explizit"
    score: 5
    note: "Mit testweise falschem `expectedWorstOutwardName` brach das Gate mit `worst outward mesh corpus-callosum != not-a-real-mesh` ab."
  - criterion: "C4 CI-Pfad bleibt unverändert aktiv"
    score: 5
    note: "`.github/workflows/brain-app.yml` enthält weiterhin `pnpm verify:brain-models` nach Production build und vor Performance budget."
summary: |
  PASS. Das Brain-Model-Gate prüft weiterhin Normalenlängen und Face/Vertex-
  Normalen-Konsistenz und blockiert jetzt zusätzlich unerwartete
  Orientierungs-Ausreißer über asset-spezifische Budgets. Es wurden keine GLBs
  neu erzeugt und keine Viewer-Pfade geändert.
---
