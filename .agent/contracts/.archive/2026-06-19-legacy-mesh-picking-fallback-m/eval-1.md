---
contract: 2026-06-19-legacy-mesh-picking-fallback-m
round: 1
verdict: pass
scores:
  - criterion: "C1 Aktueller Ontologie-MeshName-Vertrag ist benannt"
    score: 5
    note: "`pickTargetFromOntologyMeshName` und `ontologyMeshTargetUserData` ersetzen den Legacy-Helper."
  - criterion: "C2 Pickbare BodyParts3D-Meshes tragen Target-UserData"
    score: 5
    note: "`BodyParts3DViewer` ruft `attachOntologyMeshTarget` beim Laden von Brain-, Skull-, Head- und Atlas3D-Meshes auf."
  - criterion: "C3 CutPickBridge hat keinen Meshnamen-Fallback"
    score: 5
    note: "`targetForHit` nutzt nur noch `resolvePickTargetFromObject(mesh)`."
  - criterion: "C4 ViewerStore nutzt keinen Legacy-Begriff"
    score: 5
    note: "`viewerStore` nutzt den aktuellen Ontologie-MeshName-Helper; Tests nennen Ontologie-Mesh-Picks statt Legacy-Hirn-Picks."
  - criterion: "C5 Inventur ist synchron"
    score: 5
    note: "NF-003 ist als migriert markiert und nennt Focused Vitest, Typecheck und Abschluss-rg."
summary: |
  PASS. Der Mesh-Picking-Fallback ist migriert: pickbare Meshes tragen
  Target-UserData, der Raycast faellt nicht mehr auf rohe Meshnamen zurueck,
  und programmatische Store-Picks nutzen den aktuellen Ontologie-MeshName-
  Vertrag. Verifiziert mit Red-Test, Focused Vitest, Typecheck, docs:drift,
  Full Test Suite, Production-Build und git diff --check.
---

# Evidenz

1. Red-Test vor Implementierung:
   `pnpm --dir apps/brain-app exec vitest run src/viewer/targetPicking.test.ts src/viewer/viewerStore.test.ts`
   -> erwartbar rot, fehlende Funktionen `pickTargetFromOntologyMeshName` und
   `ontologyMeshTargetUserData`.
2. Focused Vitest:
   `pnpm --dir apps/brain-app exec vitest run src/viewer/targetPicking.test.ts src/viewer/viewerStore.test.ts src/viewer/cutPickTargets.test.ts src/viewer/cutPick.test.ts`
   -> 4 Dateien, 46 Tests grün.
3. Resttreffer:
   `rg -n -e "pickTargetFromLegacyMeshName" -e "Legacy-Hirn-Picks" apps/brain-app/src`
   -> keine Treffer, Exit 1.
4. Typecheck:
   `pnpm --dir apps/brain-app typecheck` -> Exit 0.
5. Doku-Drift:
   `pnpm --dir apps/brain-app docs:drift` -> Exit 0.
6. Voller Testlauf:
   `pnpm --dir apps/brain-app test` -> 82 Dateien, 442 Tests grün.
7. Production-Build:
   `pnpm --dir apps/brain-app build` -> Exit 0.
8. Whitespace:
   `git diff --check` -> Exit 0.
