# No-Fallback-Architektur-Inventur

Stand: 19. Juni 2026.

Diese Datei ist der aktuelle Arbeitsvertrag für die verbleibenden
Legacy-/Fallback-/Deprecated-/localStorage-Unbekannten. Ein ausführender Agent
muss hier starten, bevor er eine der benannten Stellen ändert.

## Regel

Fallbacks sind kein zulässiger Endzustand.

Wenn ein Fallback vermeintlich nötig wirkt, ist das ein Architekturkonflikt. Der
Konflikt wird nicht durch Begründung behalten, sondern durch einen dieser
Endzustände geschlossen:

1. Entfernt.
2. Auf aktuellen primären Vertrag migriert.
3. Externer Nicht-App-Vertrag hinter aktuellem App-Alias gekapselt.
4. Blockierend offen mit konkretem Migrations-/Löschpfad.

Verboten als Abschluss: "behalten mit Begründung", "temporärer Fallback ohne
Löschpfad", "Legacy-Adapter dokumentiert" oder stille Reparatur korrupter Daten.

## Einstieg

Parent-Task in Dart:
[Kläre und migriere verbleibende Legacy-/Fallback-Architekturstellen](https://app.dartai.com/t/ZwvSdKghcAmK-Kl-re-und-migriere-verbleibend)

Vor jedem Code-Edit:

1. Betroffenen Dart-Task auf `Doing` setzen.
2. Referenzen und Tests aus der Inventur lesen.
3. Entscheiden, welcher der vier erlaubten Endzustände erreichbar ist.
4. Erst dann Code ändern.
5. Nach Änderung frische Tests und, bei Runtime/UI, Browser-Smoke dokumentieren.

## Bekannte Unbekannte

| ID | Restklasse | Code-/Doku-Orte | Dart-Task | Ausführungsauftrag | Verifikation |
| --- | --- | --- | --- | --- | --- |
| NF-001 | Kamera-Legacy-Fallback | `apps/brain-app/src/scene/cameraRigConfig.ts`, `apps/brain-app/src/scene/CameraRig.tsx`, `apps/brain-app/src/scene/cameraResolve.ts`, `apps/brain-app/src/scene/cameraRigConfig.test.ts`, `apps/brain-app/src/scene/cameraResolve.test.ts` | [Entscheide und migriere Kamera-Legacy-Fallback](https://app.dartai.com/t/vACjRDOH2EFc-Entscheide-und-migriere-Kamera) | `legacyCameraConfig`, `fallbackShot` und Source `legacy` entfernen oder in einen primären Kamera-Vertrag migrieren. Kein `figure > scene > legacy` als Endzustand. | `pnpm --dir apps/brain-app test -- src/scene/cameraRigConfig.test.ts src/scene/cameraResolve.test.ts`; Browser-Smoke für betroffene Scene-/Presentation-Route |
| NF-002 | Animation-Legacy | `apps/brain-app/src/viewer/animationSystem.ts`, `apps/brain-app/src/viewer/animationSystem.test.ts`, `apps/brain-app/src/viewer/contractValidation.ts`, `apps/brain-app/src/viewer/AnimationPlayer.tsx`, `apps/brain-app/src/scene/overlays/OverlayPanel.tsx` | [Kläre AnimationPlayer- und legacyAnimations-Migration](https://app.dartai.com/t/VbYqUgAngZE1-Kl-re-AnimationPlayer-und) | `legacyAnimations`, `legacy-highlight`, `legacy:<id>` und `AnimationPlayer` in aktuellen Timeline-/Registry-Vertrag migrieren oder blockierend offen lassen. | `pnpm --dir apps/brain-app test -- src/viewer/animationSystem.test.ts src/scene/overlays/OverlayPanel.test.tsx`; ContractValidation-Test ergänzen/ausführen |
| NF-003 | Mesh-Picking-Legacy | `apps/brain-app/src/viewer/targetPicking.ts`, `apps/brain-app/src/viewer/CutPickBridge.tsx`, `apps/brain-app/src/viewer/viewerStore.ts`, `apps/brain-app/src/viewer/targetPicking.test.ts`, `apps/brain-app/src/viewer/viewerStore.test.ts` | [Kläre Legacy-Mesh-Picking-Fallback](https://app.dartai.com/t/E7CfpLJUiG6R-Kl-re-Legacy-Mesh-Picking) | `pickTargetFromLegacyMeshName` und "Legacy-Hirn-Picks" durch aktuellen MeshName-/ObjectGraph-Vertrag ersetzen. Kein Parent-/Name-Fallback. | `pnpm --dir apps/brain-app test -- src/viewer/targetPicking.test.ts src/viewer/viewerStore.test.ts`; Cut-/Pick-Smoke bei Runtime-Änderung |
| NF-004 | Phineas-Asset-Space mit `legacy` im Vertrag | `apps/brain-app/public/assets/phineas/transform-contract.json`, `apps/brain-app/public/assets/phineas/asset-manifest.json`, `apps/brain-app/scripts/mesh-identity-inventory.mjs`, `docs/phineas-gage/STANDALONE_IMPORT.md` | [Kläre Phineas-Asset-Space legacy-figs3d](https://app.dartai.com/t/8iAKqzLFf9G2-Kl-re-Phineas-Asset-Space) | `phineas-gage-legacy-figs3d` darf nicht App-Vertrag bleiben. Umbenennen oder hinter aktuellem Alias-/Manifest-Vertrag kapseln. | Asset-/Mesh-Identity-Test; Phineas-Browser-Smoke |
| NF-005 | Lokale Persistenz | `apps/brain-app/src/localAppStorageKeys.ts`, `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts`, `apps/brain-app/src/viewer/settingsStore.ts`, `apps/brain-app/src/viewer/authoringSnapshotStore.ts`, `apps/brain-app/src/viewer/localDataActions.ts`, `apps/brain-app/src/AppErrorBoundary.tsx`, `docs/ARCHITECTURE.md` | [Entscheide localStorage-Override-Architektur und Persistenzgrenzen](https://app.dartai.com/t/1Hbpo13ABwto-Entscheide-localStorage-Overri) | Migriert am 19. Juni 2026: alle App-eigenen `localStorage`-Keys stehen in `localAppStorageKeys.ts` und haben Owner, Zweck und Löschpfad in `docs/ARCHITECTURE.md`; korrupte Settings-/Atlas-Override-Daten werfen laut statt Defaults zu maskieren; Root-ErrorBoundary und Settings-Clear-Flow löschen dieselbe zentrale Key-Liste. | `pnpm --dir apps/brain-app exec vitest run src/viewer/atlas/atlasConfigStore.test.ts src/viewer/settingsStore.test.ts src/viewer/authoringSnapshotStore.test.ts src/viewer/localDataActions.test.ts`; `pnpm --dir apps/brain-app typecheck`; `pnpm --dir apps/brain-app docs:drift` |
| NF-006 | Buchbild-/ImageFallback-Reste | `apps/brain-app/public/figures/`, `apps/brain-app/src/scene/overlays/OverlayPanel.tsx`, `apps/brain-app/src/scene/figureScenePackages.test.ts`, `docs/ASSET_UND_INHALTSINVENTUR.md`, `docs/MASTERPLAN.md` | [Kläre Buchbild-/ImageFallback-Reste in Scene-Architektur](https://app.dartai.com/t/V4vpZoCKmqwF-Kl-re-Buchbild-ImageFallback) | Runtime darf keine Buchbild-Fallbacks laden. Assets löschen oder als nicht-gerenderte Raw-/Archivquelle verschieben. | `pnpm --dir apps/brain-app test -- src/scene/figureScenePackages.test.ts`; `rg -n "fallbackImage|fallback_image|ImageFallback" apps/brain-app/src apps/brain-app/public scripts docs` |
| NF-007 | Deprecated-Warnungen und Konsolenartefakte | `apps/brain-app/native-highqual-browser-console*.md`, Three/R3F-Nutzung, Browser-Konsole | [Kläre deprecated THREE.Clock-Warnung und Konsolenartefakte](https://app.dartai.com/t/jQ3imht6IDmR-Kl-re-deprecated-THREE-Clock) | Frische Browser-Konsole erzeugen. App-seitige Deprecated-Nutzung migrieren; alte Artefakte nicht als aktuelle Wahrheit verwenden. | Frischer Browser-Smoke mit Konsolenprotokoll |
| NF-008 | Aktuelle Doku-Drift | `README.md`, `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, `apps/brain-app/README.md`, `apps/brain-app/PRODUCT.md`, `apps/brain-app/DESIGN.md`, `docs/ARCHITECTURE.md`, `scripts/check-doc-drift.mjs` | [Bereinige aktuelle Doku-Drift zu Legacy/Fallback/Architekturstatus](https://app.dartai.com/t/n0RsZZ5gXo5X-Bereinige-aktuelle-Doku-Drift) | Migriert am 19. Juni 2026: aktuelle Arbeitsdoku beschreibt den Runtime-Vertrag mit `learn`, `explore`, `phineas` und Atlas als internem/deep-linkbarem Supplement. Historische Protokolle bleiben Verlaufsevidenz, aber keine Arbeitsanweisung. | `pnpm --dir apps/brain-app docs:drift`; `rg -n "Drei Grundmodi|vier Modus-Karten|T6|/deck|/editor|src/features|public/companion|colors\\.groups" README.md PRODUCT.md DESIGN.md CLAUDE.md apps/brain-app/README.md apps/brain-app/PRODUCT.md apps/brain-app/DESIGN.md docs/ARCHITECTURE.md docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` |
| NF-009 | Atlas-/Alignment-Konfliktbehandlungen | `scripts/atlas/*`, `scripts/assets/bodyparts3d/*`, `scripts/alignment/learn_brain_hierarchy.json`, `scripts/atlas/README.md`, `docs/ATLAS_*` | [Kläre Atlas-/Alignment-Script-Fallbacks und Legacy-Fasertrakte](https://app.dartai.com/t/DOBNMqZMsmdz-Kl-re-Atlas-Alignment-Script) | Algorithmische Fallback-Semantik in deterministische aktuelle Konfliktbehandlung umbenennen oder Datenreste entfernen. `Legacy-Fasertrakte` nicht als aktuelles Label stehen lassen. | Relevante Atlas-Build-/Catalog-/Topologie-Tests; `rg -n "Fallback|fallback|Legacy-Fasertrakte" scripts/atlas scripts/assets scripts/alignment docs/ATLAS_*` |
| NF-010 | Dependency-Deprecated-Hinweise | `apps/brain-app/pnpm-lock.yaml`, frische Install-/Test-/Browser-Ausgaben | [Kläre Dependency-Deprecated-Hinweise und externe Warnungen](https://app.dartai.com/t/dGJ8yoDoPQbw-Kl-re-Dependency-Deprecated) | Deprecated-Hinweise frischer Quelle zuordnen. App-Code migrieren, transitive Dependencies als Upgrade-Task planen, historische Artefakte entfernen/markieren. | `pnpm --dir apps/brain-app install --frozen-lockfile`; `pnpm --dir apps/brain-app test`; Browser-Konsole |
| NF-011 | Region-Farb-Default-Palette | `apps/brain-app/src/viewer/atlasColorSystem.ts`, `apps/brain-app/src/viewer/ontology.ts`, `apps/brain-app/src/viewer/ontology.test.ts` | [Kläre REGION_FALLBACK_PALETTE als aktuellen Farbvertrag](https://app.dartai.com/t/gMxBSoVbcb80-Kl-re-REGION-FALLBACK-PALETTE) | Migriert am 18. Juni 2026: die Palette ist aus dem Runtime-Code entfernt; Regionsfarben müssen alle Top-Level-Gruppen der echten Ontologie explizit abdecken, unbekannte Gruppen werfen laut. | `pnpm --dir apps/brain-app test -- src/viewer/ontology.test.ts src/viewer/phineasGage.test.ts src/viewer/colorPresets.test.ts`; `rg -n "REGION_FALLBACK_PALETTE|Fallback fuer nicht klassifizierbare" apps/brain-app/src` |
| NF-012 | Parser-/Default-Fallbacks | `apps/brain-app/src/viewer/settingsStore.ts`, `apps/brain-app/src/viewer/atlas/atlasConfig.ts`, `apps/brain-app/src/viewer/authoringSnapshotStore.ts`, `apps/brain-app/src/viewer/viewerStateSnapshot.ts`, `apps/brain-app/src/viewer/manifestAuthoringRuntime.ts` | [Kläre Parser-/Default-Fallbacks in Settings, Snapshots und Authoring](https://app.dartai.com/t/67dIBiXChW0p-Kl-re-Parser-Default-Fallbacks) | Migriert am 19. Juni 2026: Settings und Atlas-Overrides laden bereits fail-loud; lokale Authoring-Snapshots und Command-History werfen nun mit Storage-Key statt korrupten State zu löschen; Viewer-Snapshot-Import nutzt stabile Schema-Defaults statt aktuellem Live-State; Manifest-Refresh ist als Baseline-Merge benannt, nicht als Fallback. | `pnpm --dir apps/brain-app exec vitest run src/viewer/authoringSnapshotStore.test.ts src/viewer/viewerStateSnapshot.test.ts src/viewer/manifestAuthoringRuntime.test.ts src/viewer/settingsStore.test.ts src/viewer/atlas/atlasConfigStore.test.ts`; `pnpm --dir apps/brain-app typecheck`; `pnpm --dir apps/brain-app docs:drift` |
| NF-013 | Abschlussinventur | Ergebnisse aller Restklassen | [Erstelle Abschlussinventur für alle Legacy-/Fallback-Entscheidungen](https://app.dartai.com/t/q65CtkeJpGPz-Erstelle-Abschlussinventur-f) | Nach Umsetzung aller Einzelklassen Statusliste erstellen: entfernt, migriert, externer Nicht-App-Vertrag gekapselt oder blockierend offen. | Abschluss-`rg` gegen `legacy`, `fallback`, `deprecated`, `colors.groups`, `smoke-preset`, `localStorage` |

## Nicht als Architektur-Fallback zählen

Diese Treffer dürfen den Audit nicht verwässern, müssen aber bei Änderungen
bewusst behandelt werden:

1. React-/Framework-API-Namen wie `<Suspense fallback={...}>`. Nur relevant,
   wenn sie App-Inhalte maskieren.
2. Testfälle, die explizit Fehlerverhalten gegen verbotene Fallbacks prüfen.
3. Historische Review-/End-Session-Dokumente, solange sie nicht als aktuelle
   Arbeitsanweisung referenziert werden.
4. Generated Reports unter `scripts/atlas/work/`, solange sie nicht Runtime-
   Wahrheit sind. Wenn sie committet bleiben, muss die aktuelle Doku erklären,
   ob sie historische Evidenz oder aktive Build-Evidenz sind.

## Abschluss-Gate

Vor Parent-Review muss dieser Befehl laufen und die Reststellen müssen in der
Abschlussinventur erklärt sein:

```bash
rg -n "legacy|Legacy|fallback|Fallback|deprecated|Deprecated|localStorage|colors\\.groups|smoke-preset" \
  README.md docs apps/brain-app/src apps/brain-app/tests scripts \
  --glob '!node_modules' \
  --glob '!docs/reviews/**' \
  --glob '!docs/END_SESSION_*' \
  --glob '!docs/superpowers/plans/**'
```

Ein Treffer ohne Dart-Link oder ohne erlaubten Endzustand blockiert den Parent.
