# Iflands Neuro Lernvergnügen

Eine interaktive 3D-Lern-Experience für **Kapitel 11 — exekutive Funktionen**
(präfrontaler Cortex, Basalganglien-Schleifen, ereigniskorrelierte Potenziale
wie VCPT/ERP, Fallstudie Phineas Gage). Komplexe Neuroanatomie wird räumlich
begreifbar: anklickbare, isolierbare Strukturen auf einem anatomisch echten
3D-Hirn, geführte Lern-Szenen und eine editoriale, ruhige Oberfläche.

[![Lizenz: CC BY-SA 4.0](https://img.shields.io/badge/Lizenz-CC%20BY--SA%204.0-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/R3F-9-black)
![Three.js](https://img.shields.io/badge/Three.js-0.184-049ef4?logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)

---

## Quick Start

> [!NOTE]
> Voraussetzungen: **Node.js ≥ 20** und **[pnpm](https://pnpm.io/installation) ≥ 9**.

```bash
cd apps/brain-app
pnpm install      # einmalig, ~3-5 min
pnpm dev          # Dev-Server auf http://localhost:5173
```

<details>
<summary><strong>📦 Schritt-für-Schritt-Installation für Einsteiger (macOS · Windows · Linux) — aufklappen</strong></summary>

<br>

Diese Anleitung richtet sich an **Einsteiger ohne Vorkenntnisse**. Am Ende läuft die
App in deinem Browser. Plane beim ersten Mal ca. **15 Minuten** ein.

**Schritt 1 — Projekt herunterladen (alle Systeme)**

1. Öffne <https://github.com/marifl/Iflands-Neuro-Lernvergnuegen>
2. Grüner Button **`< > Code`** → **`Download ZIP`**.
3. ZIP **entpacken** (Doppelklick auf macOS; Rechtsklick → „Alle extrahieren" auf Windows).
4. Du erhältst den Ordner **`Iflands-Neuro-Lernvergnuegen-main`** (z. B. in „Downloads"). Den brauchen wir gleich.

**Schritt 2 — Node.js installieren**

- **macOS:** <https://nodejs.org> → Button **„LTS"** laden → `.pkg` öffnen → durchklicken (Fortfahren → Installieren → Passwort).
- **Windows:** <https://nodejs.org> → Button **„LTS"** laden → `.msi` öffnen → durchklicken (Next → akzeptieren → Install → Finish).
- **Linux** (Paketquellen sind oft zu alt → `nvm` nutzen):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
  nvm install --lts
  ```

**Schritt 3 — Terminal öffnen**

- **macOS:** `Cmd`+`Leertaste`, `Terminal` tippen, Enter.
- **Windows:** `Windows`-Taste, `PowerShell` tippen, Enter. (Oder im Projektordner: `Shift`+Rechtsklick → „PowerShell-Fenster hier öffnen".)
- **Linux:** `Strg`+`Alt`+`T`, oder im Dateimanager Rechtsklick → „Im Terminal öffnen".

> Alle folgenden Befehle ins Terminal tippen/kopieren und mit `Enter` bestätigen.

**Schritt 4 — pnpm aktivieren (einmalig)**

```bash
corepack enable pnpm
```
> Falls das einen Fehler gibt: stattdessen `npm install -g pnpm`.

**Schritt 5 — In den App-Ordner wechseln**

Tippe `cd ` (mit Leerzeichen), **ziehe den entpackten Ordner ins Terminal** (Pfad erscheint automatisch) und ergänze `/apps/brain-app`:

```bash
# macOS / Linux (Pfad ggf. anpassen)
cd ~/Downloads/Iflands-Neuro-Lernvergnuegen-main/apps/brain-app
```
```powershell
# Windows (Pfad ggf. anpassen)
cd $HOME\Downloads\Iflands-Neuro-Lernvergnuegen-main\apps\brain-app
```

**Schritt 6 — Installieren und starten**

```bash
pnpm install      # laedt die Bausteine — beim ersten Mal ~3-5 Min.
pnpm dev          # startet die App
```

**Schritt 7 — Im Browser öffnen**

Erscheint im Terminal `Local: http://localhost:5173/`, öffne diese Adresse im Browser. **Die App läuft.** 🎉

> **Beenden:** im Terminal `Strg`+`C` (auch am Mac `Ctrl`+`C`). **Neu starten:** wieder `pnpm dev` im App-Ordner.

---

**Hilfe bei Problemen**

| Problem | Lösung |
|---------|--------|
| `command not found: node` / „node nicht erkannt" | Terminal **neu öffnen**; ggf. Node-Installation wiederholen. |
| `command not found: pnpm` | `corepack enable pnpm` (sonst `npm install -g pnpm`). |
| `corepack: command not found` | Node zu alt → neueste **LTS** von <https://nodejs.org>. |
| `5173 is in use` | Läuft schon. Anderes Terminal schließen oder angezeigte Alternativ-Adresse öffnen. |
| `pnpm install` bricht mit Build-Fehlern ab | **macOS** `xcode-select --install`; **Ubuntu/Debian** `sudo apt install build-essential`; **Windows** Node-Installer erneut + „Tools for Native Modules". |
| Seite bleibt weiß | Kurz warten (3D-Meshes laden), neu laden; moderner Browser nötig (WebGL2). |

> Prüfen: `node --version` ≥ `v20`, `pnpm --version` ≥ `9`. Es klemmt weiter? Ein [Issue](https://github.com/marifl/Iflands-Neuro-Lernvergnuegen/issues) mit der genauen Fehlermeldung öffnen.

</details>

> [!TIP]
> Die 3D-Atlas-Meshes liegen bereits im Repo (`apps/brain-app/public/assets/`) — die
> App läuft direkt nach `pnpm install`, **ohne separaten Daten-Download oder Build**.

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

> Inhaltlicher Fokus und Designprinzipien: [`PRODUCT.md`](PRODUCT.md) · [`DESIGN.md`](DESIGN.md)

---

## Tastatur-Shortcuts

| Taste | Wirkung |
|-------|---------|
| `H` | ausgewählte Struktur aus-/einblenden |
| `Shift` + `H` | alle ausgeblendeten Strukturen wieder zeigen |
| `I` | ausgewählte Struktur isolieren |
| `Shift` + `I` | Isolation aufheben |
| `Esc` | Auswahl aufheben; erneut: eine Ebene zurück (Isolation/Drilldown) bzw. Overlay schließen |
| `←` / `→` | im Lern-Modus: vorige / nächste Szene |
| `F` | Vollbild (mit `Esc` beenden) |

> [!NOTE]
> Shortcuts greifen nicht, solange ein Textfeld (z. B. die Suche) fokussiert ist.

---

## Wegweiser — was finde ich wo?

| Du willst… | Hier |
|------------|------|
| …die App starten | `apps/brain-app/` → `pnpm install && pnpm dev` ([Quick Start](#quick-start)) |
| …die 3D-Meshes (`.glb`) | `apps/brain-app/public/assets/bodyparts3d/` und `…/context/`; Atlas-Labels in `…/assets/atlas-canonical/` |
| …den Lerninhalt sehen | im App-UI; Quelltexte unter `apps/brain-app/public/regions/*.md` und `public/scenes/*.json` |
| …die Quellen / Zitate (APA7) | je Region im Abschnitt „## Quellen"; Atlas-/Daten-Lizenzen in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) |
| …den App-Code lesen | `apps/brain-app/src/` (`main.tsx` → `scene/` + `viewer/`) |
| …die 3D-Daten selbst erzeugen | `scripts/` ([Daten & Asset-Pipelines](#daten--asset-pipelines)) |
| …Produkt / Design verstehen | [`PRODUCT.md`](PRODUCT.md), [`DESIGN.md`](DESIGN.md) |
| …die Lizenz | [`LICENSE`](LICENSE) (CC BY-SA 4.0) |

---

## Befehle

Alle in `apps/brain-app` ausführen:

| Befehl | Wirkung |
|--------|---------|
| `pnpm dev` | Vite-Dev-Server mit Hot-Reload (`localhost:5173`) |
| `pnpm build` | Atlas-Config erzeugen, dann Production-Build nach `dist/` (`tsc -b && vite build`) |
| `pnpm preview` | statischer Server für den `dist/`-Build |
| `pnpm preview:lan` | statischer Server für den `dist/`-Build im lokalen Netzwerk |
| `pnpm typecheck` | Atlas-Config erzeugen, dann TypeScript-Strict-Check (`tsc -b --noEmit`) |
| `pnpm test` | Atlas-Config erzeugen, dann Vitest einmalig (CI-tauglich) |
| `pnpm test:watch` | Atlas-Config erzeugen, dann Vitest im lokalen Watch-Modus |
| `pnpm test:e2e` | Playwright End-to-End-Smoke-Tests |

---

## Tech-Stack

- **React 19** + **TypeScript 5.7** + **Vite 5**
- **3D:** **Three.js 0.184** über **React Three Fiber 9** + **drei 10**, `three-mesh-bvh` für schnelles Picking
- **State:** **Zustand 5**
- **UI:** Radix-Primitives, Tailwind CSS, Editorial-Theme (`src/app.css` + `theme-tokens`)
- **Tests:** **Vitest 2** (Unit/Integration) + **Playwright 1.49** (E2E)

<details>
<summary><strong>Projektstruktur</strong> (aufklappen)</summary>

```
apps/brain-app/              Die App (Vite / React / R3F)
├── src/
│   ├── main.tsx             Einstiegspunkt (Deep-Link-Routing: ?mode=, ?scene=, ?config=)
│   ├── scene/               Lern-Szenen, Kamera-Rig, Overlays (ERP-Charts etc.)
│   ├── viewer/              3D-Viewer, Strukturbaum, FooterBar, Färbe-/Cut-Werkzeuge
│   └── app.css              app-lokale Editorial-Theme-Schicht
└── public/
    ├── assets/
    │   ├── bodyparts3d/     3D-Meshes (.glb): brain, k11-subparcels, atlas-*
    │   ├── context/         Kopf-/Schädel-Meshes (Phineas-Gage-Kontext)
    │   └── atlas-canonical/ fsaverage-Atlas-Labels (.i16/.f32/.u32)
    ├── regions/             pro-Region-Markdown (Funktion, Brodmann-Areal, Quellen)
    ├── scenes/              Lern-Szenen als JSON (eigener didaktischer Content)
    ├── companion/           Companion-Atlas-Daten + Presets
    └── config/              Farb-/Material-Presets, Szenen-Config

packages/brain-runtime/      Koordinaten-Helfer (file:-Dependency der App)
packages/theme-tokens/       Design-Tokens (via relativem CSS-Import)
scripts/                     Asset-Erzeugungs-Pipelines
```

`brain-runtime` und `theme-tokens` lösen rein über die Verzeichnisstruktur auf —
**keine `pnpm-workspace.yaml` nötig**.

</details>

---

## Daten & Asset-Pipelines

Die ausgelieferten 3D-Meshes und Atlas-Labels sind aus offen lizenzierten Quellen
**abgeleitet und im Repo gebündelt**. Sie lassen sich vollständig aus den Skripten
reproduzieren (man braucht dazu die Original-Quelldaten der jeweiligen Anbieter):

| Verzeichnis | Zweck | Doku |
|-------------|-------|------|
| [`scripts/assets/bodyparts3d/`](scripts/assets/bodyparts3d/README.md) | BodyParts3D-OBJ → `brain.glb` (+ Kontext-Kopf/Schädel), Spiegelung, FMA-Ontologie | [README](scripts/assets/bodyparts3d/README.md) |
| [`scripts/atlas/`](scripts/atlas/README.md) | Atlas-Geometrie (Julich / DKT / Destrieux / Brodmann / fsaverage) auf das TARO-Hirn registrieren, Sub-Parzellen carven | [README](scripts/atlas/README.md) |
| `scripts/alignment/` | kanonische Referenz-JSONs (von Tests genutzt) | — |

### SP3-Configs nach SP5.1 migrieren

SP5.1 macht `mesh_mappings` zum Pflichtteil der kanonischen Atlas-Config.
Eine alte SP3-Config ohne Root-Key `mesh_mappings` darf nicht mehr still
geladen werden; der Builder bricht absichtlich mit
`build-config: mesh_mappings fehlt oder ist kein Objekt` ab.

Migration:

1. `scripts/atlas/config.default.toml` bleibt die einzige Autorenquelle.
2. Bucket-Mappings unter `[mesh_mappings.buckets.<slug>]` eintragen.
3. Scene-Region-Mappings unter `[mesh_mappings.scene_regions.<slug>]` eintragen.
4. Jeder Mapping-Knoten braucht `meshes = [...]`. Bekannte Geometrie-Lücken
   werden explizit mit `meshes = []`, `known_gap = true` und `gap_reason`
   dokumentiert.
5. Configuration-Felder wie `regions.buckets`, `regions.scene_regions` und
   `colors.groups[].buckets` referenzieren diese Slugs; sie duplizieren keine
   Mesh-Listen.
6. Aus dem Repo-Root bauen und prüfen:
   ```bash
   node scripts/atlas/build-config.mjs
   node --test scripts/atlas/build-config.test.mjs
   pnpm --dir apps/brain-app typecheck
   ```

Der Builder schreibt `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`
und `apps/brain-app/src/viewer/meshMappings.generated.json`. Beide sind abgeleitete
Artefakte; sie werden nicht von Hand als zweite Wahrheit gepflegt. Die
App-Scripts `dev`, `build`, `typecheck` und `test` führen den Builder vorab aus,
damit ein frischer Checkout kein lokales Mapping-Artefakt voraussetzt.

> [!NOTE]
> **Quelldaten** (selbst beziehen, unter deren Lizenzen): BodyParts3D
> (lifesciencedb.jp/bp3d), FreeSurfer `fsaverage`, EBRAINS Julich-Brain, CIT168.
> Details + Zitationen in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

---

## Lizenz & Attribution

Das gesamte Werk steht unter **[CC BY-SA 4.0](LICENSE)** (Namensnennung +
Weitergabe unter gleichen Bedingungen). Diese Wahl ergibt sich aus den gebündelten
ShareAlike-Datensätzen (BodyParts3D, Julich-Brain).

> [!IMPORTANT]
> Pflicht-Attribution (darf nicht verändert werden):
> *BodyParts3D, Copyright© The Database Center for Life Science licensed by
> CC Attribution-Share Alike 2.1 Japan.*
> Alle Drittquellen mit Zitation: [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

---

## Kontakt

Marcus Ifland · via [GitHub @marifl](https://github.com/marifl)
