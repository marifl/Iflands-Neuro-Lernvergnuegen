---
title: Kamera-Legacy-Fallback migrieren
task: vACjRDOH2EFc
date: 2026-06-19
---

# Spec

## Frame

```yaml
problem: |
  Der Kamera-Pfad hat noch einen stillen Legacy-Vertrag. CameraRig wandelt
  sceneStore.cameraShot in legacyCameraConfig um, selectCameraRigConfig meldet
  die Source legacy, und resolveCameraTarget akzeptiert fallbackShot. Damit
  kann ein altes scene.brain.camera-Feld als aktueller Vertrag weiterleben,
  obwohl die App inzwischen file-first ConfigCamera aus Scene- und
  Configuration-Daten besitzt.
why_now: |
  ZwvSdKghcAmK blockiert das V2-Readiness-Gate. NF-001 ist der erste noch
  offene High-Priority-Codepfad in der No-Fallback-Inventur.
symptom_vs_problem: |
  Symptom sind die Namen legacyCameraConfig, fallbackShot und Source legacy.
  Das Problem ist die unklare Prioritätskette figure > scene > legacy, die
  einen nicht mehr aktuellen Kamera-Vertrag als stillen Ersatz akzeptiert.
smallest_change: |
  sceneStore.cameraShot wird nur noch als expliziter Scene-Kamera-Vertrag
  modelliert, nicht als Legacy-Fallback. Der Resolver erwartet einen
  ConfigCamera mit shot oder pose; ohne explizite Kamera wirft er laut.
tradeoffs: |
  Keine neue Kamera-Authoring-API und keine Änderung der Shot-Geometrie. Der
  bisherige Scene-Shot bleibt wirksam, aber als aktuelle Scene-Kamera statt als
  Legacy-Pfad.
```

Problem: Der Kamera-Pfad hat noch einen stillen Legacy-Vertrag. `CameraRig`
wandelt `sceneStore.cameraShot` in `legacyCameraConfig` um,
`selectCameraRigConfig` meldet die Source `legacy`, und `resolveCameraTarget`
akzeptiert `fallbackShot`. Damit kann ein altes `scene.brain.camera`-Feld als
aktueller Vertrag weiterleben, obwohl die App inzwischen file-first
`ConfigCamera` aus Scene-/Configuration-Daten besitzt.

Why now: `ZwvSdKghcAmK` blockiert das V2-Readiness-Gate. NF-001 ist der erste
noch offene High-Priority-Codepfad in der No-Fallback-Inventur.

Symptom vs. Problem: Das Symptom sind die Namen `legacyCameraConfig`,
`fallbackShot` und Source `legacy`. Das Problem ist die unklare
Prioritätskette `figure > scene > legacy`, die einen nicht mehr aktuellen
Kamera-Vertrag als stillen Ersatz akzeptiert.

Smallest change: `sceneStore.cameraShot` wird nur noch als expliziter
Scene-Kamera-Vertrag modelliert, nicht als Legacy-Fallback. Der Resolver
erwartet einen `ConfigCamera` mit `shot` oder `pose`; ohne explizite Kamera
wirft er laut. URL-/Configuration-Kameras behalten Vorrang vor Scene-Kameras.

## Scope

1. `apps/brain-app/src/scene/cameraRigConfig.ts`
2. `apps/brain-app/src/scene/cameraRigConfig.test.ts`
3. `apps/brain-app/src/scene/cameraResolve.ts`
4. `apps/brain-app/src/scene/cameraResolve.test.ts`
5. `apps/brain-app/src/scene/CameraRig.tsx`
6. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`

## Nicht-Ziele

1. Keine neue Kamera-Authoring-API.
2. Keine Änderung der Shot-Geometrie oder Preset-Richtungen.
3. Keine Migration der Scene-JSONs auf ein anderes Format.
4. Keine Browser-Designarbeit außerhalb der Kamera-Verhaltensprüfung.

## Entscheidung

Der erlaubte Endzustand ist `Migrated`: `brain.camera` aus Scene-JSON und
`configuration.camera` aus Atlas-Config sind aktuelle Primärverträge. Der
ehemalige Scene-Shot wird als `sceneCameraConfig` behandelt. Es gibt keinen
`legacy`-Source-Wert und keinen Resolver-`fallbackShot` mehr.

## Verifikation

1. Red-Test zeigt, dass Legacy-/Fallback-Kamera noch akzeptiert wird.
2. Focused Vitest für Kamera-Resolver und Kamera-Config läuft grün.
3. Relevante CameraRig-Tests laufen grün.
4. Typecheck läuft grün.
5. Abschluss-`rg` zeigt keine produktiven Treffer für `legacyCameraConfig`,
   `fallbackShot` oder `CameraConfigSource = 'legacy'`.
