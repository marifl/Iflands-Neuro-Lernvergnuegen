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

- **Julich-412 EXISTIERT** (nicht im Repo gebuendelt): `<julich3.glb>` — extern bereitstellen, s. [`scripts/atlas/README.md`](scripts/atlas/README.md) (Datenbeschaffung). **2,37 MB, MESHOPT-komprimiert (nicht Draco!), 292 kortikale Meshes**, Host-Gyrus steht im Namen (`julich3-area-<code>-<host>-<l|r>`).
- **DKT** in `archive/2026-06-11-mni-stack/.../mni152-learn-brain.glb` (Draco) — die figur-relevante gyrale Granularitaet (pars\*=BA44/45/47, ACC, OFC).
- **MNI152 ≠ TARO = zwei verschiedene Hirne** (globale Affine ~22 mm daneben). Methode: **Within-Host-Split** (zentroid-aligned), keine globale Surface-Registrierung. `julich3` und `mni-learn` haben SOGAR UNTERSCHIEDLICHE GLB-Frames → je Quelle eigene `→TARO`-Affine.
- **Voll-Transform liegt fertig auf dem Shelf:** `scripts/atlas/work/atlas-{julich,dkt}.glb` (292 + 60 Parzellen) + `atlas-manifest.json`. **NICHT** in der Runtime — `apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb` enthaelt nur die 24 figur-genutzten Patches und ist die einzige vom App geladene Sub-Patch-GLB.
- **`brain.glb` ist unantastbar.** Sub-Patches kommen immer in separate GLBs.

## Kanonischer Atlas-Modus (fsaverage ≠ TARO)

Eigener App-Modus **„Atlas"** (Footer → Modus → Atlas) zeigt das kanonische **fsaverage**-Hirn,
NICHT TARO — eigener Canvas-Zweig, der den TARO-Viewport ersetzt (Kopf-/Fussleiste bleiben).
Komponente `apps/brain-app/src/viewer/atlas/CanonicalAtlasMode.tsx`. 4 Kortex-Layer (DKT, Destrieux,
Julich-Brain v3, Brodmann) + Subkortex (BG/Thalamus). Details + Pipeline-Reproduktion (4 Extraktoren,
Quellen/Lizenzen) in [`docs/ATLAS_CANONICAL_FEASIBILITY.md`](docs/ATLAS_CANONICAL_FEASIBILITY.md) §7.
Build-Skripte: `scripts/atlas/canonical/`. **Nicht mit der TARO-Figur-Pipeline mischen.**

**„<5 mm auf TARO" ist eine Sackgasse** (gemessen + biologische Decke) — siehe
[`scripts/atlas/README.md`](scripts/atlas/README.md) §3c. fsaverage = präziser Atlas, TARO = schematischer
Figur-Layer. Nicht erneut versuchen, den Voll-Atlas auf TARO zu zwingen.

## Didaktisches Onboarding

Beim ersten Laden zeigt `ModeLauncher` (`apps/brain-app/src/viewer/ModeLauncher.tsx`) einen Start-Screen
für die regulären Modi Lernen, Explorer und Phineas — nimmt die Einstiegslast,
macht die geführten Flows sichtbar (ADHD: Object Permanence, eine klare Aktion). Deep-Links
(`?mode=<learn|explore|phineas|atlas>`, `?scene=<id>` ⇒ Lernen) überspringen ihn (`main.tsx`).
`atlas` bleibt technisch erreichbar, ist aber internes/deep-linkbares Supplement statt normale Startkarte.
Lern- und Phineas-Modus haben Fortschrittsbalken (Time-Blindness). UI-Stil: Memory
`brain-app-editorial-design-system` (ed-btn/eyebrow/ed-panel, theme-tokens NICHT editieren).

**Brücke TARO→Atlas:** Für Kapitel-11-PFC/OFC/Cingulum-Regionen zeigt die Explorer-HUD „Im Atlas zeigen →"
(`apps/brain-app/src/viewer/atlas/atlasBridge.ts`) — springt in den Atlas-Modus und hebt das präzise
fsaverage-Areal hervor (Funktion→Struktur). Nur kuratierte Areale (kein generisches Mapping zwischen zwei Hirnen).

**Atlas auf Hirn (Carve, 0 mm auf TARO):** Fussleisten-Flyout „Atlas" → „Atlas auf Hirn: Aus / DKT / Julich"
blendet die vorhandene Carve-Geometrie (`atlas-carved-{dkt,julich}.glb`) farbig pro Areal auf TARO ein;
Klick zeigt den Areal-Namen (HUD-Chip). Code: `AtlasOverlay.tsx` (carve = per-Areal-Farbe via
`atlasParcels.ts`, depthTest-frei + FrontSide → sichtbar über die volle Anatomie ohne Dura-Okklusion) +
`CutPickBridge.tsx` (`ATLAS_PARCEL_FLAG`-Pick). Das ist der direkte „Areale sehen"-Weg; die fsaverage-Brücke
ist die präzise Zweitsicht. „Atlas roh"-Overlay bleibt Dev-Debug (Drift sichtbar).

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

<alrah-block id="harness" src="registry" v="1.0">## ALRAH Harness

### Default-Workflow (ALRAH-Pfad zuerst)

Bevor du direkt editierst oder Arbeit selbst "nebenbei" erledigst — nimm den ALRAH-Pfad als Default:

- **Feature oder Bugfix** → `alrah contract create "<titel>"` und der Contract-Pipeline folgen (nicht direkt drauflos-editieren).
- **Review** → `alrah role run reviewer` · **Security** → `alrah role run cso` · **Test-/Edge-Case-Pruefung** → `alrah role run qa` · **Bug/Root-Cause** → `alrah role run investigate`.
- **Entscheidungsregel:** Aenderst du Verhalten/Code = Contract. Beurteilst du fremden Code/Risiko = `alrah role run <role>`. Reiner Lookup/Frage = direkt.

Das ist Lenkung, kein Zwang: fuer schnelles, freies Arbeiten `alrah profile use quick --until-commit`.

### Working Principles (Karpathy + FAB + Ponytail — gilt fuer alle ALRAH-Skills)

Eine gemeinsame Sprache fuer Skills, Subagents und Contracts:

1. **Think First** — Annahmen explizit nennen. Bei Mehrdeutigkeit alle Optionen praesentieren, nicht silently waehlen. Frame-Block in jedem Contract beantwortet: Problem (nicht Symptom), Why now, Symptom-vs-Problem, Smallest change.
2. **Simplicity** — Minimum Code/Doku/Tests die das Problem loesen. Keine spekulativen Abstraktionen, keine "Flexibilitaet" die niemand gefordert hat.
3. **Surgical** — Nur anfassen was direkt zum Auftrag gehoert. Adjacent-Refactor explizit aus dem Scope ausgrenzen. Nur eigene Orphans aufraeumen.
4. **Goal-Driven** — Jede Aufgabe ein verifizierbares Ziel (Test, Verdict, Verify-Step). `outcome:` Frontmatter in criteria.md ist Pflicht-Ziel.

FAB-Achsen (siehe `docs/decisions/ADR-005-fab-design-principles.md`) sind komplementaer: I-X als praktische Codierung der gleichen Prinzipien.

**Ponytail** (Plugin, Level `full`) ergaenzt als Coding-Stil: Stdlib vor Dependency, kuerzester Diff, YAGNI-Ladder (braucht es das? → Stdlib? → native Feature? → eine Zeile? → erst dann Code). Karpathy sagt *wie* du denkst, Ponytail sagt *wie minimal* du baust. Details: `/ponytail-help`.

### Context-Locality

Orthogonal zu den Working Principles (die sagen *wie* du denkst) regelt Locality, *wo* der gueltige Kontext steht und wie er aktuell bleibt:

- **Read-Chain (vor Edit):** Bevor du in einem Verzeichnis editierst, lies die naechstgelegene scoped Doc auf dem Pfad root→target (`CLAUDE.md` / `.claude/rules`). Naechste Doc gewinnt fuer lokale Details, Parent-Docs tragen die Repo-weiten Regeln.
- **Doc-Pass (nach Edit):** Aendert sich Purpose, Ownership oder Boundary eines Verzeichnisses, aktualisiere die naechste owning Doc im selben Zug.
- **Anti-Staleness:** Loesche veralteten oder widerspruechlichen Doc-Text sofort. Dokumentiere stabile Kontrakte, keine Verlaufs-/Diary-Eintraege — kein Doc-Rot anhaeufen.
- **Konflikt-Regel:** Die spezifischere Subtree-Doc gewinnt fuer lokale Details; keine Subtree-Doc darf die globalen ALRAH-Prinzipien (Karpathy, Evidence-First, Sprache/Sonderzeichen) schwaechen.
- **Scope:** Gilt fuer die orchestrierende Session. Scope-begrenzte Subagents folgen nur ihrem Task-Prompt (siehe `.claude/rules/subagents.md`).

### Profile
| Profil | Enforcement | Contract |
|--------|-------------|----------|
| `quick` | Keine Gates | Optional |
| `standard` | Warnungen und Lenkung | Optional |
| `full` | Hard-Gates (Default) | Pflicht |

`hooks.quiet: true` — orthogonales Flag: daempft Advisory-/Nudge-Ausgaben auf JEDEM Profil (Enforcement-Haerte bleibt unveraendert).

```bash
alrah profile set <quick|standard|full>  # Projekt-Default
alrah profile use <quick|standard|full>  # Sofort wechseln
alrah profile use quick --until-commit   # Temporaer bis Commit
```

### Evidence First
- Kein Claim über "fertig", "gefixt", "getestet" oder Fortschritt ohne echte Tool-/Command-Evidenz.
- Bei Package-, Library-, Framework- oder Debugging-Arbeit: erst Manifest lesen, dann Context7 nutzen, dann handeln.
- Für Repo-Navigation, Code-Verstehen und Setup-Checks: zuerst `archex` bzw. Archex CLI, danach `rg` als präzise Suche, dann gezielte Reads.
- LSP nur nach einem frischen Build oder Typecheck im aktuellen Worktree; in aktiven Entwicklungsphasen liefert gecachtes LSP sonst false positives.
- Sprache/Sonderzeichen: In Code-Artifakten (Identifiers, Funktions-/Klassen-/Dateinamen, CLI-/Log-/UI-Texten, Testdaten) grundsätzlich `ae`, `oe`, `ue`, `ss` nutzen.
- Variablen-, Funktions- und Dateinamen/Identifiers dürfen keine Umlaute (`ä`, `ö`, `ü`, `ß`) enthalten.
- In menschenbezogenen Texten (Kommentare, Markdown, Dokumentation, Ticket-/Commit-Texte, Reviews, Anweisungen) konsequent normales Deutsch inklusive Umlaute (`ä`, `ö`, `ü`, `ß`) verwenden.
- Umlaute in Code sind nur dann erlaubt, wenn der Kontext explizit ausgenommen wurde (z. B. `daemon`, fachliche Begriffe aus der Domäne, user-provided Ausnahmeliste) oder es sich um reine Kommentare handelt.

### Contract-Workflow
1. `alrah contract create "Feature"` — Contract-Verzeichnis initialisieren
2. `alrah contract plan` — Planner-Prompt anzeigen
3. spec.md + criteria.md schreiben
4. `alrah contract plan-done` — Validiert + aktiviert
5. Implementation durchführen
6. `alrah contract eval` — Evaluation vorbereiten
7. eval-{n}.md schreiben
8. `alrah contract verdict <id>` — Ergebnis verarbeiten

### Escape
Weniger Advisory-Ausgaben: `hooks.quiet: true` in `.agent/alrah.json` setzen
Wenn alles nervt: `alrah profile use quick --until-commit`
Projektweiter Hook-Killswitch: `alrah hooks off` und spaeter `alrah hooks on`

### Commands
```
alrah              Status-Dashboard
alrah contract     Plan → Eval Workflow
alrah profile      Enforcement-Level
alrah hooks        Hook-Killswitch
alrah role show    Backend-Konfiguration
alrah worktree     Isolierte Git-Worktrees pro Contract (create/finish/list/sync/...)
alrah chain        Sequentielle Contract-Ketten (create/run/show/archive)
```

Details: `.claude/rules/alrah.md`</alrah-block>
