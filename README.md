# brain-app (standalone)

3D-Brain-Viewer (React + React Three Fiber + Three.js), extrahiert aus dem
Monorepo `MU - SS26 - Kognitive Neurowissenschaften` als schlankes, eigenständiges
Repo. Ziel: sauberer Boden für das Jitter-Debugging ohne Monorepo-Ballast.

## Struktur

```
apps/brain-app/          # die App (Vite/React/R3F)
packages/brain-runtime/  # Koordinaten-Helfer (file:-Dependency von brain-app)
packages/theme-tokens/   # Design-Tokens, via relativem CSS-Import in app.css genutzt
scripts/alignment/       # 3 Kanonik-JSONs, nur von Tests referenziert
```

Die App referenziert `packages/brain-runtime` als `file:../../packages/brain-runtime`
und `packages/theme-tokens` über relative CSS-Pfade. Beide lösen rein über die
Verzeichnis-Struktur auf — **keine `pnpm-workspace.yaml` nötig**.

## Starten

```bash
cd apps/brain-app
pnpm install
pnpm dev          # http://localhost:5173
```

Weitere Scripts (alle in `apps/brain-app`):

```bash
pnpm build        # tsc -b && vite build
pnpm typecheck
pnpm test         # vitest
pnpm test:e2e     # playwright
```

## Was bei der Extraktion entfernt wurde (Bloat)

- `.git`-History (4.1G), `node_modules`, `dist`, Build-/Test-Artefakte
- `public/figs3d/v2/glb/_archive/` (1.7G Archiv)
- `*.blend` / `*.blend1` (922M Blender-Quellen, nie zur Laufzeit geladen)
- Debug-Screenshots (`*.png`) und `*-snapshot.md`

Alle **zur Laufzeit geladenen** Assets unter `public/figs3d` (~1.4G) sind vollständig
enthalten.

## Git initialisieren

```bash
git init && git add -A && git commit -m "init: brain-app standalone extraction"
```
