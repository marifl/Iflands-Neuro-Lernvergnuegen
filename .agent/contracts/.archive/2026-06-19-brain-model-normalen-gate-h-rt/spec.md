# Spec — Brain-Model-Normalen-Gate härten

> Contract-ID: `2026-06-19-brain-model-normalen-gate-h-rt`
> Revision: v1 (2026-06-19)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  Brain-Model-Optimierungen dürfen keine invertierten oder falsch ausgerichteten
  Normalen mehr in TARO- oder MNI-Assets einführen.
why_now: |
  Der frische Gate-Run zeigt zwar niedrige Face/Vertex-Normalenfehler, aber
  `inwardLikely` ist aktuell nur Diagnose-Output und kein Fail-Kriterium.
symptom_vs_problem: |
  Symptom = die frühere TARO-Pipeline hatte relevante Normalen-/Richtungsfehler.
  Problem = das aktuelle CI-Gate muss jede neue Orientierungsverschlechterung
  hart blockieren, nicht nur sichtbar loggen.
smallest_change: |
  `scripts/atlas/check-brain-model-assets.mjs` erweitert die Modellbudgets um
  explizite Orientierungsgrenzen und bekannte Worst-Mesh-Ausnahmen. Das
  bestehende `verify:brain-models` bleibt der einzige CI-Pfad.
tradeoffs: |
  Keine Blender-Neugenerierung in dieser Slice: Ziel ist Gate-Sicherheit, nicht
  Asset-Qualität neu zu optimieren.
  Keine globale "ein paar inward meshes sind okay"-Toleranz: Ausnahmen müssen
  asset-spezifisch benannt sein.
```

---

## Working Principles (Karpathy + FAB — Reminder fuer Implementer)

1. **Think First** — Frame oben ist die Annahme-Basis. Bei Drift wahrend Implementation: spec.md updaten, nicht silently abweichen.
2. **Simplicity** — `smallest_change` aus dem Frame ist Source of Truth. Keine spekulativen Features ueber In-Scope hinaus.
3. **Surgical** — Out-of-Scope ist verbindlich. Adjacent-Refactor ist ein separater Contract.
4. **Goal-Driven** — criteria.md `outcome:` Frontmatter (user_signal/observable_in/guardrail/read_horizon) ist Verify-Ziel.

FAB-Bezug: `docs/decisions/ADR-005-fab-design-principles.md` (Gebote II/IX/X greifen besonders).

---

## 1. Motivation und Problem

Der User hat explizit gefragt, ob beim neuen MNI/TARO-Optimierungspfad wieder
auf das alte TARO-Problem geachtet wurde: Normalen-Richtungen waren damals
teilweise falsch herum. Der aktuelle Checker verifiziert bereits Größenbudget,
Meshanzahl, Normalenabdeckung, Normalenlängen und Face/Vertex-Konsistenz.

Die Lücke: Der Checker zählt `inwardLikelyMeshes` und `worstOutward`, wertet
diese Felder aber nicht als Fail-Kriterium. Dadurch wäre eine Verschlechterung
der Mesh-Orientierung sichtbar, aber nicht automatisch CI-blockierend.

## 2. Scope

### In-Scope

- `scripts/atlas/check-brain-model-assets.mjs` um explizite
  Orientierungsbudgets erweitern.
- Die aktuellen Baseline-Ausreißer pro Asset benennen, damit Drift sichtbar und
  fail-loud wird.
- `pnpm --dir apps/brain-app verify:brain-models` als Verifikationssignal
  nutzen.

### Out-of-Scope

- Keine GLB-Neugenerierung.
- Keine Änderung an Viewer, Atlas-Rendering, Picking oder Shadern.
- Kein neuer zweiter Asset-Checker neben dem bestehenden CI-Gate.

## 3. Architektur

`BRAIN_MODELS` bleibt die zentrale Budgetliste. Jedes Asset bekommt zusätzlich
ein maximal erlaubtes `inwardLikelyMeshes`, ein `expectedWorstOutwardName` und
eine minimale `worstOutward.ratio`. `assertBrainModel` vergleicht die frischen
Messwerte gegen diese Grenzen und bricht mit konkreter Fehlermeldung ab.

## 4. Test-Strategie

- Red-Test: Grenzwert absichtlich unter die aktuelle Baseline setzen und prüfen,
  dass `verify:brain-models` fehlschlägt.
- Green-Test: echte Baseline-Grenzen setzen und `verify:brain-models` grün
  laufen lassen.
- Regression: `git diff --check`.

## 5. Pflichtlektuere

- `AGENTS.md`
- `/Users/marcusifland/.codex/skills/td-asset-optimization/SKILL.md`
- `/Users/marcusifland/.codex/skills/no-fallback-architecture/SKILL.md`
- `scripts/atlas/check-brain-model-assets.mjs`
- `.github/workflows/brain-app.yml`
