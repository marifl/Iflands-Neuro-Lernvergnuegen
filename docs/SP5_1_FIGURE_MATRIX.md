# SP5.1 Figure/Scene-Config-Abdeckungsmatrix

Quelle für das Abbildungs-Inventar:
`docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`.

Status-Quelle für SP5.1: Eine Abbildung ist nur `done`, wenn die Runtime-Config
eine `replaces_figure`-Configuration dafür enthält und mindestens ein Test- oder
Smoke-Nachweis existiert. Presets oder Szenen ohne `replaces_figure` zählen hier
als Vorarbeit, nicht als erledigte Abbildungs-Ersetzung.

| Abb. | Status | Config(s) | Nachweis | Nächster Schritt |
| :--- | :--- | :--- | :--- | :--- |
| 11-04 | done | [basalganglienschleifen](../scripts/atlas/config.default.toml) | `smoke-figures.mjs`, `smoke-preset.mjs`, `build-config.test.mjs` | - |
| 11-05 | done | [pfc-petrides](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs`, `smoke-figures.mjs` | - |
| 11-06 | done | [fuster-gradient](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-07 | done | [badre-rostrokaudal](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs`, `smoke-figures.mjs` | - |
| 11-08A | done | [badre-domainen](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-08B | done | [badre-relationale-komplexitaet](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-08C | done | [badre-kaskade](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-08D | done | [badre-konflikttypen](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-09 | done | [wcst-frontoparietal](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-10 | done | [fluency-foci](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-11A/B | done | [tower-of-london-dlpfc](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-11C | done | [tower-of-london-schweregrad](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-12 | done | [flanker-aufgabe](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs` | - |
| 11-13 | done | [acc-bush](../scripts/atlas/config.default.toml) | `figureScenePackages.test.ts`, `build-config.test.mjs`, `smoke-figures.mjs` | - |
| 11-14 | done | [vcpt](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-subparcels.mjs`, `build-config.test.mjs` | - |
| 11-15(1) | done | [p3a-konfliktmonitoring](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `configExport.test.ts` | - |
| 11-15(2) | done | [p3b-engagement](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-eeg-p3b.mjs` | - |
| 11-15(3) | done | [p3z-inhibition](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-eeg-p3z.mjs` | - |

## Zusammenfassung

| Status | Abbildungen |
| :-- | :-- |
| `done` | 11-04, 11-05, 11-06, 11-07, 11-08A, 11-08B, 11-08C, 11-08D, 11-09, 11-10, 11-11A/B, 11-11C, 11-12, 11-13, 11-14, 11-15(1), 11-15(2), 11-15(3) |
| `open` | keine |
| `blocked` | keine |
