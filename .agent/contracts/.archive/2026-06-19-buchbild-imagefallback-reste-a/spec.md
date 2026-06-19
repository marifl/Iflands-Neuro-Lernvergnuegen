---
outcome:
  user_signal: |
    Die aktuelle Arbeitsdoku behauptet keine Buchbild-/ImageFallback-Runtime
    mehr, und die App bleibt frei von gerenderten Buchbild-Fallbacks.
  observable_in: |
    `docs/ASSET_UND_INHALTSINVENTUR.md`, `docs/MASTERPLAN.md`,
    `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`,
    `apps/brain-app/src/scene/overlays/OverlayPanel.tsx` und
    `apps/brain-app/src/scene/figureScenePackages.test.ts`.
  guardrail: |
    Historische Planungsdokumente bleiben Verlaufsevidenz; sie dürfen aber nicht
    als aktuelle Runtime-Anweisung gelesen werden. Keine neuen Bild-Assets.
  read_horizon: |
    Sofort im Contract-Run und danach beim Abschluss-Gate für Legacy-/Fallback-
    Restklassen.
---

# Spec — Buchbild-/ImageFallback-Reste aus Runtime-Vertrag entfernen

> Contract-ID: `2026-06-19-buchbild-imagefallback-reste-a`
> Revision: v1 (2026-06-19)

## Frame

```yaml
problem: |
  Aktuelle Doku behauptet noch `public/figures` und ImageFallback-Runtime,
  obwohl der Ordner nicht existiert und Figure-Scene-Tests Buchbild-Fallbacks
  bereits verbieten.
why_now: |
  NF-006 blockiert den Release-Parent, solange die Doku einen alten Runtime-
  Fallback-Vertrag offen lässt.
symptom_vs_problem: |
  Symptom = `docs/ASSET_UND_INHALTSINVENTUR.md` nennt 13 lokale JPG-Fallbacks,
  `docs/MASTERPLAN.md` nennt `ImageFallback` und `public/figures`. Problem =
  diese Angaben widersprechen dem aktuellen Runtime-Vertrag.
smallest_change: |
  Aktuelle Arbeitsdoku und Inventur auf den belegten Zustand korrigieren:
  keine `public/figures`, keine ImageFallback-Runtime, Tests behalten das
  Verbot. Historische `docs/superpowers/**` bleiben Verlauf.
tradeoffs: |
  Keine Asset-Verschiebung, weil kein `apps/brain-app/public/figures` mehr
  existiert. Keine Änderung an Szeneninhalt; die Scene-JSONs bleiben eigene
  Overlay-/3D-Inhalte.
```

## Scope

### In-Scope

1. Stale Aussagen zu `public/figures`, `ImageFallback` und Runtime-Fallback-JPGs
   in aktueller Arbeitsdoku korrigieren.
2. No-Fallback-Inventur NF-006 als migriert markieren.
3. Den Overlay-Kommentar so formulieren, dass er keinen aktuellen Fallback-
   Vertrag suggeriert.
4. Tests/Checks ausführen, die belegen, dass Runtime keine Buchbild-Fallbacks
   enthält.

### Out-of-Scope

1. Keine Bearbeitung historischer Planungsprotokolle unter `docs/superpowers/**`.
2. Keine neuen Bildassets.
3. Keine Änderung an `raw/chapter/images/`; Raw-Quellen bleiben Rohdaten.
4. Keine neue Overlay-Komponente.

## Test-Strategie

1. Filesystem: `test ! -d apps/brain-app/public/figures`.
2. Runtime-Test: `pnpm --dir apps/brain-app exec vitest run src/scene/figureScenePackages.test.ts`.
3. Atlas-Config-Test: `node --test scripts/atlas/build-config.test.mjs`.
4. Search: keine `fallbackImage`, `fallback_image`, `ImageFallback` oder
   `public/figures` in aktuellen Runtime-/Arbeitsdoku-Dateien; historische
   `docs/superpowers/**` sind ausgeschlossen.
5. Doku: `pnpm --dir apps/brain-app docs:drift`.

## Pflichtlektüre

1. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
2. `docs/ASSET_UND_INHALTSINVENTUR.md`
3. `docs/MASTERPLAN.md`
4. `apps/brain-app/src/scene/figureScenePackages.test.ts`
5. `apps/brain-app/src/scene/overlays/OverlayPanel.tsx`
