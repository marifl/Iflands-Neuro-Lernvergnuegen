# Spec — Animation-Legacy auf Timeline-Registry migrieren

> Contract-ID: `2026-06-19-animation-legacy-auf-timeline-`
> Revision: v1 (2026-06-19)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  Der einzige produktive AnimationPlayer-Pfad hängt noch an einem Legacy-
  Adapter statt an einem aktuellen Timeline-/Registry-Vertrag.
why_now: |
  Der Release-Parent blockiert bis alle Legacy-/Fallback-Restklassen
  migriert, entfernt oder konkret blockiert sind. NF-002 ist der nächste
  offene Codepfad.
symptom_vs_problem: |
  Symptom = `legacyAnimations`, `legacy-highlight`, `legacy:<id>` und
  Doku-Hinweise auf `AnimationPlayer.tsx` als Legacy-Pfad. Problem = die
  Basalganglien-Animation ist fachlich produktiv, aber noch nicht als
  eigener Timeline-Vertrag registriert.
smallest_change: |
  Die Basalganglien-Schleife als echtes `TimelineDocument` in einer kleinen
  Timeline-Registry führen, `AnimationPlayer` daraus lesen lassen und den
  Legacy-Adapter aus `animationSystem.ts` entfernen.
tradeoffs: |
  Keine generische Timeline-UI in dieser Slice: Der sichtbare Player bleibt
  bewusst klein, damit der Release-Blocker nicht mit Editor-Arbeit vermischt
  wird.
  Keine Umstellung von ERP-/Phineas-Animationen: Diese Pfade haben eigene
  Runtime-Verträge und sind nicht NF-002.
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

NF-002 benennt `legacyAnimations`, `legacy-highlight`, `legacy:<id>` und
`AnimationPlayer` als verbleibende Legacy-/Fallback-Klasse. Live-Code zeigt:

1. `animationSystem.ts` adaptiert `animations.ts` in Timeline-Dokumente mit
   `legacy-*`-IDs.
2. `contractValidation.ts` akzeptiert Timeline-Animationen noch über
   `legacyAnimations: ANIMATIONS`.
3. `AnimationPlayer.tsx` generiert zur Laufzeit aus `BASAL_GANGLIA_LOOP` ein
   Timeline-Dokument.
4. `docs/ARCHITECTURE.md` beschreibt `AnimationPlayer.tsx` noch als
   Legacy-Pfad.

Das widerspricht dem Release-Ziel: Keine aktuelle Runtime-Klasse darf als
Legacy-/Fallback-Endzustand übrig bleiben.

## 2. Scope

### In-Scope

- Basalganglien-Schleife als aktuelles `TimelineDocument` definieren.
- Kleine Timeline-Registry mit Lookup für den Player und die Contract-
  Validierung.
- `animationSystem.ts` auf reine Timeline-/AuthoringScene-ClipBinding-
  Auflösung reduzieren.
- `AnimationPlayer.tsx` so umstellen, dass er ein registriertes
  TimelineDocument rendert.
- Tests und Doku an den neuen Vertrag angleichen.

### Out-of-Scope

- Keine neue Timeline-Editor-UI.
- Keine neue 3D-Mixer-Runtime für GLTF-Clips.
- Keine Änderung an ERP-Animationen oder Phineas-Stangenanimation.
- Keine Änderung an Szene-Sequenzen oder Registry-Launch-URL-Verhalten.

## 3. Architektur

Vorgesehene Struktur:

1. `animations.ts` wird entweder zur aktuellen Timeline-Registry migriert oder
   durch eine neue Registry-Datei ersetzt, falls das weniger invasiv ist.
2. `AnimationPlayer.tsx` erhält ein `timelineId`-basiertes Default-Document
   statt `BASAL_GANGLIA_LOOP` direkt zu adaptieren.
3. `animationSystem.ts` bleibt für `resolveTimelineAnimationBindings(...)`,
   `assertTimelineAnimationBindings(...)` und
   `ontologyNodeTargetsForTimelineStep(...)` zuständig, aber kennt keine
   Legacy-Animationsliste mehr.
4. `contractValidation.ts` validiert Timelines gegen AuthoringScene-ClipBindings
   plus registrierte Timeline-Bindings.

## 4. Test-Strategie

- Red-Test: Fokus-Tests zeigen vor der Migration noch `legacy-*`-Erwartungen
  oder akzeptieren Legacy-Context.
- Unit: `animationSystem.test.ts` muss registrierte Timeline-Bindings und
  AuthoringScene-ClipBindings abdecken.
- Contract: `contractValidation.test.ts` muss unbekannte Animation-Bindings
  weiter fail-loud melden.
- UI: `OverlayPanel.test.tsx` bleibt grün; Player wird weiterhin im
  Zusammenfassungs-Step eingebunden.
- Such-Gate: aktuelle Code-/Doku-Pfade enthalten keine `legacyAnimations`,
  `legacy-highlight`, `legacy:<id>` oder `AnimationPlayer.tsx` als Legacy-
  Vertrag.

## 5. Pflichtlektuere

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
- `apps/brain-app/src/viewer/animationSystem.ts`
- `apps/brain-app/src/viewer/animationSystem.test.ts`
- `apps/brain-app/src/viewer/contractValidation.ts`
- `apps/brain-app/src/viewer/AnimationPlayer.tsx`
- `apps/brain-app/src/scene/overlays/OverlayPanel.tsx`
