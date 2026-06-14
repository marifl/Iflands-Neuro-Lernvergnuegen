# Iflands Neuro Lernvergnügen

Eine interaktive 3D-Lern-Experience für **Kapitel 11 — exekutive Funktionen**
(präfrontaler Cortex, Basalganglien-Schleifen, ereigniskorrelierte Potenziale
wie VCPT/ERP, Fallstudie Phineas Gage). Komplexe Neuroanatomie wird räumlich
begreifbar: anklickbare, isolierbare Strukturen auf einem anatomisch echten
3D-Hirn, geführte Lern-Szenen und eine editoriale, ruhige Oberfläche.

**Lizenz:** [CC BY-SA 4.0](LICENSE) · **Stack:** React + React Three Fiber + Three.js + Vite

---

## Was die App kann

Drei Grundmodi, umgeschaltet über eine kontextsensitive Steuerleiste am unteren Rand:

- **Lernen** — geführte Szenen (VCPT, ICA, P3a/P3b/P3z, Zusammenfassung) mit
  Companion-Text, Kamerafahrten und Overlays. Für Selbststudium **und** Vortrag.
- **Explorer** — freier Strukturbaum: jede Hirnregion anklicken, isolieren,
  einfärben (funktionale vs. laterale Färbemodi), schneiden (Cut-Plane).
- **Phineas Gage** — animierte Fallstudie (Läsion + Schädelkontext).

Dazu: zwei gleichwertige Themes (hell/dunkel), responsive Layouts für Desktop,
Tablet und Phone, WCAG-AA-Kontraste.

> Inhaltlicher Fokus und Designprinzipien sind in [`PRODUCT.md`](PRODUCT.md) und
> [`DESIGN.md`](DESIGN.md) beschrieben.

---

## Quick Start

Voraussetzungen: **Node.js ≥ 20** und **[pnpm](https://pnpm.io/installation) ≥ 9**.

```bash
cd apps/brain-app
pnpm install      # einmalig, ~3-5 min
pnpm dev          # Dev-Server auf http://localhost:5173
```

Die 3D-Atlas-Meshes liegen im Repo (`apps/brain-app/public/assets/`) — die App
läuft also direkt nach `pnpm install`, ohne separaten Daten-Download oder Build.

---

## Befehle

Alle in `apps/brain-app` ausführen:

| Befehl | Wirkung |
|--------|---------|
| `pnpm dev` | Vite-Dev-Server mit Hot-Reload (`localhost:5173`) |
| `pnpm build` | Production-Build nach `dist/` (`tsc -b && vite build`) |
| `pnpm preview` | statischer Server für den `dist/`-Build |
| `pnpm typecheck` | TypeScript-Strict-Check (`tsc -b --noEmit`) |
| `pnpm test` | Vitest (Watch-Modus); `pnpm exec vitest run` für einmalig |
| `pnpm test:e2e` | Playwright End-to-End-Smoke-Tests |

---

## Projektstruktur

```
apps/brain-app/              Die App (Vite / React / R3F)
├── src/
│   ├── main.tsx             Einstiegspunkt (Deep-Link-Routing: ?mode=, ?scene=)
│   ├── scene/               Lern-Szenen, Kamera-Rig, Overlays (ERP-Charts etc.)
│   ├── viewer/              3D-Viewer, Strukturbaum, FooterBar, Färbe-/Cut-Werkzeuge
│   └── app.css              app-lokale Editorial-Theme-Schicht
└── public/
    ├── assets/              3D-Meshes + Atlas-Label-Daten (BodyParts3D, fsaverage)
    ├── regions/             pro-Region-Markdown (Funktion, Brodmann-Areal, Quellen)
    ├── scenes/              Lern-Szenen als JSON (eigener didaktischer Content)
    ├── companion/           Companion-Atlas-Daten + Presets
    └── config/              Farb-/Material-Presets, Szenen-Config

packages/brain-runtime/      Koordinaten-Helfer (file:-Dependency der App)
packages/theme-tokens/       Design-Tokens (via relativem CSS-Import)
scripts/                     Asset-Erzeugungs-Pipelines (siehe unten)
```

`brain-runtime` und `theme-tokens` lösen rein über die Verzeichnisstruktur auf —
**keine `pnpm-workspace.yaml` nötig**.

---

## Tech-Stack

- **React 19** + **TypeScript 5.7** + **Vite 5**
- **3D:** **Three.js 0.184** über **React Three Fiber 9** + **drei 10**,
  `three-mesh-bvh` für schnelles Picking
- **State:** **Zustand 5**
- **UI:** Radix-Primitives, Tailwind CSS, Editorial-Theme (`src/app.css` + `theme-tokens`)
- **Tests:** **Vitest 2** (Unit/Integration) + **Playwright 1.49** (E2E)

---

## Daten & Asset-Pipelines

Die ausgelieferten 3D-Meshes und Atlas-Labels sind aus offen lizenzierten Quellen
**abgeleitet und im Repo gebündelt**. Sie lassen sich vollständig aus den Skripten
reproduzieren (man braucht dazu die Original-Quelldaten der jeweiligen Anbieter):

| Verzeichnis | Zweck | Doku |
|-------------|-------|------|
| [`scripts/assets/bodyparts3d/`](scripts/assets/bodyparts3d/README.md) | BodyParts3D-OBJ → `brain.glb` (+ Kontext-Kopf/Schädel), Spiegelung, FMA-Ontologie | `build.sh` + [README](scripts/assets/bodyparts3d/README.md) |
| [`scripts/atlas/`](scripts/atlas/README.md) | Atlas-Geometrie (Julich / DKT / Destrieux / Brodmann / fsaverage) auf das TARO-Hirn registrieren, Sub-Parzellen carven, kanonischer fsaverage-Modus | ausführliches [README](scripts/atlas/README.md) |
| `scripts/alignment/` | kanonische Referenz-JSONs (von Tests genutzt) | — |

> **Quelldaten** (selbst beziehen, unter deren Lizenzen): BodyParts3D
> (lifesciencedb.jp/bp3d), FreeSurfer `fsaverage`, EBRAINS Julich-Brain, CIT168.
> Details + Zitationen in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

---

## Lizenz & Attribution

Das gesamte Werk steht unter **[CC BY-SA 4.0](LICENSE)** (Namensnennung +
Weitergabe unter gleichen Bedingungen). Diese Wahl ergibt sich aus den gebündelten
ShareAlike-Datensätzen (BodyParts3D, Julich-Brain).

Pflicht-Attribution und alle Drittquellen mit Zitation: **[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md)**.

> BodyParts3D, Copyright© The Database Center for Life Science licensed by
> CC Attribution-Share Alike 2.1 Japan

---

## Kontakt

Marcus Ifland · via [GitHub @marifl](https://github.com/marifl)
