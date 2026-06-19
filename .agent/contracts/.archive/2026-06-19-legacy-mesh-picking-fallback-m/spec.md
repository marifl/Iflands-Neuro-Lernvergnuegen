---
title: Legacy-Mesh-Picking-Fallback migrieren
type: fix
task: E7CfpLJUiG6R
---

# Spec — Legacy-Mesh-Picking-Fallback migrieren

## Frame

```yaml
problem: |
  CutPickBridge und viewerStore verwenden pickTargetFromLegacyMeshName als
  stillen Ersatz, wenn ein Mesh oder eine Auswahl-ID keinen aktuellen
  ObjectGraph-/SequenceTargetRef-Vertrag traegt.
why_now: |
  NF-003 blockiert den No-Fallback-Parent und damit das V2-Readiness-Gate.
  Gerade fuer Pinpoint-, Atlas- und BrainModel-Arbeit darf Picking nicht von
  impliziten alten Meshnamen-Fallbacks abhaengen.
symptom_vs_problem: |
  Symptom sind der Begriff Legacy-Hirn-Picks und der Fallback-Call im Raycast.
  Das Problem ist, dass pickbare Meshes nicht garantiert mit aktuellem
  TargetRef-UserData markiert werden.
smallest_change: |
  Ontologie-Meshnamen beim Laden explizit in sequenceTargetUserData
  uebersetzen, den Raycast nur noch ueber resolvePickTargetFromObject laufen
  lassen und Store-Name-APIs auf einen aktuellen Ontologie-MeshName-Vertrag
  umbenennen.
tradeoffs: |
  Kein ObjectGraph-Registry-Neubau und keine neue Pick-Architektur. Die
  bestehenden Meshnamen bleiben als aktueller Ontologie-MeshName-Vertrag
  erhalten, aber nicht als Legacy-Fallback.
```

## Scope

1. `apps/brain-app/src/viewer/targetPicking.ts`
2. `apps/brain-app/src/viewer/targetPicking.test.ts`
3. `apps/brain-app/src/viewer/CutPickBridge.tsx`
4. `apps/brain-app/src/viewer/viewerStore.ts`
5. `apps/brain-app/src/viewer/viewerStore.test.ts`
6. `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
7. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`

## Nicht-Ziele

1. Keine neue globale ObjectGraph-Registry.
2. Keine Änderung von Atlas-Carve-Picking.
3. Kein Umbau von Authoring-/Manifest-Asset-Picking.
4. Keine Änderung der Auswahlsemantik zwischen `direct` und `group`.

## Zielzustand

Migriert: Pickbare Brain-/Kontext-Meshes tragen aktuelle
`sequenceTargetUserData`. `CutPickBridge` akzeptiert nur noch Treffer, die über
UserData oder Parent-UserData auflösbar sind. Der Store darf weiterhin
programmatisch nach Ontologie-Meshnamen auswählen, aber nicht über einen
Legacy-Fallback-Begriff oder einen unmarkierten Raycast-Pfad.

## Verifikation

1. Red-Test belegt, dass der alte Legacy-Fallback noch existiert.
2. Focused Vitest für `targetPicking` und `viewerStore` läuft grün.
3. Typecheck läuft grün.
4. Abschluss-`rg` zeigt keine produktiven Treffer für
   `pickTargetFromLegacyMeshName` oder `Legacy-Hirn-Picks`.
