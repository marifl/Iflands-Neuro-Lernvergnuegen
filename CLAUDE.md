# brain-app standalone — Arbeitsanweisungen

Schlankes, eigenständiges Repo (extrahiert aus dem Monorepo). Bewusst **ohne** das
Monorepo-Kontext-Rauschen, damit das Jitter-Problem auf sauberem Boden debuggt werden kann.

## Setup

```bash
cd apps/brain-app && pnpm install && pnpm dev   # http://localhost:5173
```

`brain-runtime` (`file:`-Dep) und `theme-tokens` (relativer CSS-Import) lösen über die
Verzeichnis-Struktur auf. Keine `pnpm-workspace.yaml` nötig — Struktur nicht umbauen.

## Rohdaten Kapitel 11 (Single Source of Truth)

Alle Quellen für die interaktive 3D-Lern-Experience liegen gesammelt unter [`raw/`](raw/README.md)
(immutable, nicht editieren):

- **Kapitel:** [`raw/chapter/textbook-kapitel11.pdf`](raw/chapter/textbook-kapitel11.pdf) · OCR-Volltext [`raw/chapter/kapitel11-ocr.md`](raw/chapter/kapitel11-ocr.md) · Struktur [`raw/chapter/kapitel11-content-list.json`](raw/chapter/kapitel11-content-list.json) · 40 Bilder [`raw/chapter/images/`](raw/chapter/images/)
- **Präsentation:** [`raw/pptx/`](raw/pptx/) — aktuelle Gruppen-pptx + Text-Extraktion [`raw/pptx/slides-text.md`](raw/pptx/slides-text.md) + eingebettete Medien
- **Figur-Mapping:** [`docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`](docs/KAPITEL11_ABBILDUNGEN_MAPPING.md) — Abb. 11-4…11-15 → Bilddatei
- Details + Provenienz: [`raw/README.md`](raw/README.md)

## Atlas-Geometrie (Julich / DKT / TARO) — NICHT erneut „entdecken"

**Single Source of Truth:** [`scripts/atlas/README.md`](scripts/atlas/README.md) — zuerst lesen, bevor du etwas
ueber Hirn-Atlas-Geometrie behauptest. Die wiederkehrend „neu entdeckten" Fakten, festgehalten:

- **Julich-412 EXISTIERT** (fehlt nur im Archiv DIESES Repos): `/Users/marcusifland/CFH_REAL_LOCAL/brain-app-standalone/public/figs3d/v2/glb/julich3.glb` — **2,37 MB, MESHOPT-komprimiert (nicht Draco!), 292 kortikale Meshes**, Host-Gyrus steht im Namen (`julich3-area-<code>-<host>-<l|r>`).
- **DKT** in `archive/2026-06-11-mni-stack/.../mni152-learn-brain.glb` (Draco) — die figur-relevante gyrale Granularitaet (pars\*=BA44/45/47, ACC, OFC).
- **MNI152 ≠ TARO = zwei verschiedene Hirne** (globale Affine ~22 mm daneben). Methode: **Within-Host-Split** (zentroid-aligned), keine globale Surface-Registrierung. `julich3` und `mni-learn` haben SOGAR UNTERSCHIEDLICHE GLB-Frames → je Quelle eigene `→TARO`-Affine.
- **Voll-Transform liegt fertig auf dem Shelf:** `scripts/atlas/work/atlas-{julich,dkt}.glb` (292 + 60 Parzellen) + `atlas-manifest.json`. **NICHT** in der Runtime — `apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb` enthaelt nur die 24 figur-genutzten Patches und ist die einzige vom App geladene Sub-Patch-GLB.
- **`brain.glb` ist unantastbar.** Sub-Patches kommen immer in separate GLBs.

## Arbeitsregeln

- **Evidence First:** Keine Aussage über "gefixt"/"getestet" ohne Tool-/Command-Evidenz.
- **Surgical Changes:** Nur anfassen was nötig. Bestehenden Stil matchen.
- **Simplicity First:** Minimaler Code für das Ziel.
- **3D-Stack:** Bei R3F/Three.js-Änderungen die Best-Practices beachten
  (Frameloop, Instancing, Material-/Geometrie-Sharing, kein React-Tax im Render-Pfad).
- **Code-Sprache:** Identifiers ohne Umlaute (`ae/oe/ue/ss`). Kommentare/Doku normales Deutsch mit Umlauten.

## Verifikation vor "fertig"

```bash
cd apps/brain-app
pnpm typecheck    # Exit 0
pnpm test         # vitest grün
# Browser-Smoke für jede Render-Änderung (Jitter visuell prüfen)
```
