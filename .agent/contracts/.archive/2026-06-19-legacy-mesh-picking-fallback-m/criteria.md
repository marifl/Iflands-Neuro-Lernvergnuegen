---
outcome:
  user_signal: |
    NF-003 kann geschlossen werden, weil Picking keinen Legacy-Meshnamen-
    Fallback mehr benoetigt.
  observable_in: |
    targetPicking, CutPickBridge, viewerStore, BodyParts3DViewer und die
    zugehoerigen Tests.
  guardrail: |
    Kein pickTargetFromLegacyMeshName, kein Legacy-Hirn-Picks-Begriff und kein
    Raycast-Fallback von Object3D auf rohen Meshnamen.
  read_horizon: |
    Vor Schliessen von Dart-Task E7CfpLJUiG6R und vor erneutem Bewerten des
    V2-Readiness-Gates.
---

# Kriterien

## C1 Aktueller Ontologie-MeshName-Vertrag ist benannt

`targetPicking.ts` stellt einen aktuellen, nicht als Legacy bezeichneten Helper
für Ontologie-Meshnamen bereit.

## C2 Pickbare BodyParts3D-Meshes tragen Target-UserData

`BodyParts3DViewer.tsx` markiert Brain-/Kontext-Meshes beim Laden mit
`sequenceTargetUserData`, sodass Raycast-Picks über `resolvePickTargetFromObject`
auflösbar sind.

## C3 CutPickBridge hat keinen Meshnamen-Fallback

`CutPickBridge.tsx` ruft nicht mehr `pickTargetFromLegacyMeshName(mesh.name)`
auf.

## C4 ViewerStore nutzt keinen Legacy-Begriff

`viewerStore.ts` nutzt für programmatische Meshnamen-Auswahl den aktuellen
Ontologie-MeshName-Helper; Tests nennen keinen Legacy-Endzustand.

## C5 Inventur ist synchron

`docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` markiert NF-003 als migriert und
nennt die tatsächlich gelaufenen Checks.

## Checks

1. `pnpm --dir apps/brain-app exec vitest run src/viewer/targetPicking.test.ts src/viewer/viewerStore.test.ts src/viewer/cutPickTargets.test.ts src/viewer/cutPick.test.ts`
2. `pnpm --dir apps/brain-app typecheck`
3. `rg -n -e "pickTargetFromLegacyMeshName" -e "Legacy-Hirn-Picks" apps/brain-app/src`
