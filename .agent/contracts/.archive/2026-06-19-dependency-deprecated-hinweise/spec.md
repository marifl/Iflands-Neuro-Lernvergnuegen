# Spec — Dependency-Deprecated-Hinweise klären

> Contract-ID: `2026-06-19-dependency-deprecated-hinweise`
> Revision: v1 (2026-06-19)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  Release-Review sieht externe Deprecated-Warnungen, kann aber ohne frische
  Zuordnung nicht entscheiden, ob App-Code, direkte Dependencies oder
  transitive Pakete handeln müssen.
why_now: |
  NF-007 hat die Browser-Warnung `THREE.Clock` frisch als
  @react-three/fiber/three-Dependency-Klasse klassifiziert und die Inventur
  hält NF-010 als verbliebenen Release-Blocker.
symptom_vs_problem: |
  Symptom = Install-/Browser-/Lockfile-Deprecated-Hinweise. Problem = unklare
  Ownership und kein dokumentierter Upgrade- oder Akzeptanzpfad.
smallest_change: |
  Frische Install-, Test- und Browser-Ausgaben erfassen, jede Warnung Quelle
  und Owner zuordnen und nur ein risikoarmes Dependency-Upgrade durchführen,
  wenn es die Warnung behebt und die Repo-Gates grün bleiben.
tradeoffs: |
  Keine breitflächige Paketaktualisierung nur für kosmetische Warnungen.
  Kein Ignorieren externer Warnungen ohne Version, Quelle und Follow-up-Pfad.
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

NF-010 soll verhindern, dass externe Deprecated-Hinweise als undefinierte
Release-Altlast bleiben. Die frische NF-007-Evidenz zeigt:
`@react-three/fiber@9.6.1` erzeugt intern `clock: new Clock()` mit
`three@0.184.0`; Browser-Smokes zeigen deshalb `THREE.Clock: This module has
been deprecated`.

Zusätzlich enthält `apps/brain-app/pnpm-lock.yaml` mindestens einen
Deprecated-Hinweis. Diese Klasse wird nicht durch alte Artefakte bewertet,
sondern durch frische `pnpm install --frozen-lockfile`, `pnpm test` und Browser-
Ausgaben.

## 2. Scope

### In-Scope

- Frische `pnpm --dir apps/brain-app install --frozen-lockfile`-Ausgabe.
- Frische `pnpm --dir apps/brain-app test`-Ausgabe.
- Browser-Konsole für mindestens eine Route, die NF-007-Warnung reproduziert.
- `pnpm outdated`/Registry-Vergleich für direkte 3D-/Router-Dependencies, falls
  ein Upgrade naheliegt.
- Enges Dependency-Upgrade nur für die klar betroffene Klasse, wenn kompatibel
  und verifizierbar.
- Aktualisierung der NF-010-Zeile in `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`.

### Out-of-Scope

- Monorepo-/Workspace-Umbau oder neue Paketmanager-Struktur.
- Migration auf eine neue React-Router-Major-Version, solange nur Future-Flag-
  Warnungen auftreten und das separat risikobehaftet wäre.
- Breites `pnpm update --latest` ohne Release-spezifischen Nutzen.
- App-Code-Refactors außerhalb nachgewiesener Deprecated-Quellen.

## 3. Architektur

Entscheidungslogik:

1. App-Code-Warnung: Code migrieren und fokussiert testen.
2. Direkte Dependency-Warnung mit verfügbarer kompatibler Version: gezielt
   upgraden, Lockfile aktualisieren, Tests/Build/Browser-Smoke laufen lassen.
3. Transitive Dependency-Warnung ohne sichere direkte Lösung: Quelle und
   Owner dokumentieren; separaten Upgrade-Pfad in NF-010 oder Dart offenhalten.
4. Historisches Artefakt: entfernen oder als historisch klassifizieren.

## 4. Test-Strategie

- `pnpm --dir apps/brain-app install --frozen-lockfile`
- `pnpm --dir apps/brain-app test`
- Browser-Konsole mit `@playwright/test` gegen laufenden Vite-Server
- Bei Dependency-Upgrade zusätzlich:
  - `pnpm --dir apps/brain-app typecheck`
  - `pnpm --dir apps/brain-app build`
  - `pnpm --dir apps/brain-app run verify:brain-models`
  - relevanter Browser-Smoke, mindestens die Route aus NF-007

## 5. Pflichtlektuere

- `CLAUDE.md`
- `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
- `docs/ARCHITECTURE.md`
- `apps/brain-app/package.json`
- `apps/brain-app/pnpm-lock.yaml`
- `.agent/contracts/.archive/2026-06-19-deprecated-browser-konsole-fri/console-smoke.md`
