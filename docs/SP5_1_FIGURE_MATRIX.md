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
| 11-05 | open | - | - | Configuration für `pfc-petrides` authoren, `replaces_figure = "11-05"` setzen und Figuren-Smoke daraus ableiten. |
| 11-06 | open | - | - | Fuster-Modell als Gradient-/Flowchart-Szene konzipieren, danach Config mit Kamera und Overlay authoren. |
| 11-07 | open | - | - | Vollständige Badre-Gradient-Config auf Basis von `badre-rostrokaudal` authoren; `broca-areal` bleibt nur unterstützender Lernschritt. |
| 11-08A | open | - | - | Domänenspezifisch-zu-domänenübergreifend als Flowchart-/Didaktik-Szene aus der OCR-Abbildung modellieren. |
| 11-08B | open | - | - | Relationale-Komplexität-Szene mit Overlay-Stufen und passender PFC-Kamera authoren. |
| 11-08C | open | - | - | Kaskadenmodell als Flowchart-Overlay und Lernschritt konfigurieren. |
| 11-08D | open | - | - | Konflikt-Typen als Flowchart-/Tabellen-Overlay und Lernschritt konfigurieren. |
| 11-09 | open | - | - | WCST/fMRT-Aktivierungsconfig für bilaterales DLPFC/VLPFC/parietal authoren und Smoke ergänzen. |
| 11-10 | open | - | - | Fluency-Foci als fünf Aktivierungsgruppen authoren; fehlende Didaktik-Reihenfolge festlegen. |
| 11-11A/B | open | - | - | Tower-of-London-Aufgabe plus DLPFC-Aktivierung als Szene/Overlay authoren. |
| 11-11C | open | - | - | DLPFC-Schwierigkeitskurve als Diagramm-Overlay und gekoppelte 3D-Hervorhebung authoren. |
| 11-12 | open | - | - | Flanker-Aufgabe aus OCR-Text neu als Szene bauen, da keine Bilddatei existiert. |
| 11-13 | open | - | - | Configuration für `acc-bush` authoren, `replaces_figure = "11-13"` setzen und Figuren-Smoke daraus ableiten. |
| 11-14 | done | [vcpt](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-subparcels.mjs`, `build-config.test.mjs` | - |
| 11-15(1) | done | [p3a-konfliktmonitoring](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `configExport.test.ts` | - |
| 11-15(2) | done | [p3b-engagement](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-eeg-p3b.mjs` | - |
| 11-15(3) | done | [p3z-inhibition](../scripts/atlas/config.default.toml) | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-eeg-p3z.mjs` | - |

## Zusammenfassung

| Status | Abbildungen |
| :-- | :-- |
| `done` | 11-04, 11-14, 11-15(1), 11-15(2), 11-15(3) |
| `open` | 11-05, 11-06, 11-07, 11-08A, 11-08B, 11-08C, 11-08D, 11-09, 11-10, 11-11A/B, 11-11C, 11-12, 11-13 |
| `blocked` | keine |
