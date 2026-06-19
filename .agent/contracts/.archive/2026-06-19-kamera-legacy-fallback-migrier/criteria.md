---
outcome:
  user_signal: |
    NF-001 kann geschlossen werden, weil der Kamera-Pfad keinen Legacy- oder
    Shot-Fallback-Endzustand mehr akzeptiert.
  observable_in: |
    apps/brain-app/src/scene/cameraRigConfig.ts,
    apps/brain-app/src/scene/cameraResolve.ts,
    apps/brain-app/src/scene/CameraRig.tsx und die zugehörigen Tests.
  guardrail: |
    Keine Source legacy, kein legacyCameraConfig-Input und kein fallbackShot im
    Produktcode. Scene-JSON brain.camera bleibt nur als explizite Scene-Kamera
    erhalten.
  read_horizon: |
    Vor Schließen von Dart-Task vACjRDOH2EFc und vor erneutem Bewerten des
    V2-Readiness-Gates.
---

# Criteria

## Akzeptanz

1. `CameraConfigSource` enthält nur aktuelle Quellen.
2. `selectCameraRigConfig` akzeptiert keinen `legacyCameraConfig`-Input mehr.
3. `CameraRig` erzeugt kein `legacyCameraConfig` mehr.
4. `resolveCameraTarget` akzeptiert keinen `fallbackShot` mehr.
5. Ein leerer Kamera-Config-Resolver-Pfad wirft laut wegen fehlendem
   `camera.shot`.
6. `sceneStore.cameraShot` bleibt nur als expliziter Scene-Vertrag erhalten
   und wird vor dem Resolver in `ConfigCamera` übersetzt.
7. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` markiert NF-001 als migriert
   und nennt die tatsächlich gelaufenen Checks.

## Checks

1. `pnpm --dir apps/brain-app exec vitest run src/scene/cameraRigConfig.test.ts src/scene/cameraResolve.test.ts src/scene/CameraRig.test.tsx`
2. `pnpm --dir apps/brain-app typecheck`
3. `rg -n -e "legacyCameraConfig" -e "fallbackShot" -e "CameraConfigSource = 'legacy'" apps/brain-app/src`

## Risiken

1. Scene-JSONs mit `brain.camera` dürfen nicht funktionslos werden; sie müssen
   als explizite Scene-Kamera weiter wirken.
2. URL-Config-Kameras müssen weiterhin Vorrang haben, damit Review- und
   Unterrichtslinks reproduzierbar bleiben.
3. `cameraView`-One-Shot darf weiter mit globalen Bounds funktionieren.
