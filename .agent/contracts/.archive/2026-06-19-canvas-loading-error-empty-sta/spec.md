---
title: Canvas Loading Error Empty State releasefaehig machen
type: feature
task: tLMwOp54qQph
---

# Spec — Canvas Loading Error Empty State releasefaehig machen

> Contract-ID: `2026-06-19-canvas-loading-error-empty-sta`
> Revision: v1 (2026-06-19)
> Status: planning -> active nach plan-done

---

## Frame

```yaml
problem: |
  Der regulaere BrainModel-Canvas nutzt noch Suspense fallback null. Beim Laden
  oder Fehlern im 3D-Layer entsteht dadurch ein stiller Viewport ohne erklaerten
  Zustand.
why_now: |
  Die Release-/V2-Readiness-Doku markiert genau diesen Zustand als Blocker fuer
  den naechsten Code-Slice. PR #35 ist technisch gruen, aber dieser Runtime-
  Vertrag bleibt als Release-Haerte offen.
symptom_vs_problem: |
  Symptom = der Canvas ist waehrend GLB-Laden oder Layer-Fehlern leer. Problem =
  kein viewport-lokaler Loading-/Error-Vertrag; die globale App Error Boundary
  ist zu grob und erklaert den 3D-Bereich nicht.
smallest_change: |
  Den regulaeren Canvas-Suspense-Fallback durch ShellStateBlock ersetzen und
  eine kleine Canvas-ErrorBoundary um die asynchronen 3D-Kinder legen.
tradeoffs: |
  Kein komplettes V2-Redesign und kein Atlas-Canvas-Umbau in diesem Slice. Eine
  kuenstliche Production-Error-Injection wird verworfen; der Vertrag wird ueber
  Unit-Tests und bestehende Browser-Smokes belegt.
```

---

## Working Principles

1. **Think First** — der Frame oben begrenzt den Slice.
2. **Simplicity** — bestehende `ShellStateBlock`-Primitive verwenden.
3. **Surgical** — keine Shell-/Mode-Architektur umbauen.
4. **Goal-Driven** — Kriterien in `criteria.md` müssen mit Tests oder Smokes
   belegt werden.

## Problem

Das Unified-Learning-Readiness-Gate blockiert den nächsten V2-Code-Slice, weil
der reguläre TARO-/BrainModel-Canvas-Pfad noch `Suspense fallback={null}` nutzt.
Während GLB-Assets laden oder ein R3F-Kind wirft, sieht der Nutzer lokal im
Viewport keinen nachvollziehbaren Zustand. Die app-weite Error Boundary ist zu
grob, weil sie den ganzen Mount ersetzt und nicht erklärt, welcher 3D-Bereich
betroffen ist.

## Ziel

Der reguläre 3D-Viewport bekommt einen sichtbaren, wiederverwendbaren
Loading-State und einen viewport-lokalen Error-State. Der Canvas darf beim
regulären BrainModel-Pfad keinen stillen Null-Fallback mehr nutzen.

## Scope

1. `BodyParts3DViewer.tsx`: `Suspense fallback={null}` im regulären Canvas-Pfad
   ersetzen.
2. Viewport-lokale Error Boundary für Canvas-Inhalte ergänzen.
3. Bestehende `ShellStateBlock`-Primitive nutzen statt neue UI-Sprache zu
   erfinden.
4. Testabdeckung ergänzen, die die neue Canvas-State-Komponente prüft.
5. Readiness-Doku aktualisieren, wenn der Blocker geschlossen ist.

## Nicht-Ziele

1. Kein vollständiges V2-Shell-Redesign.
2. Kein Umbau des Atlas-Canvas-Zweigs.
3. Kein künstlicher Error-Injection-Modus in Production.
4. Kein Abschluss des gesamten `tLMwOp54qQph`-Epics.

## Risiken

1. R3F-Fehlergrenzen dürfen nicht den Canvas selbst entfernen, wenn nur ein
   geladenes Kind scheitert.
2. Loading-State darf die bestehenden E2E-Canvas-Smokes nicht destabilisieren.
3. UI-Strings bleiben ohne Umlaute, weil sie im Code-Artefakt liegen.
