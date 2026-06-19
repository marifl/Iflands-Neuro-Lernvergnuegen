---
outcome:
  user_signal: |
    Phineas-Gage-Assets laufen nicht mehr unter einem `legacy`-Space als
    aktuellem App-Vertrag, bleiben aber in Phineas- und Authoring-Runtime
    unverändert ladbar.
  observable_in: |
    `apps/brain-app/public/assets/phineas/asset-manifest.json`,
    `apps/brain-app/public/assets/phineas/transform-contract.json`,
    `apps/brain-app/scripts/mesh-identity-inventory.mjs`,
    `docs/reviews/mesh-identity-inventory.json`,
    `docs/reviews/2026-06-17-mesh-identity-inventory.md` und
    `docs/phineas-gage/STANDALONE_IMPORT.md`.
  guardrail: |
    Keine GLB-Neugenerierung und keine Änderung an Skull-/Rod-Transforms.
    Archiv-Provenienz darf sichtbar bleiben; nur der app-seitige Space-Vertrag
    verliert den Legacy-Namen.
  read_horizon: |
    Sofort im Contract-Run und danach bei jedem Phineas-Asset-, Inventory- oder
    Release-Smoke.
---

# Spec — Phineas-Asset-Space `legacy-figs3d` kapseln

> Contract-ID: `2026-06-19-phineas-asset-space-legacy-fig`
> Revision: v1 (2026-06-19)
> Status: planning → active nach plan-done

## Frame

```yaml
problem: |
  Der aktuelle Phineas-Asset-Vertrag nutzt `phineas-gage-legacy-figs3d` als
  `spaceId` in Manifest, Transform-Contract und Mesh-Identity-Inventar.
why_now: |
  Der Release-Parent verlangt, dass Legacy-/Fallback-Restklassen entweder
  entfernt, migriert, extern gekapselt oder blockierend offen sind. NF-004 ist
  der nächste offene Release-Blocker nach der Animation-Migration.
symptom_vs_problem: |
  Symptom = der String `legacy-figs3d` taucht in aktuellen Runtime-Verträgen
  und generierten Review-Artefakten auf. Problem = ein historischer Archivname
  wirkt dadurch wie ein aktueller App-Space-Vertrag.
smallest_change: |
  Den app-seitigen Space auf `phineas-gage-taro-fit-v1` migrieren, alle
  abhängigen Tests/Inventare aktualisieren und die Archiv-Provenienz als Quelle
  unverändert lassen.
tradeoffs: |
  Kein GLB-Rebake: Geometrie, Hashes, Transforms und Materialverträge bleiben
  gleich. Der Schnitt ist eine Vertragsumbenennung, keine Asset-Optimierung.
```

## Scope

### In-Scope

1. `spaceId` in Phineas-Manifest und Transform-Contract auf
   `phineas-gage-taro-fit-v1` migrieren.
2. Tests ergänzen, die den neuen Space prüfen und `legacy` im app-seitigen
   Space-Vertrag verbieten.
3. Mesh-Identity-Inventar und Review-Markdown regenerieren.
4. Phineas-Import-Doku aktualisieren.
5. Phineas Asset-/Transform-/Inventory-Checks und Browser-Smoke ausführen.

### Out-of-Scope

1. Keine GLB-Dateien neu erzeugen.
2. Keine Änderung an `rootTransform`, Trajektorie, Schädel-Fit oder Rod-Maßen.
3. Keine Lizenz-/Attributionsentscheidung über den bestehenden Hinweis hinaus.
4. Keine Änderung an Phineas-Sequenzinhalt oder UI-Komposition.

## Architektur

`spaceId` ist in diesem Repo ein app-seitiger Normalisierungsvertrag. Die
korrekte aktuelle Bedeutung ist nicht "legacy", sondern "Phineas-Gage-Assets,
aus Archivquellen extrahiert und in TARO-Viewer-Space eingepasst". Der neue
Name `phineas-gage-taro-fit-v1` beschreibt diese Bedeutung ohne historische
Architektursemantik.

Die externe Herkunft bleibt in `source.provenance`,
`skullAlignment.archiveSource` und der Import-Doku sichtbar. Damit wird die
Quelle nicht versteckt, aber sie leakt nicht mehr als Produktvertrag in
Runtime-Space und Inventory.

## Test-Strategie

1. Unit: `phineasStandaloneAssets.test.ts` prüft Manifest- und
   Transform-Contract-Space.
2. Inventory: `pnpm --dir apps/brain-app run inventory:mesh-identity` prüft
   GLB-Hashes, Node-Namen und generierte Artefakte.
3. Transform: `pnpm --dir apps/brain-app run verify:phineas-transform` prüft
   Rod- und Skull-Alignment.
4. Browser: `pnpm --dir apps/brain-app run smoke:phineas-gage` prüft den
   sichtbaren Phineas-Runtime-Pfad.
5. Search: `rg -n "phineas-gage-legacy-figs3d|legacy-figs3d"` darf nur noch
   historische Archiv-/ALRAH-Artefakte treffen, nicht aktuelle Runtime- oder
   Arbeitsdoku.

## Pflichtlektüre

1. `CLAUDE.md`
2. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
3. `apps/brain-app/public/assets/phineas/asset-manifest.json`
4. `apps/brain-app/public/assets/phineas/transform-contract.json`
5. `apps/brain-app/src/viewer/phineasStandaloneAssets.test.ts`
6. `apps/brain-app/scripts/mesh-identity-inventory.mjs`
7. `docs/phineas-gage/STANDALONE_IMPORT.md`
