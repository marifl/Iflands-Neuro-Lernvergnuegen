# Deployment

Stand: 2026-06-16.

## Ziel

Die App ist eine statische Vite-App. Der produktive Build liegt nach
`pnpm build` in `apps/brain-app/dist/` und kann von jedem statischen Host
ausgeliefert werden, solange WebGL2 im Browser verfügbar ist.

## Verifikation vor Release

Alle Befehle laufen aus `apps/brain-app/`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm perf:budget
```

Der GitHub-Workflow `.github/workflows/brain-app.yml` führt für PRs und Pushes
auf `main` Install, Typecheck, Unit-Tests, Build und `pnpm perf:budget` aus.
Playwright-Smokes bleiben lokale/manuelle Verifikation und laufen nicht in
GitHub Actions.

`pnpm perf:budget` setzt einen statischen Build-Schutz nach `pnpm build`: JS-/
CSS-Gzip-Budget, größte Runtime-Asset-Datei, Gesamtgröße von `public/assets`
und die Phineas-Asset-Gruppe. Das ist kein FPS-Test, verhindert aber stille
Bundle- oder Asset-Ausreißer.

## Base-Path

Default ist Root-Hosting:

```bash
pnpm build
```

Für Hosting unter einem Subpfad muss der Vite-Base-Path explizit gesetzt werden:

```bash
VITE_BASE_PATH=/Iflands-Neuro-Lernvergnuegen/ pnpm build
```

Regeln:

1. Root-Domain oder Custom Domain nutzt `VITE_BASE_PATH=/`.
2. GitHub Pages unter `https://<user>.github.io/<repo>/` nutzt
   `VITE_BASE_PATH=/<repo>/`.
3. Der Wert muss mit `/` beginnen und enden.
4. Nach jedem Base-Path-Wechsel muss `pnpm build` neu laufen.

## Cache

Vite versieht gebundelte JS-/CSS-Dateien im Build mit Hashes. Diese Dateien
können vom Host langfristig gecacht werden.

Runtime-Assets unter `public/assets/` behalten ihre Dateinamen. Für große GLB-,
JSON-, LUT- und Pick-Dateien gilt daher:

1. Unveränderte Assets dürfen langfristig gecacht werden.
2. Geänderte Assets brauchen einen Dateinamen- oder Query-Version-Bump.
3. Atlas-Carve-Surfaces nutzen aktuell `CARVE_V` in
   `apps/brain-app/src/viewer/AtlasOverlay.tsx`; bei jedem Rebake hochzählen.
4. `index.html` darf nicht langfristig gecacht werden, damit neue Hash-Bundles
   und Asset-Versionen sofort referenziert werden.

Empfohlene Header:

```text
/assets/*        Cache-Control: public, max-age=31536000, immutable
/index.html      Cache-Control: no-cache
/*.js,/*.css     Cache-Control: public, max-age=31536000, immutable
```

## Smoke nach Deployment

Nach Upload:

1. Root-URL öffnen und Lernmodus starten.
2. `?scene=vcpt` öffnen und URL-Kanonisierung prüfen.
3. `?config=p3a-konfliktmonitoring` öffnen und ERP-Overlay prüfen.
4. `?mode=explore` öffnen und Atlas-/Cut-Werkzeuge kurz testen.
5. `?config=ofc-phineas` öffnen und Phineas-Pfad prüfen.

Für Vortragseinsatz zusätzlich Beamer- oder projektorähnlichen Viewport prüfen.
