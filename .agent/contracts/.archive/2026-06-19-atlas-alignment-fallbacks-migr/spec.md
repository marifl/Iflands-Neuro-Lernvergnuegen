# Spec — Atlas Alignment Fallbacks migrieren

> Contract-ID: `2026-06-19-atlas-alignment-fallbacks-migr`
> Revision: v1 (2026-06-19)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  Atlas-/Alignment-Skripte und Datenlabels enthalten Fallback-/Legacy-Begriffe,
  die neue Agents als still akzeptierte Ersatzarchitektur missverstehen können.
why_now: |
  Die Release-Inventur NF-009 blockiert den Parent, bis algorithmische
  Konfliktbehandlungen und alte Datenlabels eindeutig klassifiziert sind.
symptom_vs_problem: |
  Symptom = Treffer wie Face-Fallback, Name-Fallback, open-fallback und
  Legacy-Fasertrakte. Problem = unklare Endzustände statt aktueller
  deterministischer Methodik.
smallest_change: |
  Begriffe/Keys/Labels in den betroffenen Skripten, Daten und Atlas-Dokus in
  aktuelle deterministische Semantik migrieren; negative Tests und No-Fallback-
  Doku ausdrücklich als erlaubte Treffer klassifizieren.
tradeoffs: |
  Keine Atlas-Geometrie neu backen und keine GLB-/Pick-Assets anfassen, solange
  die Änderung nur Semantik/Begriffe betrifft.
  Keine historischen END_SESSION-/Review-Dateien bereinigen.
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

NF-009 existiert, weil die Atlas-Pipeline bewusst mit deterministischen
Konfliktbehandlungen arbeitet: Backfill, Host-Name-Maps, offene Pial-Patches
und Null-Normalen-Behandlung. Diese Begriffe dürfen nicht als “Fallback bleibt
halt drin” gelesen werden. Der Code soll seine Methodik beim Namen nennen.

Separat steht im Alignment-Hierarchy-JSON ein sichtbares Label
`Legacy-Fasertrakte (vor HCP1065)`. Das ist eine Datenaltlast und darf nicht als
aktueller Strukturbaum-Name bleiben.

## 2. Scope

### In-Scope

- `scripts/atlas/*` Fallback-Begriffe in aktuelle deterministische
  Methodenbegriffe migrieren.
- `scripts/assets/bodyparts3d/*` Treffer prüfen und nur echte No-Fallback-
  Aussagen stehen lassen.
- `scripts/alignment/learn_brain_hierarchy.json` Legacy-Fasertrakt-Label
  migrieren oder entfernen.
- `docs/ATLAS_*` und `scripts/atlas/README.md` an die neue Semantik anpassen.
- Relevante Atlas-/Config-/Carve-Tests ausführen.

### Out-of-Scope

- Keine neue Atlas-Registrierung und kein Re-Bake von GLB-/Pick-Assets.
- Keine Änderung an TARO-/MNI-BrainModel-Dateien.
- Keine semantische Änderung an validen negativen Tests, die Fallbacks
  ausdrücklich verbieten.
- Keine Performance-Optimierung der Atlas-Pipeline.

## 3. Architektur

Zielbegriffe:

1. Backfill bleibt Backfill, aber nicht als Fallback.
2. Name-Fallback wird zu Name-basierter Lappenauflösung für Areale ohne
   Carve-Host.
3. Open-DoubleSide-Patch-Fallback wird zu offenem Pial-Patch-Modus.
4. Zentroid-Affine-Fallback wird zu globaler Zentroid-Affine-Review-Projektion.
5. Null-Normalen-Fallback wird zu deterministischer Normalen-Ersatzkette.
6. Legacy-Fasertrakte werden zu historischen/archivierten Fasertrakten oder
   aus aktueller Hierarchie entfernt.

## 4. Test-Strategie

- `node --test scripts/atlas/build-config.test.mjs`
- `node --test scripts/atlas/carve_cut.test.mjs`
- `node --test scripts/atlas/build-catalog.test.mjs`
- Wenn verfügbar und ohne externe Daten lauffähig: Topologie-/Catalog-Checks.
- `pnpm --dir apps/brain-app docs:drift`
- `git diff --check`
- Abschluss-`rg` aus NF-009 gegen den Scope.

## 5. Pflichtlektuere

- `CLAUDE.md`
- `scripts/atlas/README.md`
- `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
- `scripts/alignment/learn_brain_hierarchy.json`
- `scripts/atlas/lobe-map.json`
- `scripts/atlas/build_watertight_atlas.py`
- `scripts/atlas/bake_raw_atlas.mjs`
- `scripts/atlas/carve_cut.mjs`
