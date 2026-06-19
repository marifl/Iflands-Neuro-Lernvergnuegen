---
outcome:
  user_signal: |
    Der Release-Blocker "Suspense fallback=null" ist im regulären Canvas-Pfad
    geschlossen und über Tests/Smokes belegbar.
  observable_in: |
    BodyParts3DViewer, Shell-State-Test, Readiness-Doku, Playwright/Build-Gates.
  guardrail: |
    Keine neue Shell-Architektur und kein stiller Ersatzpfad.
  read_horizon: |
    Vor jeder weiteren V2-UI-Code-Migration.
---

# Akzeptanzkriterien

## C1 — Kein stiller Suspense-Null-Fallback im regulären Canvas

Szenario: Der reguläre BrainModel-Canvas rendert asynchron geladene GLB-Layer.

Erwartet: Der Suspense-Fallback ist ein sichtbarer `ShellStateBlock` mit
`role=status` und nicht `null`.

## C2 — Canvas-Fehler bleiben viewport-lokal

Szenario: Ein Kind im regulären Canvas-Pfad wirft während des Renderns.

Erwartet: Die Error Boundary rendert einen `ShellStateBlock` mit `role=alert`
und nachvollziehbarem Grund. Die App muss nicht auf eine globale White-Screen-
oder Root-Boundary ausweichen.

## C3 — Tests decken State-Vertrag ab

Szenario: Unit-Tests laufen für die Shell-State-/Canvas-State-Komponenten.

Erwartet: Ein Test belegt Loading- und Error-State mit Rollen, Texten und
sichtbarer Detailmeldung.

## C4 — Readiness-Doku widerspricht dem Code nicht mehr

Szenario: `docs/specs/unified-learning-mode-readiness.md` wird gelesen.

Erwartet: Das Canvas-State-Kriterium steht nicht mehr auf `FAIL`; die Grenze
bleibt klar, dass der vollständige Unified-Mode-Code-Slice noch separat ist.

## C5 — Release-Gates bleiben grün

Szenario: Der PR wird erneut verifiziert.

Erwartet: Mindestens `typecheck`, relevante Unit-Tests, `build`,
`perf:budget`, vollständige Playwright-Suite und GitHub `brain-app / verify`
laufen grün.
