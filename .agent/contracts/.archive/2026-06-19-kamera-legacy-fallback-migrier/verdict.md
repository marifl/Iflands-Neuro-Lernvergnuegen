---
contract: 2026-06-19-kamera-legacy-fallback-migrier
round: 1
verdict: pass
scores:
  - criterion: "C1 CameraConfigSource enthaelt nur aktuelle Quellen"
    score: 5
    note: "`CameraConfigSource` ist auf `figure | scene` reduziert; kein `legacy`-Wert im Produktcode."
  - criterion: "C2 selectCameraRigConfig akzeptiert keinen legacyCameraConfig-Input"
    score: 5
    note: "Der Input-Typ enthaelt nur noch `effectiveConfig`, `sceneCameraConfig` und `sceneTargetMeshes`; der neue Test prueft `null` statt Legacy-Quelle."
  - criterion: "C3 CameraRig erzeugt kein legacyCameraConfig"
    score: 5
    note: "`CameraRig` uebersetzt `sceneStore.cameraShot` in `currentSceneCameraConfig` und uebergibt keine Legacy-Config mehr."
  - criterion: "C4 resolveCameraTarget akzeptiert keinen fallbackShot"
    score: 5
    note: "`CameraResolveInput` enthaelt keinen `fallbackShot`; fehlender `config.shot` wirft laut."
  - criterion: "C5 Leere Kamera-Config wirft laut"
    score: 5
    note: "`cameraResolve.test.ts` prueft, dass `{}` ohne `shot` mit `camera.shot fehlt` fehlschlaegt."
  - criterion: "C6 Scene-camera bleibt expliziter Vertrag"
    score: 5
    note: "`CameraRig` nutzt `sceneCameraConfig ?? (shot ? { shot } : null)`; vorhandene Scene-JSONs bleiben wirksam, aber nicht als Legacy-Fallback."
  - criterion: "C7 No-Fallback-Inventur ist synchron"
    score: 5
    note: "NF-001 ist als migriert markiert und nennt Focused Vitest, Typecheck und Abschluss-rg."
summary: |
  PASS. Der Kamera-Legacy-Pfad ist migriert: keine Source legacy, kein
  legacyCameraConfig-Input und kein fallbackShot bleiben im Produktcode. Die
  Scene-JSON-Kamera bleibt als explizite Scene-Kamera erhalten. Verifiziert mit
  focused Vitest, vollem App-Testlauf, Typecheck, Production-Build,
  docs:drift, Brain-Model-Gate und git diff --check.
---

# Evidenz

1. Red-Test vor Implementierung:
   `pnpm --dir apps/brain-app exec vitest run src/scene/cameraRigConfig.test.ts src/scene/cameraResolve.test.ts`
   schlug erwartbar fehl: `expected 'legacy' to be null`.
2. Focused Vitest:
   `pnpm --dir apps/brain-app exec vitest run src/scene/cameraRigConfig.test.ts src/scene/cameraResolve.test.ts src/scene/CameraRig.test.tsx`
   -> 3 Dateien, 16 Tests grün.
3. Typecheck:
   `pnpm --dir apps/brain-app typecheck` -> Exit 0.
4. Abschluss-`rg`:
   `rg -n "legacyCameraConfig|fallbackShot|CameraConfigSource = 'legacy'|cameraConfigSource\\)\\.toBe\\('legacy'\\)" apps/brain-app/src`
   -> keine Treffer, Exit 1.
5. Doku-Drift:
   `pnpm --dir apps/brain-app docs:drift` -> Exit 0.
6. Voller Testlauf:
   `pnpm --dir apps/brain-app test` -> 82 Dateien, 441 Tests grün.
7. Brain-Model-Gate:
   `pnpm --dir apps/brain-app verify:brain-models` -> 5 Assets bestanden.
8. Production-Build:
   `pnpm --dir apps/brain-app build` -> Exit 0.
9. Whitespace:
   `git diff --check` -> Exit 0.
