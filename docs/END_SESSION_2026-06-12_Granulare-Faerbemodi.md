---
created_at: "2026-06-12T18:34:38+02:00"
session_dauer: "~2.5h (Investigation + Plan + W1-A/C/D Implementation)"
session_topic: "Granulare Färbemodi — Figur-Färb-Engine + EEG-Sync (Wave 1: A/C/D fertig, B offen)"
status: teilweise_erfolgreich
branch: feature/grundmodi-steuerleiste
letzter_commit: "ad697c5 chore(repo): Buch-Abbildung aus Tracking entfernen, figures/ ignorieren (VOR dieser Session; W1-Arbeit ist uncommitted)"
uncommitted_changes: "ja — 12 geänderte Dateien (+639/-118) + neue: bucketMeshes.ts, colorPresets.ts(+test), PresetLegend.tsx, erpAnimation.ts(+test), scripts/atlas/smoke-{preset,figures,eeg}.mjs, DESIGN.md, PRODUCT.md, Plan-Doc. NICHT committet (Projekt-Konvention bisher no-commit/Checkpoint=Verifikation)."
best_result: "Wave 1 zu 3/4 fertig + verifiziert: Färb-Engine + 2 Figuren (11-05/11-13) + Legende + EEG voll-synchron (P3a). typecheck 0, vitest 46/46, 3 Browser-Smokes OK."
best_result_pfad: "apps/brain-app/src/viewer/{bucketMeshes,colorPresets,erpAnimation,PresetLegend}.ts(x) + docs/superpowers/plans/2026-06-12-granulare-faerbemodi.md"
blocker: "keiner — W1-B (DKT-Geometrie-Pipeline) ist klar definiert, eigener Block"
naechste_schritte:
  - "W1-B: register.py von 6 Patches auf figur-kritische DKT-Splits generalisieren (IFG→pars*, ACC→rostral/caudal, OFC→lateral/medial, + accumbens)"
  - "Erweitertes k11-subparcels.glb backen + structure-coords.json ergänzen"
  - "regions.ts + bucketMeshes.ts auf die neuen Sub-Patches verfeinern → 11-04 freischalten + 11-05/11-13 sub-gyral"
offene_entscheidungen:
  - "Carve-Threshold für laterale DKT-Parzellen (Within-Host-Split) — Gate-Wert pro Host empirisch festlegen"
spec_dokument: keines
plan_dokument: "docs/superpowers/plans/2026-06-12-granulare-faerbemodi.md (W1-A/C/D abgehakt, W1-B offen)"
vorgaenger_dokument: "END_SESSION_2026-06-12_MNI-Subparcellation.md"
consumed_by: []
next_session_prompt_present: true
next_session_topic: "W1-B — DKT-Split-Pipeline generalisieren (granulare Geometrie auf TARO)"
next_session_branch: "feature/grundmodi-steuerleiste"
next_session_dart_task: "n/a — kein Dart"
---

# Session-Ende: Granulare Färbemodi — Wave 1 (A/C/D fertig, B offen)

## TL;DR für nächste Session

Figur-spezifische **Färb-Engine** ist gebaut + verifiziert: Presets aus `color-presets.json` färben einzelne Hirnareale didaktisch (11-05 Petrides + 11-13 ACC-Bush live mit Legende), plus **EEG voll-synchron** (P3a: ERP-Kurven-Cursor + Topografie + pulsende 3D-ACC-Quelle über eine geteilte Store-Uhr). typecheck 0, vitest 46/46, 3 Browser-Smokes grün. **Nächster Schritt: W1-B** — die bewährte `scripts/atlas/register.py`-Pipeline von 6 Patches auf die figur-kritischen DKT-Splits (IFG→A44/A45/A47, ACC→rostral/caudal, OFC→lateral/medial, + accumbens) generalisieren, backen, einhängen → schaltet 11-04 frei + verfeinert die Figuren von Gyrus- auf sub-gyrale Ebene.

## Umgebung & Setup

```
- Projektroot: /Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone
- App-Dir:     apps/brain-app  (cd dorthin für pnpm-Befehle)
- Branch:      feature/grundmodi-steuerleiste (W1-Arbeit uncommitted)
- Node: v22.22.2 · pnpm: 11.4.0 · Python: 3.14.5
- Stack: React 19 / R3F 9 / drei 10 / three 0.184 / zustand 5 / zod 3 / vitest 2 / @playwright/test
- Dev-Server: cd apps/brain-app && pnpm dev (oder: npx vite --port 5188 --strictPort). In dieser Session lief einer auf :5188.
- Vitest non-watch: CI=true npx vitest run (NICHT pnpm test — hängt im Watch)
- Typecheck: cd apps/brain-app && pnpm typecheck (= tsc -b --noEmit, Exit 0)
- Atlas-venv: scripts/atlas/.venv/bin/python (python3.14, vom 6-Patch-Lauf — Deps prüfen!)
```

## Was wurde in dieser Session getan?

1. **Investigation (Think-Before-Coding):** Geometrie-Realität gegen User-Annahme rekonstruiert. Befund: nur **6 Patches** auf TARO gebacken (nicht volles Julich/DKT); `julich3.glb` (412 Parzellen) **fehlt** (nur Text+Zentroide); **DKT** (`mni152-learn-brain.glb`, vorhanden) ist die echte figur-relevante Granularität (IFG→pars opercularis=A44/triangularis=A45/orbitalis=A47, ACC rostral/caudal, OFC lateral/medial, + `ba-*`-Meshes + Kerne). Laterale MNI→TARO-Registrierung ~22mm → **Within-Host-Split** als Mitigation.
2. **Architektur-Entscheidung (User, informiert):** volles DKT auf TARO transformieren+backen (ein Hirn, additiv), Pipeline generalisieren.
3. **Plan geschrieben:** `docs/superpowers/plans/2026-06-12-granulare-faerbemodi.md` (Wave 1: A Engine, B Pipeline, C Figuren, D EEG; Wave 2/3 skizziert).
4. **W1-A (Färb-Engine) — fertig+verifiziert:** `bucketMeshes.ts` (Bucket→TARO-Mesh, fail-loud bei Lücke), `colorPresets.ts` (zod-Loader + `resolvePresetColors` + `hueToHex` gedämpft + `presetIssue`), `ColorMode+='preset'`, `viewerStore.activePreset/setPreset`, Apply in `BodyParts3DViewer` (`dimOthers`→`PRESET_DIM_COLOR`), `FooterBar` „Figur-Färbungen"-Picker (deaktiviert nicht-baubare Presets). Smoke `smoke-preset.mjs`.
5. **W1-C (Figuren+Legende) — fertig:** `PresetLegend.tsx` (Farbschwatch=Mesh-Farbe). 11-05 + 11-13 live; 11-04 deaktiviert (accumbens-Lücke). Smoke `smoke-figures.mjs`.
6. **W1-D (EEG voll-synchron) — fertig:** `erpAnimation.ts` (`sampleCurve`/`envelope`, No-go-Kurve=Quellen-Hüllkurve)+6 Tests, `viewerStore` ERP-Uhr, `ErpChart` rAF-Cursor+Topografie, `SubParcels` Quellen-Puls (Emissive 0.15↔0.98 synchron). Smoke `smoke-eeg.mjs`.

## Was funktioniert (gesichert)

1. **Färb-Engine + Picker** — `?mode=explore`, Fußleiste „Farbe" → „Figur-Färbungen" → PFC Petrides.
   - Verifikation: `cd apps/brain-app && pnpm dev` (Port merken), dann `SMOKE_URL=http://localhost:<port> node ../../scripts/atlas/smoke-preset.mjs` → SMOKE OK (DLPFC #4c85bd / VLPFC #bd854c / Posterior #854cbd / dim #3a3631).
2. **2 Figuren + Legende** — `node ../../scripts/atlas/smoke-figures.mjs` → 11-05+11-13 färben+Legende, 11-04 deaktiviert.
3. **EEG voll-synchron (P3a)** — Learn-Modus, P3a-Szene. `node ../../scripts/atlas/smoke-eeg.mjs` → ACC-Quelle pulst 0.15↔0.98 ERP-synchron, Cursor wandert.
4. **Statisch grün** — `cd apps/brain-app && pnpm typecheck && CI=true npx vitest run` → Exit 0, 46/46.

## Was NICHT funktioniert / Sackgassen

### 1. Volles Julich-412 auf TARO backen — NICHT möglich
- **Was:** User wollte zunächst „volles Julich/DKT auf TARO".
- **Warum nicht:** `julich3.glb` (412 zytoarchitektonische Parzellen) **fehlt** im Repo — nur `archive/.../content/julich3/*.json` (Text), `parcels/julich3.json` (Zentroide), `slice-outlines/*.bin` (2D). Keine Mesh-Geometrie zum Backen. Julich-Vollebene nur via EBRAINS/siibra-Regeneration (Wave 3, separater Vorlauf).
- **Konsequenz:** DKT (vorhanden, gyral+sub-gyral) ist die richtige + ausreichende Granularität. Julich/BA-Namen als Label.

### 2. Laterale MNI→TARO-Registrierung absolut platzieren — ~22mm Versatz
- **Was:** `residuals.json` h2_loo=21.9mm für laterale Homologe.
- **Mitigation:** Within-Host-Split — die DKT-Parzelle unterteilt NUR den korrekten TARO-Gyrus (innere Grenze), statt absolut platziert zu werden. TARO hat die Host-Gyri schon (`inferior-frontal-gyrus` etc.).

### 3. `__THREE_SCENE__` enthält nur brain.glb, nicht die Sub-Patches
- **Fallstrick:** `window.__THREE_SCENE__` ist die Brain-GLTF-Szene; SubParcels-Meshes liegen als Geschwister unter dem Canvas-Root.
- **Fix (in smoke-eeg.mjs):** `let root=__THREE_SCENE__; while(root.parent) root=root.parent; root.traverse(...)`.

## Aktuelle Dateien & Pfade

```
apps/brain-app/src/viewer/
├── bucketMeshes.ts          # NEU — Bucket→TARO-Mesh (Lücken: nucleus-accumbens/frontopolar/ifj)
├── colorPresets.ts          # NEU — zod-Loader + resolvePresetColors + hueToHex + presetIssue
├── colorPresets.test.ts     # NEU — 9 Tests
├── erpAnimation.ts          # NEU — sampleCurve/envelope (ERP-Zeitmodell)
├── erpAnimation.test.ts     # NEU — 6 Tests
├── PresetLegend.tsx         # NEU — Legenden-Overlay (bottom-left)
├── ontology.ts              # GEÄNDERT — ColorMode+='preset'
├── viewerStore.ts           # GEÄNDERT — activePreset/setPreset + ERP-Uhr (erpActive/erpPhase/erpPulse)
├── BodyParts3DViewer.tsx    # GEÄNDERT — Preset-Color-Apply + <PresetLegend/>
├── FooterBar.tsx            # GEÄNDERT — Figur-Färbungen-Picker (deaktiviert nicht-baubare)
└── SubParcels.tsx           # GEÄNDERT — Quellen-Puls (erpPulse)
apps/brain-app/src/scene/overlays/ErpChart.tsx  # GEÄNDERT — rAF-Cursor + Topografie
scripts/atlas/
├── register.py              # BESTEHEND (306 Z.) — W1-B generalisiert das (Target-Tabelle)
├── build_subparcels.mjs     # BESTEHEND (95 Z.) — W1-B erweitert (mehr Targets)
├── decode_glb.mjs           # BESTEHEND (70 Z.)
├── smoke-{preset,figures,eeg}.mjs  # NEU — Browser-Smokes
└── work/{labels,residuals,taro_hosts,mni_learn}.json  # 6-Patch-Lauf-Artefakte
docs/superpowers/plans/2026-06-12-granulare-faerbemodi.md  # NEU — Plan (SSoT)
archive/2026-06-11-mni-stack/public/figs3d/v2/glb/mni152-learn-brain.glb  # QUELLE (DKT, 528 Nodes)
```

## Offene Entscheidungen

1. **Carve-Threshold pro Host-Gyrus (W1-B):** Within-Host-Split braucht einen Zuordnungs-Radius/Gate je DKT-Parzelle. Empirisch aus dem ersten Lauf festlegen (Vorbild: 6-Patch THRESH=6mm medial; lateral ggf. anders). Entscheidung: nächste Session, datengetrieben.

## Befehle zum Fortsetzen

```bash
# 1. Ins Projekt + Baseline-grün bestätigen
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app"
pnpm typecheck && CI=true npx vitest run        # erwartet: Exit 0, 46/46

# 2. Atlas-venv-Deps prüfen (existiert, vom 6-Patch-Lauf)
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas"
./.venv/bin/python -c "import numpy, scipy, pycpd, trimesh; print('atlas-deps ok')"

# 3. Plan öffnen (SSoT, W1-B-Sektion + Fortschritt)
#    docs/superpowers/plans/2026-06-12-granulare-faerbemodi.md

# 4. register.py + build_subparcels.mjs lesen (das wird generalisiert, nicht neu gebaut)
```

## Offene Tasks (Claude Task-Management — persistiert hier, da nicht über Sessions erhalten)

| Task | Status | Notiz |
|------|--------|-------|
| W1-A Färb-Engine | completed | typecheck 0, vitest 46/46, smoke-preset OK |
| W1-C Referenzfiguren + Legende | completed | 11-05/11-13 live, 11-04 deaktiviert (accumbens) |
| W1-D EEG voll-synchron P3a | completed | Quelle pulst ERP-synchron, smoke-eeg OK |
| **W1-B DKT-Split-Pipeline** | **offen** | Nächste Session — dieser Handover |

## Next-Session Prompt

> Copy-paste in eine neue Claude-Session. Der `/session-kickoff`-Skill kann das auch
> automatisch laden — siehe `next_session_*` Felder im Frontmatter oben.

```markdown
# Session-Auftrag: W1-B — DKT-Split-Pipeline generalisieren (granulare Geometrie auf TARO)

## Kontext (lies das zuerst, in dieser Reihenfolge)

1. **Plan-Doc (SSoT):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/docs/superpowers/plans/2026-06-12-granulare-faerbemodi.md` — `## Fortschritt` zeigt W1-A/C/D abgehakt, W1-B offen. W1-B-Block hat File Structure + Gate-Regeln.
2. **Vorgänger-Handover:** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/docs/END_SESSION_2026-06-12_Granulare-Faerbemodi.md` — diese Datei (Sackgassen, Geometrie-Realität).
3. **Bewährte Pipeline (das wird GENERALISIERT, nicht neu gebaut):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/register.py` (306 Z., 6 hartkodierte Targets in `stage_h4`) + `build_subparcels.mjs` (95 Z.) + `decode_glb.mjs` (70 Z.).
4. **6-Patch-Referenzplan (Methode + Residuen):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/docs/superpowers/plans/2026-06-12-mni-subparcellation.md` (Phasen H–K, THRESH=6mm, Within-Host-Logik).
5. **Quell-GLB (DKT):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/archive/2026-06-11-mni-stack/public/figs3d/v2/glb/mni152-learn-brain.glb` (528 Nodes; figur-relevant: parsopercularis/triangularis/parsorbitalis, rostral/caudalanteriorcingulate, lateral/medialorbitofrontal, accumbens — je -l/-r).
6. **App-Konsum (das färbt die Geometrie):** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/bucketMeshes.ts` (Lücken-Buckets nucleus-accumbens/frontopolar; dacc=ganzes Cingulum, vlpfc=ganzer IFG → auf neue Sub-Patches verfeinern) + `src/scene/regions.ts` (Slug→Mesh) + `src/viewer/SubParcels.tsx` (lädt k11-subparcels.glb).
7. **Constraints:** `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/CLAUDE.md` — Identifiers ohne Umlaute, brain.glb UNANGETASTET, Browser-Smoke je Render-Änderung.

Memory-Checks (PFLICHT — existieren in diesem Projekt):
- `kapitel11-granulare-faerbemodi` — W1-A/C/D-Stand + Geometrie-Realität (6 Patches, julich3.glb fehlt, DKT = echte Granularität, Within-Host-Split).
- `kapitel11-3d-lern-experience` — Plattform-Kontext, 6-Patch-Subparzellierung abgeschlossen.
- `bodyparts3d-laterality-double-error` — Daten-Caveat (fehlende/gesplittete Strukturen) fürs Vertex-Labeling.
- `brain-app-editorial-design-system` — theme-tokens nicht editieren, 3D-Viewport dunkel.

## Ziel

Am Ende existiert ein erweitertes `apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb` mit den figur-kritischen DKT-Sub-Patches (IFG→parsopercularis/triangularis/orbitalis, Cingulum→rostral/caudal anterior cingulate, OFC→lateral/medial, + nucleus-accumbens) als echte TARO-Geometrie (Within-Host-Split, Gate pro Parzelle, Residuum dokumentiert). `bucketMeshes.ts` verfeinert (vlpfc→pars*, dacc→caudal anterior cingulate, ofc→lateral/medial, nucleus-accumbens→neues Mesh) → **Abb. 11-04 Basalganglienschleifen ist freigeschaltet** (nicht mehr deaktiviert) und 11-05/11-13 färben sub-gyral. `pnpm typecheck`=0, `vitest` 46/46 grün, Browser-Smokes (preset/figures/eeg) weiterhin OK + ein neuer Carve-Smoke (Sub-Patch sichtbar als Gyrus-Teil, kein Z-Fighting).

## Auftrag

REQUIRED SUB-SKILL: superpowers:executing-plans (inline, Batch mit Verifikations-Checkpoints).

### Pre-Flight (vor jedem Edit)

1. Verzeichnis: `cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone"`
2. Branch-Check: `git status` — auf `feature/grundmodi-steuerleiste`, W1-Arbeit uncommitted (erwartet). Kein neuer Branch nötig (ein Feature-Stream).
3. Baseline-grün: `cd apps/brain-app && pnpm typecheck && CI=true npx vitest run` — Exit 0, 46/46. Sonst Stop (Regression zuerst klären).
4. Atlas-Deps: `cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas" && ./.venv/bin/python -c "import numpy, scipy, pycpd, trimesh; print('atlas-deps ok')"` — bei Fehler: `./.venv/bin/pip install -r requirements.txt`.
5. Plan-Doc `## Fortschritt` W1-B ist die Trackingliste — Checkboxen einzeln abhaken, `TaskCreate/TaskUpdate` parallel.
6. Vitest non-watch immer `CI=true npx vitest run` (nicht `pnpm test`).

### Implementation (Plan W1-B, Reihenfolge: B1 → B2 → B3 → B4 → B5)

**Schritt B1/B2 — Targets parametrisieren:**
`register.py` `stage_h4` hat 6 hartkodierte Targets. Externalisieren in `scripts/atlas/targets.json` (slug, srcset, mni-name, host_taro, warp-key). Wave-1-Set ergänzen (host = bestehender TARO-Gyrus):
- `left/right-parsopercularis` (host `*-inferior-frontal-gyrus`), `*-parstriangularis`, `*-parsorbitalis`
- `left/right-rostral-anterior-cingulate`, `*-caudal-anterior-cingulate` (host `*-cingulate-gyrus`)
- `left/right-lateral-orbitofrontal`, `*-medial-orbitofrontal` (host `*-lateral-orbital-gyrus` bzw. `*-medial-orbital-gyrus`)
- `left/right-nucleus-accumbens` (host: nächster TARO-Kern, ggf. `*-caudate-nucleus`/`*-putamen` — im Decode prüfen)
DKT-Geometrie aus `mni152-learn-brain.glb` decoden (decode_glb.mjs, nameRegex auf die DKT-Namen). Bestehende 6 Patches NICHT brechen (additiv).

**Schritt B3 — Registrieren + Within-Host-Split + Gate:**
Pro Target: DKT-Parzelle in TARO-Raum (Affine+CPD wie 6-Patch), aber Labeling = nur Vertices des KORREKTEN Host-Gyrus, die der gewarpten Parzelle am nächsten sind (Within-Host). Gate: ≥30 Vertices, Median-Abstand dokumentiert. Reißt eine Parzelle das Gate → laut stoppen, Parzelle NICHT integrieren, Host-Gyrus bleibt (Plan-Note).

**Schritt B4 — Carven + backen:**
`build_subparcels.mjs` über alle Targets (6 alt + neu) → erweitertes `k11-subparcels.glb`. Centroid/BBox/Sphere/Surface der neuen Sub-Patches an `apps/brain-app/public/scenes/structure-coords.json` anhängen (CameraRig braucht sie, sonst wirft `unionBounds` laut).

**Schritt B5 — App verdrahten:**
- `bucketMeshes.ts`: `vlpfc`→`[*-parsopercularis, *-parstriangularis, *-parsorbitalis]`, `dacc`→`[*-caudal-anterior-cingulate]`, `ofc`→lateral/medial DKT-Patches (+ behalten was kein DKT-Pendant hat), `nucleus-accumbens`→`[left/right-nucleus-accumbens]` (Lücke entfernen). `frontopolar`/`ifj` bleiben Lücken (keine DKT-Geometrie).
- `regions.ts`: neue Slugs falls Szenen sie brauchen.
- Prüfen: Preset-Färbung färbt jetzt die Sub-Patches — SubParcels-Material muss bei colorMode='preset' die Preset-Farbe annehmen (aktuell nur orange Highlight/ERP-Puls). Ggf. SubParcels um Preset-Färbung erweitern (analog Brain-Apply-Pfad), sonst leuchten die Sub-Patches nicht in der Gruppenfarbe.

### Verification (Evidence-First)

1. `cd apps/brain-app && pnpm typecheck` — Exit 0.
2. `CI=true npx vitest run` — 46/46 (keine bestehenden Tests geändert) + ggf. neue Resolver-Tests.
3. Registrierungs-Residuen aus `scripts/atlas/work/residuals.json` je neuer Parzelle (Median, n_vertices) — im Plan unter B3 notieren.
4. Browser-Smokes (Dev-Server starten, Port merken): `smoke-preset.mjs`, `smoke-figures.mjs` (11-04 jetzt NICHT mehr deaktiviert → aktivierbar + färbt), `smoke-eeg.mjs` weiterhin OK. Neuer Smoke: Sub-Patch (z.B. left-parsopercularis) sichtbar als Teil des IFG, kein Z-Fighting.

### Plan-Doc + Task Updates (PFLICHT, parallel)

- Plan-Doc `## Status-Header` + `## Fortschritt` W1-B-Checkboxen einzeln `- [ ]`→`- [x]`.
- Residuen + Within-Host-Befunde direkt unter den Steps (`> Note:` / `> BLOCKER:`).
- `TaskUpdate` Task „W1-B" → in_progress/completed.

### Commit-Strategie

Projekt-Konvention bisher no-commit (Checkpoint = Verifikation). Nicht committen, außer User fragt explizit. Vor destruktiven Schritten per `mv` nach `archive/` sichern, nie `rm`. `brain.glb` bleibt UNANGETASTET — Sub-Patches nur in `k11-subparcels.glb`.

## Constraints (kritisch)

- **brain.glb UNANGETASTET** — Sub-Patches kommen in `k11-subparcels.glb` (additiv). Surgical Changes.
- **Bestehende 6 Patches + W1-A/C/D nicht brechen** — additiv, Namen disjunkt; Smokes preset/figures/eeg müssen grün bleiben.
- **KEINE stillen Fallbacks** — Gate-Fail/leere Vertex-Sets/fehlende Meshes werfen laut mit Kontext. Globale Regel `~/.claude/CLAUDE.md`.
- **Within-Host-Split** — Parzelle auf korrekten TARO-Gyrus zwingen (laterale 22mm-Registrierung), nicht absolut platzieren. Memory `kapitel11-granulare-faerbemodi`.
- **Julich-412 NICHT versuchen** — `julich3.glb` fehlt (nur Text/Zentroide); DKT deckt die Figuren. Memory `kapitel11-granulare-faerbemodi`.
- **theme-tokens/ NICHT editieren** — Overrides nur in `apps/brain-app/src/app.css`. Memory `brain-app-editorial-design-system`.
- **Identifiers ohne Umlaute** (`ae/oe/ue/ss`); Kommentare/Prosa mit echten Umlauten.
- **Evidence-First** — keine „fertig"-Aussage ohne Tool-/Command-Output (Residuen, typecheck, Smoke).

## Anti-Patterns (vermeiden)

- DKT-Parzelle absolut in TARO platzieren → ~22mm Versatz, falsche Lokalisation. Immer Within-Host-Split.
- `julich3.glb` suchen/regenerieren wollen → fehlt, Wave 3. DKT nutzen.
- `bucketMeshes.ts` verfeinern, BEVOR der Carve grün ist → Preset zeigt auf nicht-existente Meshes. Erst Geometrie, dann Resolver.
- Sub-Patch-Preset-Färbung vergessen → die neuen Patches bleiben dunkel/orange statt Gruppenfarbe (SubParcels-Apply-Pfad erweitern).
- `structure-coords.json` nicht ergänzen → CameraRig `unionBounds` wirft laut bei neuem Highlight.
- `pnpm test` (Watch, hängt) statt `CI=true npx vitest run`.
- Sub-Patch-Namen in targets.json / labels.json / bucketMeshes.ts / regions.ts divergieren lassen → Highlight/Färbung greift nicht. Eine Namensquelle.

## Nächste Session nach diesem

Nach grünem W1-B: Wave 2 (restliche Figuren 11-06/07/08/09/10/11/12 + Phineas-Preset; EEG-Sync P3b/P3z; volle DKT-Kortex-Abdeckung; Subkortex-Kerne für BG-Schleife). Optional Wave 3 (Julich-412 aus EBRAINS regenerieren).

---

Start mit Pre-Flight Schritt 1.
```
