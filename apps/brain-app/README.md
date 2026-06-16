# brain-app

Die App selbst (Vite / React / React Three Fiber / Three.js). Produkt-Überblick,
Lizenz und Asset-Pipelines stehen im **[Repo-README](../../README.md)**.
Die zentrale Runtime-, State-, Config- und Visual-Authoring-Karte steht in
**[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)**.

## Entwickeln

Voraussetzungen: **Node.js ≥ 20**, **pnpm ≥ 9**.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

| Befehl | Wirkung |
|--------|---------|
| `pnpm dev` | Dev-Server mit Hot-Reload |
| `pnpm build` | Production-Build → `dist/` (`tsc -b && vite build`) |
| `pnpm preview` | statischer Server für `dist/` |
| `pnpm preview:lan` | statischer Server für `dist/` im lokalen Netzwerk |
| `pnpm typecheck` | `tsc -b --noEmit` |
| `pnpm test` | Vitest einmalig (CI-tauglich) |
| `pnpm test:watch` | Vitest im lokalen Watch-Modus |
| `pnpm test:e2e` | Playwright E2E |

## Struktur

```
src/
├── main.tsx      Einstiegspunkt + Deep-Link-Routing (?mode=, ?scene=)
├── scene/        Lern-Szenen, Kamera-Rig, Overlays (ERP-Charts)
├── viewer/       3D-Viewer, Strukturbaum, FooterBar, Färbe-/Cut-Werkzeuge
└── app.css       Editorial-Theme-Schicht
public/
├── assets/       3D-Meshes + Atlas-Labels (BodyParts3D, fsaverage)
├── regions/      pro-Region-Markdown
├── scenes/       Lern-Szenen (JSON)
├── companion/    Companion-Atlas + Presets
└── config/       Presets / Szenen-Config
```

Architektur-Details und Authoring-Happy-Paths: [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

Die App ist `@mu-kn/brain-app` und nutzt `@mu-kn/brain-runtime`
(`file:../../packages/brain-runtime`) sowie `theme-tokens` über relativen
CSS-Import — keine `pnpm-workspace.yaml` nötig.

## Lizenz

Gesamtes Werk unter **CC BY-SA 4.0** — siehe Repo-[`LICENSE`](../../LICENSE) und
[`THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md) (Attribution der
gebündelten Atlasdaten: BodyParts3D, fsaverage/DKT/Destrieux/Julich/Brodmann,
Allen, CIT168).

## Kontakt

Marcus Ifland · via [GitHub @marifl](https://github.com/marifl)
