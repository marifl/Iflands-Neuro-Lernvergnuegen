---
outcome:
  user_signal: |
    Die Basalganglien-Vertiefung im Zusammenfassungs-Step bleibt bedienbar,
    ist aber nicht mehr über einen Legacy-Animationsadapter verdrahtet.
  observable_in: |
    `apps/brain-app/src/viewer/AnimationPlayer.tsx`,
    `apps/brain-app/src/viewer/animationSystem.ts`,
    `apps/brain-app/src/viewer/contractValidation.ts` und die fokussierten
    Vitest-Suites.
  guardrail: |
    AuthoringScene-ClipBindings müssen weiter auflösbar bleiben; unbekannte
    Timeline-Animation-Bindings müssen weiter laut fehlschlagen.
  read_horizon: |
    Sofort im Contract-Run und danach bei jedem `pnpm test` beziehungsweise
    `pnpm typecheck` im App-Paket.
---

# Akzeptanzkriterien — Animation-Legacy auf Timeline-Registry migrieren

> Contract-ID: `2026-06-19-animation-legacy-auf-timeline-`
> Revision: v1 (2026-06-19)

Jedes Kriterium MUSS binaer testbar sein (Pass/Fail). Keine vagen Begriffe
("appropriate", "robust", "clean"). Konkrete, messbare Aussagen.

Formuliere jedes Kriterium als konkretes Input/Erwartet-Paar, damit Tests aus den
Kriterien abgeleitet werden (nicht aus dem Code). Mindestens ein Negativ-/Fehlerfall.

## C1 — Basalganglien-Timeline ist aktueller Vertrag
- Szenario: Die registrierte Basalganglien-Animation wird als Timeline gelesen.
  - Input: Fokus-Test für die Basalganglien-Timeline.
  - Erwartet: `timelineId` ist nicht `legacy-*`, `clipId` ist nicht
    `legacy:*`, Binding-Art ist nicht `legacy-highlight`, und
    `ontologyNodeTargetsForTimelineStep(...)` liefert dieselben Ontologie-
    Targets wie bisher.

## C2 — Legacy-Resolve-Kontext ist entfernt
- Szenario: Timeline-Bindings werden ohne `legacyAnimations`-Context validiert.
  - Input: `rg -n "legacyAnimations|legacy-highlight|legacy:" apps/brain-app/src/viewer apps/brain-app/src/scene`
  - Erwartet: Keine Treffer in aktuellen Runtime-/Test-Dateien.

## C3 — AuthoringScene-ClipBindings bleiben grün
- Szenario: Device-/GLTF-ClipBinding wird über AuthoringScene aufgelöst.
  - Input: `pnpm --dir apps/brain-app exec vitest run src/viewer/animationSystem.test.ts`
  - Erwartet: Der Test für `bindingKind: "authoring-clip"` bleibt grün und
    liefert dieselbe `targetRef`/`objectGraphId`.

## C4 — Unbekannte Timeline-Bindings bleiben fail-loud
- Szenario: Eine Timeline referenziert ein nicht registriertes Binding.
  - Input: `pnpm --dir apps/brain-app exec vitest run src/viewer/contractValidation.test.ts`
  - Erwartet: Fehler enthält `bindingId "... " mit clipId "... " ist nicht definiert`.

## C5 — Doku- und Inventurvertrag sind aktuell
- Szenario: Aktuelle Architektur- und No-Fallback-Doku wird nach der Migration
  gelesen.
  - Input: `docs/ARCHITECTURE.md` und
    `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`.
  - Erwartet: NF-002 ist als migriert beschrieben; `AnimationPlayer.tsx` wird
    nicht mehr als Legacy-Pfad legitimiert.
