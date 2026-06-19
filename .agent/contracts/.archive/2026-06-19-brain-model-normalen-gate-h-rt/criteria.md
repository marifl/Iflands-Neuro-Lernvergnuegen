---
outcome:
  user_signal: |
    Neue TARO- oder MNI-Brain-Assets können nicht mehr mit unerwartetem
    Normalen-/Orientierungsdrift durch das Release-Gate laufen.
  observable_in: |
    `scripts/atlas/check-brain-model-assets.mjs` und
    `pnpm --dir apps/brain-app verify:brain-models`.
  guardrail: |
    Keine GLB-Neugenerierung, keine Viewer-Änderung, keine versteckte globale
    Orientierungs-Toleranz ohne asset-spezifische Erwartung.
  read_horizon: |
    Sofort im aktuellen Contract-Run und danach bei jedem CI-Lauf auf `main`
    oder Pull Requests mit `scripts/atlas/**` beziehungsweise `apps/brain-app/**`.
---

# Akzeptanzkriterien — Brain-Model-Normalen-Gate härten

> Contract-ID: `2026-06-19-brain-model-normalen-gate-h-rt`
> Revision: v1 (2026-06-19)

Jedes Kriterium MUSS binaer testbar sein (Pass/Fail). Keine vagen Begriffe
("appropriate", "robust", "clean"). Konkrete, messbare Aussagen.

Formuliere jedes Kriterium als konkretes Input/Erwartet-Paar, damit Tests aus den
Kriterien abgeleitet werden (nicht aus dem Code). Mindestens ein Negativ-/Fehlerfall.

## C1 — Baseline bleibt grün
- Szenario: Aktuelle TARO- und MNI-Brain-Assets werden geprüft.
  - Input: `pnpm --dir apps/brain-app verify:brain-models`
  - Erwartet: Exit 0 und Ausgabe `brain model asset gate passed (5 assets)`.

## C2 — Unerwartete Orientierungsverschlechterung bricht
- Szenario: Ein Orientierungsbudget wird testweise unter die aktuelle Baseline
  gesetzt.
  - Input: `maxInwardLikelyMeshes` für ein aktuelles Asset kleiner als dessen
    gemessener `inwardLikely`-Wert, danach `pnpm --dir apps/brain-app verify:brain-models`
  - Erwartet: Exit != 0 und Fehler mit `inward likely meshes`.

## C3 — Worst-Mesh-Drift ist explizit
- Szenario: Der schlechteste Outward-Mesh-Name oder seine Ratio weicht von der
  asset-spezifischen Baseline ab.
  - Input: `expectedWorstOutwardName` oder `minWorstOutwardRatio` passt nicht
    zum aktuellen Checker-Ergebnis.
  - Erwartet: Exit != 0 und Fehler mit `worst outward`.

## C4 — CI-Pfad bleibt unverändert aktiv
- Szenario: Workflow-Konfiguration wird geprüft.
  - Input: `.github/workflows/brain-app.yml`
  - Erwartet: Job enthält weiterhin `pnpm verify:brain-models` nach Build und
    vor Performance-Budget.
