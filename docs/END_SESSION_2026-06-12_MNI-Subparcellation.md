---
created_at: "2026-06-12T10:27:00+02:00"
session_dauer: "~2.5h (Baseline-Implementierung A0–F1 + MNI-Atlas-Investigation + Subparzellierungs-Plan)"
session_topic: "Kapitel-11 3D-Lern-Experience — Baseline gebaut + MNI-Subparzellierung (ACC/SMA) recherchiert + geplant"
status: erfolgreich
branch: "n/a — Projekt-Konvention: KEIN Git (Checkpoint = Verifikation, Archiv per mv)"
letzter_commit: "n/a — keine Commits (no-git Workflow laut Kickoff + Plan-Arbeitsweise)"
uncommitted_changes: "irrelevant (no-git). Neue Dateien: src/scene/* (Baseline), public/scenes/*.json (7 Szenen + structure-coords.json), scripts/bake-structure-coords.mjs, scripts/smoke-scenes.mjs, public/figures/, docs/superpowers/plans/2026-06-12-mni-subparcellation.md"
best_result: "Baseline 18.06. fertig+verifiziert (typecheck 0, vitest 11/11, Playwright-Smoke alle 7 Szenen+Explorer+Kamera grün). MNI→TARO-Registrierung machbar gemessen (Affine 13–28mm Homolog, Ziel-Parzellen 5–13mm zur Host-Oberflaeche)."
best_result_pfad: "apps/brain-app/src/scene/ (Baseline) + docs/superpowers/plans/2026-06-12-mni-subparcellation.md (naechster Plan)"
blocker: "keiner — naechster Schritt klar definiert (Subparzellierungs-Plan inline ausfuehren)"
naechste_schritte:
  - "Subparzellierungs-Plan inline ausfuehren (Phasen G→K): MNI-Atlas-Parzellen (DKT-ACC + Julich-SMA/preSMA) praezise auf TARO registrieren, als Sub-Patches carven, ins Highlight-/Szenen-System einhaengen"
  - "Residuum-Gate (H4/I2) entscheidet: bei Nichtbestehen Baseline-Fallback (ganzer Gyrus), kein Bruch"
offene_entscheidungen:
  - "Granularitaet ENTSCHIEDEN: nur Kapitel-11-Bedarf (3 Sub-Regionen × 2 = 6 Meshes: anterior-cingulate, sma, pre-sma). Volles Julich verworfen (Cortex-Luecken + zytoarchitektonische statt gyraler Benennung)."
spec_dokument: "docs/superpowers/specs/2026-06-12-kapitel11-3d-lern-experience-design.md (Baseline-Spec)"
plan_dokument: "docs/superpowers/plans/2026-06-12-mni-subparcellation.md (naechster Plan) + docs/superpowers/plans/2026-06-12-kapitel11-3d-lern-experience.md (Baseline, abgeschlossen)"
vorgaenger_dokument: "END_SESSION_2026-06-12_Kapitel11-3D-Lern-Experience-Planung.md"
consumed_by: []
next_session_prompt_present: true
next_session_topic: "MNI-Subparzellierung inline ausfuehren (ACC/SMA praezise auf TARO)"
next_session_branch: "n/a — kein Git (no-commit Workflow)"
next_session_dart_task: "n/a — kein Dart"
---

# Session-Ende: Kapitel-11 Baseline + MNI-Subparzellierungs-Plan

## TL;DR für nächste Session

Die 18.06.-Baseline (SceneStage + 7 Szenen, TARO ganze Gyri, ehrlich gelabelt) ist **fertig und voll verifiziert** (typecheck 0, vitest 11/11, Browser-Smoke grün). Daraufhin recherchiert: BodyParts3D/TARO hat **kein** ACC/SMA-Mesh, aber das Archiv `archive/2026-06-11-mni-stack/` hat MNI-Atlas-GLBs mit exakt diesen Strukturen (DKT-ACC + Julich-SMA/preSMA); MNI→TARO-Registrierung ist machbar gemessen (~1 cm). Nächster Schritt: den fertigen Plan `docs/superpowers/plans/2026-06-12-mni-subparcellation.md` **inline** ausführen (Phasen G→K) — präzise Registrierung + Sub-Patches als echte TARO-Geometrie carven.

## Umgebung & Setup

```
- Projektroot: /Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone
- App-Dir:     apps/brain-app  (cd dorthin fuer pnpm-Befehle)
- KEIN Git-Workflow: .git existiert zwar, aber Konvention = keine Commits/Branches.
                     "Checkpoint" = Verifikation laufen lassen. Archiv per `mv` nach archive/, nie rm.
- Node: v22.22.2  ·  pnpm: 11.4.0
- Stack: React 19 / R3F 9 / drei 10 / three 0.184 / zustand 5 / zod 3 / vitest 2 / @playwright/test 1.49
- Dev-Server: `cd apps/brain-app && pnpm dev` → Port 5173 (oder naechster freier: in dieser Session war es 5175, da 5173/5174 belegt)
- Vitest non-watch (zuverlaessig): `CI=true npx vitest run <name>` (nicht `pnpm test`, das hing im Hintergrund)
- Typecheck: `cd apps/brain-app && pnpm typecheck` (= tsc -b --noEmit, Exit 0)
```

## Was wurde in dieser Session getan?

1. **Baseline A0–F1 implementiert** (Plan `2026-06-12-kapitel11-3d-lern-experience.md`, alle 15 Tasks):
   - A0: `scripts/bake-structure-coords.mjs` → `public/scenes/structure-coords.json` (600 Strukturen, Viewer-Raum, Centroid+BBox+Sphere+48 Surface-Samples). **Plan-Bug gefixt** (Output-Pfad).
   - A1: `src/scene/regions.ts` mit empirisch verifizierten Slugs. **Datenbefund:** kein anterior-cingulate/SMA-Mesh in TARO → `acc-cingulum`=ganzes Cingulum, `sma-presma`=superior-frontal-gyrus.
   - B1/C1/C2/D3/D5: TDD-Logik (brainBridge, scenes/types, router/sceneStore, erpGeometry, nav) — alle Tests grün.
   - B2: CameraRig (Fit-to-Highlight aus structure-coords.json). D1/D2/D4: SceneStage + Overlays.
   - E1–E3: 7 Szenen-JSONs (VCPT-Flowchart, P3a/P3b/P3z ERP-Kurven, Zusammenfassung).
   - F1: `main.tsx` (SceneStage default, `?mode=explore` Explorer), Bild nach `public/figures/`, alte `public/slides/` → `archive/2026-06-12-old-slides/` (mv), `AUTHORING.md`.
2. **Voll-Verifikation Baseline:** typecheck 0, `vitest run` 11/11, Playwright-Smoke (`scripts/smoke-scenes.mjs`): alle 7 Szenen leuchten korrekte Meshes (missing=0), ERP 2 Polylinien, Chrome nur im Szenen-Modus, `?mode=explore` Explorer, Kamera-Framing |p3b-p3a|=224.
3. **MNI-Atlas-Investigation** (User-Frage: gibt es feinere ACC/SMA-Daten?):
   - 4-Ebenen-Beweis: BodyParts3D hat kein ACC/SMA — Part-Katalog, Element-Liste, deploytes GLB, **Live-API** (`bodyparts3d-api`-Skill: `cingulate gyrus`=18kB rendert, `anterior cingulate gyrus`/`supplementary motor area`=678B leer).
   - Archiv `archive/2026-06-11-mni-stack/` durchsucht: GLBs mit **exakten** Strukturen gefunden — `mni152-learn-brain.glb` (DKT: rostral/caudalanteriorcingulate, paracentral), `mni152-allen-fullbrain-gage-context.glb` (Julich: Area 6mp=SMA, 6ma=preSMA, beidseitig).
4. **Registrierungs-Machbarkeit gemessen** (temp-Skripte /tmp/glbbox.mjs, /tmp/regfeasible.mjs): affine MNI→TARO (axis-flip (−x,y,−z) + anisotrope Skalierung) → Homolog-Residuum 13–28mm, Ziel-Parzellen 5–13mm zur TARO-Host-Oberflaeche. Verdikt: korrekte Lokalisation (~1cm), nicht zytoarchitektonisch grenz-exakt (MNI-Mittel vs. TARO-Individuum).
5. **Plan geschrieben:** `docs/superpowers/plans/2026-06-12-mni-subparcellation.md` (Phasen G–K, voller Code + Residuum-Gates).

## Was funktioniert (gesichert)

1. **Baseline-App** — Default lädt SceneStage, 7 Szenen, Highlight + Kamera + Overlays.
   - Verifikation: `cd apps/brain-app && pnpm typecheck && CI=true npx vitest run` → Exit 0, 11/11 grün.
   - Browser: `pnpm dev` → `http://localhost:5173/?scene=p3b-engagement` (Szene direkt), `?mode=explore` (Explorer).
2. **Koordinaten-Bake** — `public/scenes/structure-coords.json` (600 Strukturen).
   - Verifikation: `cd apps/brain-app && node -e "const c=require('./public/scenes/structure-coords.json');console.log(Object.keys(c).length,'Strukturen')"` → 600.
3. **Szenen-Smoke-Harness** — `apps/brain-app/scripts/smoke-scenes.mjs` (Playwright, Regressions-tauglich).
   - Verifikation: Dev-Server starten, dann `cd apps/brain-app && SMOKE_URL=http://localhost:5173 node scripts/smoke-scenes.mjs`.

## Was NICHT funktioniert / Sackgassen

### 1. BodyParts3D/TARO als Quelle für ACC/SMA — gibt es nicht
- **Was:** Geprüft, ob BodyParts3D feinere ACC/SMA-Meshes hat.
- **Ergebnis:** Nein, auf 4 Ebenen verifiziert (inkl. Live-API). BodyParts3D parzelliert den Cortex nur auf **ganze-Gyrus**-Ebene, nicht funktionell/Brodmann.
- **Konsequenz:** Feinere Strukturen müssen aus dem MNI-Atlas (Archiv) kommen → Subparzellierungs-Plan.

### 2. MNI-Parzellen als Overlay auf TARO laden (wie Schädel-Kontext) — geht NICHT direkt
- **Was:** Überlegt, MNI-Meshes wie skull.glb als Layer dazuzuladen.
- **Warum nicht:** Schädel teilt TARO-Raum (gleiches Individuum). MNI ist ein **anderes Hirn** (152-Mittel) → ein Overlay schwebt (~1cm Versatz).
- **Lösung im Plan:** NICHT die MNI-Meshes rendern, sondern als Schablone in TARO-Raum registrieren und Sub-Patches aus **echter TARO-Geometrie** carven (kein Schweben).

### 3. Affine allein für zytoarchitektonische Präzision — reicht nicht (aber für Lokalisation OK)
- **Was:** Reine Affine MNI→TARO gemessen.
- **Ergebnis:** 13–28mm Homolog-Residuum. Korrekte Lokalisation, aber keine Grenz-Präzision.
- **Fundamentale Decke:** MNI152=Populations-Mittel, TARO=Individuum — keine 1:1-Sulcus-Korrespondenz möglich. Mediale Wand (SMA/ACC) stereotyp → dort am besten. Plan nutzt zusätzlich lokale CPD pro Host-Gyrus + Residuum-Gate.

### 4. `pnpm test <name>` hängt im Hintergrund
- **Fallstrick:** `pnpm test` startet Vitest im Watch-Modus → blockiert.
- **Fix:** Immer `CI=true npx vitest run <name>` nutzen.

## Aktuelle Dateien & Pfade

```
apps/brain-app/
├── src/scene/                         # AKTIV — Baseline-Code (Subparzellierung haengt hier an)
│   ├── regions.ts                     # AKTIV — Region-Slugs (J2 erweitert um acc-anterior/sma/pre-sma)
│   ├── SceneStage.tsx, sceneStore.ts, router.ts, nav.ts, brainBridge.ts, CameraRig.tsx, ...
│   └── overlays/                      # ErpChart, Flowchart, Prose, ImageFallback, OverlayPanel
├── src/viewer/
│   ├── BodyParts3DViewer.tsx          # AKTIV — DEV-Handles __THREE__/__THREE_SCENE__/__CAMERA__ (nur DEV, bleiben)
│   └── (SubParcels.tsx)               # NOCH NICHT — wird in J1 erstellt
├── public/scenes/                     # AKTIV — 7 Szenen-JSONs + structure-coords.json + AUTHORING.md
├── public/assets/bodyparts3d/
│   ├── brain.glb                      # AKTIV — TARO, Draco, 600 Meshes, UNANGETASTET lassen
│   └── (k11-subparcels.glb)           # NOCH NICHT — Output von I1
├── public/figures/                    # AKTIV — VCPT-Bild
└── scripts/
    ├── bake-structure-coords.mjs      # AKTIV — Koordinaten-Bake
    └── smoke-scenes.mjs               # AKTIV — Szenen-Smoke (Regression)

scripts/atlas/                         # NOCH NICHT — wird in G1 erstellt (Subparzellierungs-Pipeline)
archive/2026-06-11-mni-stack/          # QUELLE — MNI-Atlas-GLBs (learn-brain DKT, allen-fullbrain Julich)
archive/2026-06-12-old-slides/         # ARCHIV — alte Slides (mv, nicht loeschen)
docs/superpowers/plans/
├── 2026-06-12-kapitel11-3d-lern-experience.md   # ABGESCHLOSSEN (Baseline)
└── 2026-06-12-mni-subparcellation.md            # AKTIV — naechster Plan (G→K)
```

**Temp-Mess-Skripte (in /tmp, nicht im Repo):** `/tmp/glbbox.mjs`, `/tmp/glbnames.mjs`, `/tmp/regfeasible.mjs`, `/tmp/allenreg.mjs` — können beim nächsten Lauf neu erzeugt werden; der Plan nutzt eigene Skripte unter `scripts/atlas/`.

## Offene Entscheidungen

1. **Granularität — ENTSCHIEDEN:** nur Kapitel-11-Bedarf = 3 Sub-Regionen (anterior-cingulate, sma, pre-sma) × 2 Hemisphären = 6 Sub-Patch-Meshes.
   - Verworfen: volles Julich (168 Areale) — Cortex-Lücken + zytoarchitektonische statt gyraler Benennung. DKT als Rückgrat + 4 Julich-BA6-Parzellen aufgepfropft.
2. **Darstellung — ENTSCHIEDEN:** Sub-Patches sauber in die Ontologie an den korrekten Stellen eingruppiert (unter cingulate-gyrus bzw. superior-frontal-gyrus), als echte TARO-Geometrie (kein schwebendes MNI-Mesh, kein MNI-Inset).
3. **Timing — User-Entscheidung:** Subparzellierungs-Plan INLINE in neuer Session ausführen (dieses Handover). Baseline bleibt unberührt; bei Gate-Fail Fallback auf ganzen Gyrus.

## Befehle zum Fortsetzen

```bash
# 1. Ins Projekt
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone"

# 2. Baseline-Smoke (muss gruen sein, bevor additiv gebaut wird)
cd apps/brain-app && pnpm typecheck && CI=true npx vitest run
# Erwartet: Exit 0, 11/11 Tests gruen

# 3. Plan oeffnen (Single Source of Truth fuer die Subparzellierung)
#    docs/superpowers/plans/2026-06-12-mni-subparcellation.md  — Phasen G→K, "## Fortschritt"

# 4. Phase G1 starten: Tooling-Setup
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas" 2>/dev/null || mkdir -p "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas"
# (weiter exakt nach Plan G1 Step 1: Python venv + requirements.txt)
```

## Offene Tasks (Claude Task-Management — persistiert, da nicht über Sessions erhalten)

| Task | Status | Notiz |
|------|--------|-------|
| Baseline A0–F1 (#1–#15) | completed | 18.06.-Baseline fertig+verifiziert |
| MNI→TARO Machbarkeits-Prototyp (#16) | completed | Verdikt: machbar, ~1cm, Sub-Patch-Architektur |
| Subparzellierungs-Plan schreiben (#17) | completed | docs/superpowers/plans/2026-06-12-mni-subparcellation.md |
| **Subparzellierung G→K ausführen** | **offen** | Nächste Session — dieser Handover. Plan ist Single Source of Truth. |

## Next-Session Prompt

> Copy-paste in eine neue Claude-Session. Der `/session-kickoff`-Skill kann das auch
> automatisch laden — siehe `next_session_*` Felder im Frontmatter oben.

```markdown
# Session-Auftrag: MNI-Subparzellierung inline ausführen (ACC/SMA präzise auf TARO)

## Kontext (lies das zuerst, in dieser Reihenfolge)

1. **Plan-Doc (Single Source of Truth):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/docs/superpowers/plans/2026-06-12-mni-subparcellation.md` — Phasen G→K mit vollständigem Code + Residuum-Gates. `## Status-Header` + `## Fortschritt` zeigen den Stand (noch nicht gestartet).
2. **Vorgänger-Handover:** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/docs/END_SESSION_2026-06-12_MNI-Subparcellation.md` — diese Datei; Sackgassen + gemessene Residuen + Entscheidungen.
3. **Baseline-Plan (abgeschlossen, Referenz):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/docs/superpowers/plans/2026-06-12-kapitel11-3d-lern-experience.md` — wie SceneStage/regions.ts/CameraRig gebaut sind.
4. **Code-Truth (Schädel-Layer-Vorbild + Mount-Punkt):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/BodyParts3DViewer.tsx` (`ContextSkull` = Muster für den neuen `SubParcels`-Layer; DEV-Handles bleiben) + `.../src/scene/regions.ts` (Slug-System) + `.../public/scenes/structure-coords.json` (TARO-Geometrie, Viewer-Raum).
5. **Quelle (MNI-Atlas):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/archive/2026-06-11-mni-stack/public/figs3d/v2/glb/` — `mni152-learn-brain.glb` (DKT-ACC) + `mni152-allen-fullbrain-gage-context.glb` (Julich 6mp/6ma).
6. **Konstraint-Doc:** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/CLAUDE.md` + `DESIGN.md` — Identifiers ohne Umlaute, theme-tokens/ nicht editieren, Headless-WebGL für reine Geometrie OK (Bake bewiesen), aber visuelle Smokes in echtem Chrome.

Memory-Checks (PFLICHT — existieren alle in diesem Projekt):
- `kapitel11-3d-lern-experience` — Projektscope, Baseline-Status, MNI-Befund + Subparzellierungs-Plan-Verweis, Quell-Inventur (TARO+DKT+Julich).
- `bodyparts3d-laterality-double-error` — Daten-Caveat (fehlende/gesplittete Strukturen), relevant fürs Vertex-Labeling.
- `brain-app-editorial-design-system` — app.css-Overrides, theme-tokens nicht editieren, 3D-Viewport dunkel.
- `kapitel11-clinical-scope` — nur PFC/BG-Fokus.

## Ziel

Am Ende existiert `apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb` mit 6 Sub-Patch-Meshes (`left/right-anterior-cingulate`, `left/right-sma`, `left/right-pre-sma`) aus **echter TARO-Geometrie**, präzise per MNI-Atlas-Registrierung (Affine + CPD, gemessenes Residuum) auf die TARO-Oberfläche gelabelt; der Viewer lädt sie als default-hidden Layer; P3a hebt `acc-anterior`, P3z `sma-presma` (Sub-Patches) hervor — ein **Teilbereich** des Gyrus leuchtet, nicht der ganze. `pnpm typecheck`=0, bestehende vitest-Tests grün, Browser-Smoke bestanden. Bei Residuum-Gate-Fail: Baseline-Fallback (ganzer Gyrus), sauber dokumentiert, kein Bruch.

## Auftrag

REQUIRED SUB-SKILL: superpowers:executing-plans (inline, Batch mit Verifikations-Checkpoints).

### Pre-Flight (vor jedem Edit)

1. KEIN Git — kein Branch/Tag/Commit. „Checkpoint" = Verifikation laufen lassen. Archiv ausschließlich per `mv` nach `archive/`, nie `rm`. (Projekt-Konvention, auch wenn `.git` existiert.)
2. Verzeichnis: `cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone"`
3. Baseline-Smoke (muss grün sein, bevor additiv gebaut wird): `cd apps/brain-app && pnpm typecheck && CI=true npx vitest run` — Exit 0, 11/11 grün. (Sonst Stop: Baseline-Regression zuerst klären.)
4. Plan öffnen, `## Fortschritt` ist die Trackingliste — Checkboxen einzeln abhaken, nicht batchen. `TaskCreate`/`TaskUpdate` parallel pflegen.
5. Vitest non-watch: immer `CI=true npx vitest run <name>` (nicht `pnpm test`).

### Implementation (Plan-Reihenfolge strikt: G1 → G2 → G3 → H1 → H2 → H3 → H4 → I1 → I2 → J1 → J2 → J3 → J4 → K1)

- **G (Decode):** `scripts/atlas/decode_glb.mjs` (Playwright+three, Draco über gstatic-Decoder wie die App). Dev-Server NICHT nötig — `decode_glb.mjs` lädt das GLB direkt als Bytes. TARO + 2 MNI-GLBs nach `scripts/atlas/work/*.json` dekodieren.
- **H (Registrierung):** `scripts/atlas/register.py` (Python venv mit numpy/scipy/pycpd/trimesh). Vier Stufen, jede mit gemessenem Residuum: H1 allen→learn (Frame-Konsolidierung, erwartet <6mm), H2 learn→TARO (Affine, leave-one-out 12–20mm), H3 CPD pro Host-Gyrus (best-of vs. Affine), H4 TARO-Vertex-Labeling + Gate (≥30 Vertices, Median < THRESH=6mm).
- **GATE nach H4/I2:** Wenn ein Sub-Patch das Minimum reißt oder Median > THRESH → laut stoppen, NICHT mit Mini-/Fehl-Patch weiterbauen. P3a/P3z bleiben dann beim ganzen Gyrus (J2/J4 NICHT ändern). Befund im Plan unter H4 dokumentieren.
- **I (Asset):** `scripts/atlas/build_subparcels.mjs` (`@gltf-transform/core`) carvt aus TARO-Host-Geometrie + `labels.json` → `k11-subparcels.glb` (Viewer-Raum). I2 Validierung: Centroid medial/superior/anterior plausibel, pre-sma anterior zu sma.
- **J (Integration):** `SubParcels.tsx` (Schädel-Muster: default-hidden, Highlight per Mesh-Name, polygonOffset). `regions.ts` um `acc-anterior`/`sma`/`pre-sma`/`sma-presma` erweitern. Ontologie-Knoten (J3, optional). Szenen P3a→`acc-anterior`, P3z→`sma-presma`.
- **CameraRig-Note (K1):** `CameraRig` liest `unionBounds` aus `structure-coords.json` — die neuen Sub-Patch-Namen fehlen dort → würde laut werfen. Fix: `build_subparcels.mjs` schreibt zusätzlich Centroid/BBox/Sphere/Surface der 6 Sub-Patches an `structure-coords.json` an (deterministisch, framt den Teilbereich exakt). Als Step in I1 ergänzen, sobald K1 es erfordert.

### Verification (Evidence-First — keine „fertig"-Aussage ohne Output)

1. `cd apps/brain-app && pnpm typecheck` — Exit 0.
2. `CI=true npx vitest run` — alle bestehenden Tests grün (keine wurden geändert).
3. Registrierungs-Residuen aus `scripts/atlas/work/residuals.json` (H1 <6mm, H2 LOO-mean, H3 CPD-best, H4 Median je Sub-Patch < THRESH) — Zahlen im Plan unter den Steps notieren.
4. Browser-Smoke (echtes Chrome): `pnpm dev`, `?scene=p3a-konfliktmonitoring` + `?scene=p3z-inhibition` — ein **Teilbereich** des Cingulum bzw. SFG leuchtet (nicht der ganze Gyrus), Sub-Patch-Mesh sichtbar, kein Z-Fighting-Flackern, Kamera framt.

### Plan-Doc Updates (PFLICHT, parallel zur Arbeit)

- `## Status-Header` (Aktive Wave, letzter Checkpoint) aktualisieren.
- `## Fortschritt`-Checkboxen `- [ ]` → `- [x]` einzeln je fertigem Task.
- Findings/Abweichungen + gemessene Residuen direkt unter dem jeweiligen Step (`> Note:` / `> BLOCKER:`).

### Checkpoint-Strategie (kein Git)

Pro abgeschlossenem Task: relevante Verifikation laufen lassen (Residuum / typecheck / Smoke), Plan-Checkbox setzen. Kein Commit. Vor destruktiven Schritten per `mv` sichern, nie `rm`.

## Constraints (kritisch)

- **Kein Git** — keine Commits/Branches; Archiv ausschließlich per `mv`. (Konvention, trotz vorhandenem `.git`.)
- **brain.glb UNANGETASTET** — Sub-Patches kommen in ein SEPARATES `k11-subparcels.glb`. Surgical Changes.
- **Keine stillen Fallbacks** — laute Fehler mit Kontext (Plan nutzt das überall: leere Vertex-Sets, fehlende Meshes, Gate-Fail werfen laut). Globale Regel `~/.claude/CLAUDE.md`.
- **theme-tokens/ NICHT editieren** — Overrides nur in `apps/brain-app/src/app.css`. Memory `brain-app-editorial-design-system`.
- **Identifiers ohne Umlaute** (`ae/oe/ue/ss`); Kommentare/Doku/Prosa mit echten Umlauten.
- **Browser-Smoke in echtem Chrome** — Headless-WebGL für reine Geometrie OK (Bake/Decode bewiesen), aber visuelle Beurteilung in echtem Chrome.
- **Baseline-Schutz** — die 18.06.-Baseline läuft; bei Gate-Fail Fallback auf ganzen Gyrus, P3a/P3z-Szenen/regions.ts NICHT verschärfen.
- **Evidence-First** — keine „fertig"-Aussage ohne Tool-/Command-Output (Residuen, typecheck, Smoke).

## Anti-Patterns (vermeiden)

- `brain.glb` direkt splitten/überschreiben → Produktiv-Asset zerstört. Sub-Patches IMMER in separates GLB.
- MNI-Meshes schwebend dazuladen ohne Registrierung → ~1cm Versatz, falsche Lokalisation. Nur registrierte TARO-Geometrie carven.
- Gate ignorieren und Mini-/Fehl-Patch bauen → falsche Region leuchtet. Bei <30 Vertices / Median > THRESH laut stoppen + Fallback.
- `regions.ts`-Slug `sma-presma` verschärfen, BEVOR das Gate bestanden ist → bricht P3z. Erst nach grünem I2.
- `pnpm test` (Watch, hängt) statt `CI=true npx vitest run`.
- Sub-Patch-Namen in `build_subparcels.mjs` / `labels.json` / `regions.ts` / `SubParcels.tsx` / Szenen divergieren lassen → Highlight greift nicht. Eine Namens-Quelle: `left/right-anterior-cingulate`, `left/right-sma`, `left/right-pre-sma`.
- CameraRig vergessen zu erweitern → `unionBounds` wirft laut bei Sub-Patch-Highlight (siehe CameraRig-Note in K1).

## Nächste Session nach diesem

Nach grüner Subparzellierung: Export B (PNG/MP4 pro Szene), Topografie-Heatmaps, restliche Kapitel-Abbildungen 11-4…11-13 durch die Kollegen via `public/scenes/*.json`. Je eigene Pläne.

---

Start mit Pre-Flight Schritt 1.
```
