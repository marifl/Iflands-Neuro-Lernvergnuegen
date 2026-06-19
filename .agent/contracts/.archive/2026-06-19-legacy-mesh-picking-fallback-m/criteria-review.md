# Criteria Review

Datum: 19. Juni 2026

Status: PASS

Die Kriterien sind testbar und ausreichend eng für NF-003.

1. C1-C4 decken die relevanten produktiven Legacy-Stellen ab:
   `targetPicking.ts`, `CutPickBridge.tsx`, `viewerStore.ts` und die
   UserData-Markierung in `BodyParts3DViewer.tsx`.
2. C2 verhindert eine reine Umbenennung ohne Runtime-Vertrag: pickbare Meshes
   müssen `sequenceTargetUserData` tragen.
3. C3 verhindert den alten Raycast-Fallback auf `mesh.name`.
4. C4 erlaubt programmatische Auswahl nach Ontologie-Meshnamen, aber ohne
   Legacy-Begriff.
5. Die Checks enthalten Focused Vitest, Typecheck und Abschluss-`rg`.

Keine Nachschärfung erforderlich.
