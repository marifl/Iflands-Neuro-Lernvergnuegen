---
outcome:
  user_signal: |
    Die aktuelle Arbeitsdoku behauptet keine Buchbild-/ImageFallback-Runtime
    mehr, und die App bleibt frei von gerenderten Buchbild-Fallbacks.
  observable_in: |
    Doku-Diff, Figure-Scene-Test, Atlas-Config-Test und Such-Gate.
  guardrail: |
    Historische Planungsdokumente bleiben Verlauf, aber nicht aktuelle
    Arbeitsanweisung.
  read_horizon: |
    Sofort im Contract-Run und im Abschluss-Gate.
---

# Akzeptanzkriterien — Buchbild-/ImageFallback-Reste entfernen

> Contract-ID: `2026-06-19-buchbild-imagefallback-reste-a`
> Revision: v1 (2026-06-19)

## C1 — Kein Runtime-Figure-Ordner

- Input: `test ! -d apps/brain-app/public/figures`.
- Erwartet: Exit 0.

## C2 — Figure-Scenes verbieten Buchbild-Fallbacks

- Input: `pnpm --dir apps/brain-app exec vitest run src/scene/figureScenePackages.test.ts`.
- Erwartet: Exit 0; der Test `liefert passende Scene-JSONs ohne Buchbild-Fallbacks`
  bleibt grün.

## C3 — Config-Validator verbietet Fallback-Keys

- Input: `node --test scripts/atlas/build-config.test.mjs`.
- Erwartet: Exit 0; der Test `validateConfig verbietet Buchbild-Fallbacks im
  Overlay` bleibt grün.

## C4 — Aktuelle Arbeitsdoku ist nicht stale

- Input: `docs/ASSET_UND_INHALTSINVENTUR.md`, `docs/MASTERPLAN.md`,
  `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`.
- Erwartet: keine aktuelle Aussage behauptet lokale Runtime-Fallback-JPGs unter
  `apps/brain-app/public/figures/` oder eine aktive `ImageFallback`-Komponente.

## C5 — Such-Gate trennt aktuelle Pfade von historischen Plänen

- Input: `rg -n "fallbackImage|fallback_image|ImageFallback|public/figures" apps/brain-app/src apps/brain-app/public scripts docs/ASSET_UND_INHALTSINVENTUR.md docs/MASTERPLAN.md docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`.
- Erwartet: Treffer sind nur negative Tests oder NF-006-Verifikationsbefehle;
  keine Runtime-Implementierung, kein Public-Asset und keine aktuelle
  Produkt-/Architekturbehauptung nutzt Buchbild-Fallbacks.
