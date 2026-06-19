---
outcome:
  user_signal: |
    Release-Review sieht für jede Dependency-Deprecated-Warnung eine frische,
    nachvollziehbare Quelle und keinen unklaren Altlastenstatus.
  observable_in: |
    apps/brain-app/package.json, pnpm-lock.yaml, NF-010-Inventurzeile und
    Contract-Evidence aus Install/Test/Browser-Ausgaben.
  guardrail: |
    Keine breite Paketaktualisierung und kein neues Runtime-Risiko ohne grüne
    Repo-Gates und explizite Quelle.
  read_horizon: |
    Direkt nach Dependency-Entscheidung, Verifikation, ALRAH-Eval und vor
    Dart-Abschlusskommentar.
---

# Akzeptanzkriterien — Dependency-Deprecated-Hinweise klären

> Contract-ID: `2026-06-19-dependency-deprecated-hinweise`
> Revision: v1 (2026-06-19)

## C1 — Frische Install-Quelle
- Szenario: Dependencies werden aus aktuellem Lockfile installiert.
  - Input: `pnpm --dir apps/brain-app install --frozen-lockfile`.
  - Erwartet: Exit 0; jede Deprecated-Warnung aus der Ausgabe ist im
    Contract-Evidence mit Paketname und Owner klassifiziert.

## C2 — Frische Test-Quelle
- Szenario: Tests laufen gegen den aktuellen Dependency-Graph.
  - Input: `pnpm --dir apps/brain-app test`.
  - Erwartet: Exit 0; falls Test-Ausgabe Deprecated-Warnungen enthält, sind sie
    mit Quelle klassifiziert.

## C3 — Browser-Warnung
- Szenario: Vite-App rendert eine Route, die NF-007-Warnung reproduziert hat.
  - Input: Playwright öffnet mindestens `/?mode=explore`.
  - Erwartet: `THREE.Clock` ist entweder durch Upgrade verschwunden oder
    weiterhin mit konkreter Dependency-Version dokumentiert.

## C4 — Upgrade-Entscheidung
- Szenario: eine direkte Dependency verursacht eine Deprecated-Warnung.
  - Input: Paketversionen aus `package.json`, `pnpm why` und Registry-/Outdated-
    Vergleich.
  - Erwartet: Es gibt exakt eine Entscheidung: gezielt upgraden mit Gates,
    separater Major-Migration-Task, oder kein sicherer aktueller Fix mit
    Begründung und Owner.

## C5 — Negativfall breite Updates
- Szenario: `pnpm outdated` zeigt mehrere veraltete Pakete.
  - Input: Liste direkter Dependencies.
  - Erwartet: NF-010 aktualisiert nur Pakete, die zur frischen Warnung gehören,
    oder dokumentiert bewusst keinen Update-Diff.

## C6 — Repo-Gates
- Szenario: NF-010 endet mit Paket-/Lockfile- oder Dokuänderung.
  - Input: mindestens `pnpm --dir apps/brain-app docs:drift` und
    `git diff --check`; bei Paket-/Runtime-Änderung zusätzlich `test`,
    `typecheck`, `build` und `verify:brain-models`.
  - Erwartet: Alle tatsächlich relevanten Gates beenden mit Exit 0.
