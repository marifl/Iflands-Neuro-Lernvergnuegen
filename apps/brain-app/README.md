# MU Brain App

Interaktive 3D-Brain-Lehrmodul-App fuer das Modul **"SS26 — Kognitive Neurowissenschaften"** an der MU. Web-basierte Three.js-Anwendung mit anatomisch korrektem 3D-Hirn (BigBrain + Allen-HRA-Atlas + Z-Anatomy + CIT168 + SUIT), interaktiver Region-Navigation, simulierten Laesionsstudien und einem Phineas-Gage-Lehrpfad.

> **Status:** Standalone-Repository — laeuft ohne Monorepo-Kontext. Voll-Funktionalitaet inklusive 957 MB Atlas-/Mesh-/Slide-Assets.

---

## Voraussetzungen

| Tool | Version | Pflicht | Installation |
|------|---------|---------|--------------|
| **Node.js** | ≥ 20.11.0 | ja | <https://nodejs.org> (LTS) |
| **pnpm** | ≥ 9.0 | ja | `npm install -g pnpm` oder <https://pnpm.io/installation> |
| **Git** | beliebig | optional | Nur fuer Versionierung |
| Moderner Browser | Chrome / Edge / Firefox aktuell | fuer Dev-Server | — |

Die App nutzt **WebGL2**. Auf sehr alter Hardware ohne dedizierte GPU laeuft sie merklich langsamer, ist aber funktional.

---

## Quick Start

```bash
# 1. Dependencies installieren (~3-5 min beim ersten Mal)
pnpm install

# 2. Dev-Server starten (Hot-Reload auf http://localhost:5173)
pnpm dev

# 3. Browser oeffnen → http://localhost:5173
```

Das war's. Beim ersten Laden werden die GLB-Atlas-Meshes (groesster Brocken: ~141 MB Master-Mesh) gestreamt — das dauert bei langsamer Verbindung kurz, danach laeuft alles aus dem Browser-Cache.

---

## Verfuegbare Scripts

| Befehl | Wirkung |
|--------|---------|
| `pnpm dev` | Vite-Dev-Server mit Hot-Reload auf `localhost:5173` |
| `pnpm build` | Production-Build nach `dist/` (TypeScript-Check + Vite-Bundle) |
| `pnpm preview` | Statischer Server fuer den `dist/`-Build (zur lokalen Verifikation) |
| `pnpm typecheck` | TypeScript-Strict-Check ueber das ganze Repo |
| `pnpm test` | Vitest im Watch-Modus |
| `pnpm exec vitest run` | Vitest einmalig ausfuehren (CI-Modus, alle 107 Test-Files) |
| `pnpm test:e2e` | Playwright End-to-End-Tests (Browser-Smoke) |
| `pnpm test:e2e:headed` | Playwright mit sichtbarem Browser |

---

## Distribution als Desktop-App

Fuer Empfaenger ohne Node/Browser-Kontext: die App laesst sich als **native Desktop-Anwendung** fuer Windows, macOS und alle gaengigen Linux-Distros bauen (Doppelklick startet die App, keine Vorinstallation noetig).

Komplette Anleitung mit Electron-Builder-Setup und plattform-spezifischen Empfaenger-Anleitungen:

→ **[`docs/deployment/electron-build.md`](../../docs/deployment/electron-build.md)** (im Monorepo-Kontext)
oder
→ **`docs/deployment/electron-build.md`** (wenn du dieses Verzeichnis als Standalone-Repo verschickt hast — ggf. mitkopieren)

Kurzform: `pnpm electron:build:all` baut nach Einrichtung alle Plattformen parallel.

---

## Projektstruktur

```
apps/brain-app/
├── public/                       ← Atlas-Assets (~957 MB)
│   ├── regions/                  ← per-Region-Markdown-Content
│   ├── slides/                   ← Lehr-Slide-Manifests
│   ├── figs3d/                   ← 3D-Figuren-Bundles
│   ├── companion/                ← Companion-Atlas
│   └── config/                   ← App-Config (TOML)
├── src/
│   ├── runtime/                  ← vendored brain-runtime (Camera-Presets, RAS↔Three-Coord-Conversion)
│   ├── brain-core/               ← Three.js-Engine (Scene, Cuts, BVH, Selection)
│   ├── meshes/                   ← Mesh-Loader, Cut-Caps, Stencil-Pipeline
│   ├── features/                 ← Feature-Module (Exploration, Devtools, Auth, ...)
│   ├── routes/                   ← React-Router-Routes
│   ├── store/                    ← Zustand-Stores
│   ├── core/                     ← Re-Export-Layer zu runtime/ + Coord-Utils
│   └── ...
├── tests/
│   └── e2e/                      ← Playwright-Specs
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Architektur-Stichworte

- **Stack:** React 19 + TypeScript 5.7 + Vite 5 + Three.js 0.184 + Zustand 5
- **3D:** Vanilla Three.js (kein R3F im Core-Renderer), `three-mesh-bvh` fuer schnelle Picking-/Trajektorien-Tests
- **State:** Zustand-Stores, RxJS fuer Event-Bus
- **Storage:** Dexie/IndexedDB fuer Devtools-Persistierung
- **Styling:** Tailwind CSS 4 + Radix UI Primitives
- **Tests:** Vitest 2 (107 Test-Files, ~785 Tests) + Playwright fuer E2E
- **Atlas-Daten:** MNI152-ICBM-2009c-Asym als kanonisches Koordinatensystem (siehe `src/runtime/coords.ts`)

---

## Fuer Empfaenger / Pruefer / Reviewer

Wenn du dieses Repo bekommen hast, um den Code anzuschauen:

1. **Sourcecode anschauen** — alles unter `src/` ist TypeScript, `src/main.tsx` ist der Einstiegspunkt
2. **App im Browser starten** — `pnpm install && pnpm dev` → `http://localhost:5173`
3. **Production-Build pruefen** — `pnpm build` legt `dist/` an
4. **Tests laufen lassen** — `pnpm exec vitest run` (alle Unit-/Integration-Tests, ~10 s)
5. **End-to-End-Tests** — `pnpm test:e2e` (Browser-Smoke via Playwright, dauert laenger)

Bei Problemen mit `pnpm install`:
- Pruefe die Node-Version: `node --version` muss `v20.11.0` oder neuer sein
- Pruefe pnpm: `pnpm --version` muss `9.x` oder neuer sein
- Bei Native-Build-Errors (esbuild): Build-Tools fehlen — auf macOS `xcode-select --install`, auf Ubuntu `sudo apt install build-essential`, auf Windows die Visual Studio Build Tools

---

## Lizenz / Drittquellen

Die App verwendet anatomische Atlas-Daten von Drittquellen unter ihren jeweiligen Lizenzen:

- **BigBrain** — University of Düsseldorf / Montreal Neurological Institute, CC BY-NC-SA 4.0
- **Allen Human Brain Atlas (HRA-2020)** — Allen Institute for Brain Science, eigene Lizenz
- **Z-Anatomy** — open-source Anatomy-Library, CC BY-SA 4.0
- **CIT168** — California Institute of Technology, open use
- **SUIT** — Diedrichsen Lab, open use

Code unter `src/` ist Eigenarbeit fuer das Modul SS26 Kognitive Neurowissenschaften.

---

## Kontakt

Marcus Ifland · via [GitHub @marifl](https://github.com/marifl)
