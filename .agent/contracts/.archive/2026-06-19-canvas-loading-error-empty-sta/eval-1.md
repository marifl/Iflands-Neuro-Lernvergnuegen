---
contract: 2026-06-19-canvas-loading-error-empty-sta
round: 1
verdict: pass
scores:
  - criterion: "C1 Kein stiller Suspense-Null-Fallback im regulaeren Canvas"
    score: 5
    note: "BodyParts3DViewer nutzt CanvasStateHtml als sichtbaren Suspense-Fallback; rg findet fallback null nur noch als Doku-Hinweis."
  - criterion: "C2 Canvas-Fehler bleiben viewport-lokal"
    score: 5
    note: "CanvasContentErrorBoundary rendert CanvasStateHtml mit role=alert und setzt sich bei BrainModel-Wechsel ueber resetKey zurueck."
  - criterion: "C3 Tests decken State-Vertrag ab"
    score: 5
    note: "CanvasViewportState.test.tsx prueft Loading role=status und Error role=alert mit sichtbarer Detailmeldung."
  - criterion: "C4 Readiness-Doku widerspricht dem Code nicht mehr"
    score: 5
    note: "docs/specs/unified-learning-mode-readiness.md markiert den Canvas-State-Vertrag als PASS und grenzt das grosse Zustands-Epic weiter ab."
  - criterion: "C5 Release-Gates bleiben gruen"
    score: 5
    note: "Lokal gruen: typecheck, test, build, perf:budget, verify:brain-models, docs:drift, Playwright 30/30, git diff --check. GitHub brain-app/verify gruen auf e42da4f."
summary: |
  Der konkrete Release-Blocker `Suspense fallback={null}` im regulaeren
  BrainModel-Canvas ist geschlossen. Loading und Renderfehler erscheinen als
  Shell-State im 3D-Viewport; der groessere V2-Zustands-Epic bleibt offen, ist
  aber nicht mehr durch diesen Canvas-State-Blocker blockiert.
---
