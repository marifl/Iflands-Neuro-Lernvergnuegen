---
created_at: "2026-06-12T21:27:12+02:00"
session_dauer: "~3h (W1-B → W2-EEG → W2-frontopolar → Julich/DKT Voll-Transform + Doku)"
session_topic: "Granulare Färbemodi Wave 1-B/2 + vollständige Julich+DKT → TARO Transformation (Artefakt-only)"
status: erfolgreich
branch: feature/grundmodi-steuerleiste
letzter_commit: "ad697c5 chore(repo): Buch-Abbildung aus Tracking entfernen, figures/ ignorieren (VOR dieser Session; gesamte Arbeit uncommitted)"
uncommitted_changes: "ja — viele. Runtime: register.py/build_subparcels/decode_glb/SubParcels.tsx/BodyParts3DViewer.tsx/ErpChart.tsx/bucketMeshes.ts geändert, k11-subparcels.glb + structure-coords.json neu gebacken, targets.json + 7 smoke-*.mjs neu. Transform (Shelf): register_atlas.py/atlas_bake.mjs/verify_atlas.py/host_map.json/list_glb_names.mjs neu. Doku: scripts/atlas/README.md neu, CLAUDE.md erweitert. Atlas-Artefakte liegen in scripts/atlas/work/ (nicht getrackt)."
best_result: "352 Parzellen (292 Julich + 60 DKT) korrekt auf TARO transformiert, anatomisch verifiziert (6/6 Checks), Shelf-Artefakte. PLUS Runtime W1-B/W2: 11-04/11-05/11-07/11-13/Phineas baubar, alle EEG-Varianten synchron."
best_result_pfad: "scripts/atlas/work/atlas-{julich,dkt}.glb + atlas-manifest.json (Transform); apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb (Runtime, 24 Patches)"
blocker: "keiner"
naechste_schritte:
  - "P4 (deferred): gewünschte Julich/DKT-Parzellen aus dem Shelf in die Runtime integrieren (bucketMeshes + bake nach k11-subparcels.glb)"
  - "ODER Wave 2: restliche Figuren 11-06/08/09/10/11/12 als Presets/Szenen authoren"
  - "Optional: fo3-ofc Voronoi-Imbalance fixen (host_restriction), DKT-Subkortex-Kerne für BG-Schleife"
offene_entscheidungen:
  - "Was zuerst: P4-Integration einzelner Areale (z.B. frontopolar→echtes fp1/fp2) ODER Wave-2-Figuren-Authoring? User entscheidet."
spec_dokument: keines
plan_dokument: "docs/superpowers/plans/2026-06-12-julich-dkt-voll-transform.md (Transform, P0-P3 + Doku/Verify ✓, P4 deferred) + 2026-06-12-granulare-faerbemodi.md (Wave 1 komplett + Wave 2 EEG/frontopolar ✓)"
vorgaenger_dokument: "END_SESSION_2026-06-12_Granulare-Faerbemodi.md"
consumed_by: []
next_session_prompt_present: true
next_session_topic: "P4 — Julich/DKT-Atlas in die Runtime integrieren (aus Shelf-Artefakt)"
next_session_branch: "feature/grundmodi-steuerleiste"
next_session_dart_task: "n/a — kein Dart"
---

# Session-Ende: Julich+DKT Voll-Transform + Wave 1-B/2

## TL;DR für nächste Session

Das **gesamte Julich (292) + DKT (60) Atlas ist korrekt auf das TARO-Hirn transformiert** (Within-Host-Partition generalisiert, eigene Affine pro Quelle, anatomisch 6/6 verifiziert) und liegt als **Shelf-Artefakt** in `scripts/atlas/work/atlas-{julich,dkt}.glb` + `atlas-manifest.json` — bewusst NICHT in der Runtime. Parallel ist Runtime-Wave-1-B/2 fertig: 11-04 freigeschaltet, 11-05/11-13 sub-gyral, frontopolar (BA10) + EEG P3a/P3b/P3z voll-synchron. **Alles uncommitted, typecheck 0, vitest 48/48, 7 Smokes grün.** Nächster Schritt: entweder P4 (Atlas-Areale aus dem Shelf in die Runtime ziehen) oder Wave-2-Figuren authoren.

**WICHTIG — gegen Re-Discovery:** `scripts/atlas/README.md` ist jetzt die Single-Source-of-Truth für alle Atlas-Geometrie-Fakten (julich3.glb-Pfad, Meshopt, Frames). Root-`CLAUDE.md` hat den Kern-Block. **Bei Atlas-Fragen IMMER zuerst diese lesen.**

## Umgebung & Setup

```
- Projektroot: /Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone
- App-Dir:     apps/brain-app  (cd dorthin für pnpm-Befehle)
- Branch:      feature/grundmodi-steuerleiste (gesamte Arbeit uncommitted — ein Feature-Stream)
- Node: v22.x · pnpm: 11.x · Python: 3.14 (scripts/atlas/.venv)
- Stack: React 19 / R3F 9 / drei 10 / three 0.184 / zustand 5 / zod 3 / vitest 2 / @playwright/test
- Typecheck: cd apps/brain-app && pnpm typecheck (tsc -b --noEmit, exit 0)
- Vitest non-watch: cd apps/brain-app && CI=true npx vitest run  (NICHT pnpm test — hängt im Watch)
- Atlas-venv: scripts/atlas/.venv/bin/python (numpy/scipy/pycpd/trimesh)
- Dev-Server: cd apps/brain-app && npx vite --port <frei> --strictPort  (stale Server killen: lsof -ti :PORT | xargs kill -9)
- Quell-GLB Julich (Meshopt!): /Users/marcusifland/CFH_REAL_LOCAL/brain-app-standalone/public/figs3d/v2/glb/julich3.glb
```

## Was wurde in dieser Session getan?

1. **W1-B (DKT-Split-Pipeline) — fertig.** `register.py` generalisiert (targets.json, absolute/partition/geometric_pole-Modi, Subkortex-Affine). 22 Sub-Patches in `k11-subparcels.glb` (pars\*, rostral/caudal ACC, lateral/medial OFC, nucleus-accumbens). **Befund:** kortikale Affine platziert Subkortex ~60mm daneben → dedizierte Subkortex-Affine (LOO 5.4mm). Within-Host-Partition braucht Zentroid-Alignment (sonst reisst parsorbitalis auf 0). → 11-04 freigeschaltet, 11-05/11-13 sub-gyral. SubParcels um Preset-Färbung erweitert.
2. **W2-EEG (P3b/P3z) — fertig.** ErpChart generisch (source/site Cz/Pz pro Szene). Brain-Komponente pulst gehighlightete brain.glb-Gyri (P3b-Quelle parietal). **Befund:** P3z pulste schon out-of-the-box (Sub-Patch-Quelle), nur Label war P3a-hartkodiert. Smokes smoke-eeg-{p3z,p3b}.
3. **W2-frontopolar (BA10) — fertig.** Kein Atlas-Mesh → geometrischer Pol-Carve (vorderste SFG+MFG-Spitze, 22mm). Neuer `geometric_pole`-Modus + `combined_hosts.json`. → 11-07 Badre + Phineas freigeschaltet.
4. **Julich-Missverständnis korrigiert.** User hakte nach „die Julich Rohdaten haben wir doch im monorepo" — **er hatte recht.** `julich3.glb` (292 Meshes, **Meshopt**, MNI152) existiert (Schwester-Standalone + Monorepo), fehlte nur im Archiv DIESES Repos. Mein wiederholter „fehlt"-Claim war zu eng. Memory korrigiert.
5. **Voll-Transform Julich+DKT → TARO — fertig (Artefakt-only).** Plan-Doc geschrieben. `register_atlas.py` (source-agnostisch, host_map.json), `atlas_bake.mjs` (Shelf-Bake). **Befund:** julich3 liegt in ANDEREM GLB-Frame als mni-learn → eigene Affine pro Quelle. 352 Parzellen, null Drops (Backfill für Crowding-Opfer).
6. **Dokumentation + Verifikation.** README.md → Single-Source-of-Truth. CLAUDE.md-Block. `verify_atlas.py` (6/6 Anordnungs-Checks) **fand + fixte echten Bug** (fp1/fp2 Ballooning über ganzes SFG+MFG → host_restriction Pol-Kappe).

## Was funktioniert (gesichert)

1. **Runtime W1-B/W2** — typecheck 0, vitest 48/48.
   ```
   cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app" && pnpm typecheck && CI=true npx vitest run
   ```
2. **7 Browser-Smokes** (Dev-Server starten, Port merken):
   ```
   cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone"
   for s in preset figures carve frontopolar eeg eeg-p3z eeg-p3b; do SMOKE_URL=http://localhost:<port> node scripts/atlas/smoke-$s.mjs; done
   ```
3. **Voll-Transform-Artefakt** — 352 Parzellen, anatomisch verifiziert.
   ```
   cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas" && ./.venv/bin/python verify_atlas.py
   # erwartet: 6/6 Anordnungs-Checks ✓, Ballooning-Detektor warnt nur fo3-ofc (bekannt)
   ```
4. **Transform reproduzierbar** — siehe `scripts/atlas/README.md` §1B.

## Was NICHT funktioniert hat / Fallstricke

### 1. Julich „fehlt" — war FALSCH (zu eng gefasst)
- **Was:** Memory/Pläne sagten „julich3.glb fehlt im Repo". Mehrfach wiederholt.
- **Realität:** Fehlt nur im Archiv DIESES Standalone-Repos. Existiert unter `/Users/marcusifland/CFH_REAL_LOCAL/brain-app-standalone/public/figs3d/v2/glb/julich3.glb` (Meshopt, 292 Meshes). → README.md + CLAUDE.md festgehalten, damit nie wieder gesucht.

### 2. julich3 ≠ mni-learn GLB-Frame
- **Was:** Annahme, die learn→TARO-Affine gelte für Julich.
- **Realität:** ~21mm Versatz (Julich area-44 vs DKT parsopercularis). Jede Quelle braucht EIGENE `<source>→TARO`-Affine. Evidence-First (Frame-Check) hat es vor dem Bauen gefangen.

### 3. fp1/fp2 Ballooning (combined-Host Under-Tiling)
- **Was:** Nur fp1/fp2 bewohnen `frontal-pole-combined` (ganzes SFG+MFG) → blähen sich über beide Hälften auf statt nur die Pol-Spitze. fp2 landete bei Z=-1 statt anterior.
- **Fix:** `host_restrictions` in host_map (Pol-Kappe 25mm) via `eligible_mask` in register_atlas. Volle Host-Indizierung bleibt für atlas_bake erhalten.
- **Wann nochmal:** Bei jeder neuen combined-Host-Zuordnung Ballooning-Detektor (`verify_atlas.py`) laufen lassen.

### 4. fo3-ofc Voronoi-Imbalance — BEKANNT/akzeptiert
- **Was:** fo3 dominiert ofc-combined (~8000 Vertices), weil andere OFC-Areale per Affine teils ausserhalb landen.
- **Warum nicht gefixt:** Nicht figur-kritisch (Runtime nutzt lateral/medial OFC via DKT). Detektor flaggt es dauerhaft. Bei Bedarf via host_restriction fixbar.

### 5. Meshopt vs Draco
- **Fallstrick:** `decode_glb.mjs`/`list_glb_names.mjs` brauchten MeshoptDecoder für julich3 (Fehler „setMeshoptDecoder must be called"). Jetzt drin. brain.glb/mni-learn = Draco.

## Aktuelle Dateien & Pfade

```
scripts/atlas/
├── README.md                  # NEU/SSoT — ZUERST LESEN bei Atlas-Fragen
├── register.py                # GEÄNDERT — Runtime-Patches (W1-B/W2, targets.json)
├── targets.json               # NEU — Runtime-Carve-Targets
├── build_subparcels.mjs       # GEÄNDERT — Runtime-Bake (combined_hosts-Merge)
├── decode_glb.mjs             # GEÄNDERT — +Meshopt
├── list_glb_names.mjs         # NEU — Name-only-Lister (+Meshopt)
├── register_atlas.py          # NEU — VOLL-Transform (source-agnostisch, host_map)
├── atlas_bake.mjs             # NEU — Shelf-Bake voller Atlas
├── verify_atlas.py            # NEU — Anordnungs-Checks + Ballooning-Detektor
├── host_map.json              # NEU — 56 Julich-Suffixe + DKT → TARO-Host
├── smoke-{preset,figures,carve,frontopolar,eeg,eeg-p3z,eeg-p3b}.mjs  # NEU
└── work/                      # Artefakte (nicht getrackt)
    ├── atlas-julich.glb (292) · atlas-dkt.glb (60)   # SHELF — nicht Runtime
    ├── atlas_labels_{julich,dkt}.json · atlas_residuals_* · atlas-manifest.json
    ├── julich_parcels.json · dkt_parcels.json · taro_cortex_hosts.json
    └── labels.json · residuals.json (Runtime-Patches)
apps/brain-app/
├── public/assets/bodyparts3d/k11-subparcels.glb   # RUNTIME — 24 Patches (App lädt)
├── public/scenes/{p3a,p3b,p3z}-*.json             # GEÄNDERT — source/site Felder
├── src/viewer/{bucketMeshes,colorPresets,SubParcels,BodyParts3DViewer}.* # GEÄNDERT
└── src/scene/overlays/ErpChart.tsx                # GEÄNDERT — generische Topografie
CLAUDE.md                      # GEÄNDERT — Atlas-Geometrie-Block (jede Session geladen)
docs/superpowers/plans/2026-06-12-julich-dkt-voll-transform.md  # NEU — Transform-Plan
```

**Aufräum-Kandidaten:** keine kritischen. `work/dkt_raw.json` (Zwischenstand vor Merge) löschbar.

## Offene Entscheidungen

1. **Nächster Fokus**
   - **Option A:** P4 — Atlas-Areale aus dem Shelf in die Runtime integrieren (z.B. frontopolar→echtes fp1/fp2, ifj→ifj1/2, oder Julich-BA für Figuren). Pfad: README.md §5.
   - **Option B:** Wave 2 — restliche Figuren 11-06/08/09/10/11/12 + Phineas als Presets/Szenen authoren.
   - **Empfehlung:** User-Entscheidung (beide sind valide; A nutzt das frische Artefakt, B liefert sichtbare Figuren).
   - **Entschieden von:** User (offen).

## Bekannte Probleme / Bugs

1. **fo3-ofc Voronoi-Imbalance** — ~8000 Vertices. Auswirkung: nur im Shelf-Artefakt, nicht Runtime. Workaround: keiner nötig. Lösung: host_restriction für ofc-combined oder feinere OFC-Affine.
2. **Backfill-Patches (18 Julich)** — überlappen mit Nachbarn, als `backfill:true` markiert. Auswirkung: für „color this area" ok, nicht für Volumen-Messung.

## Kontext & Entscheidungshistorie

- **„Nur transformieren, keine Runtime-Integration"** (User explizit): Das Atlas-Transform-Artefakt soll bereitliegen, aber die App NICHT verändern. Darum Shelf-GLB in `work/`, nicht `public/assets/`. Runtime `k11-subparcels.glb` + brain.glb unangetastet.
- **Within-Host statt globaler Surface-Registrierung** (User): MNI152 ≠ TARO sind zwei Hirne; Within-Host (Parzelle auf korrekten Gyrus zwingen) ist robust gegen den ~22mm-Versatz. Dichte Registrierung verworfen (riskanter).
- **Gapmaps mit-transformieren, Hippocampus → echte Geometrie** (User-Entscheidungen): Gapmaps via AUTO_NEAREST, Hippocampus-Subfelder partitionieren `hippocampus-proper`.
- **Voller Wave-1-Satz statt minimal** (User): bei W1-B alle 16 DKT-Patches, nicht nur accumbens.
- **Doku-Priorität** (User, explizit): „damit wir diese Durchbrüche nicht noch ein paar mal finden müssen" → README als SSoT + CLAUDE.md-Block.

## Befehle zum Fortsetzen

```bash
# 1. Ins Projekt, Baseline bestätigen
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app"
pnpm typecheck && CI=true npx vitest run        # erwartet: exit 0, 48/48

# 2. Transform-Artefakt verifizieren
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas"
./.venv/bin/python verify_atlas.py              # erwartet: 6/6 ✓

# 3. Atlas-Doku lesen (PFLICHT bei Atlas-Arbeit)
#    scripts/atlas/README.md  — Single Source of Truth
#    work/atlas-manifest.json — was steht zur Integration bereit

# 4. Für P4 (Integration): Manifest sichten, gewünschte Slugs aus atlas-labels_*.json
#    nach k11-subparcels.glb backen (analog build_subparcels.mjs) + bucketMeshes.ts verdrahten
```

## Offene Tasks (aus Claude Task-Management)

| Task | Status | Notiz |
|------|--------|-------|
| P4 Runtime-Integration | deferred | User-gated; Pfad in README.md §5 + atlas-manifest.json |
| Wave 2 Figuren 11-06..12 | offen | Geometrie/Buckets baubar, Presets/Szenen fehlen |
| fo3-ofc Imbalance | offen/optional | nur Shelf, nicht figur-kritisch |
| DKT-Subkortex-Kerne (BG-Schleife) | offen | Subkortex-Affine aus W1-B wiederverwendbar |

## Next-Session Prompt

> Copy-paste in eine neue Claude-Session. Der `/session-kickoff`-Skill kann das auch
> automatisch laden — siehe `next_session_*` Felder im Frontmatter oben.

```markdown
# Session-Auftrag: P4 — Julich/DKT-Atlas in die Runtime integrieren (aus Shelf-Artefakt)

## Karpathy Frame (lies und bewahre durch die Session)

- **Problem:** Das volle Julich+DKT-Atlas ist auf TARO transformiert und liegt als Shelf-Artefakt bereit, ist aber noch NICHT in der App nutzbar — gewünschte Areale müssen in die Runtime gezogen werden.
- **Why now:** Das frische, verifizierte Transform-Artefakt liegt vor; Integration einzelner Areale (z.B. echtes frontopolar fp1/fp2, ifj1/2) hebt die Figuren von Näherungen auf cytoarchitektonisch korrekte Geometrie.
- **Symptom vs Problem:** Runtime nutzt geometrisches frontopolar + hat ifj-Lücke (Symptom); die echten Julich-Areale existieren transformiert, sind nur nicht verdrahtet (Problem).
- **Smallest change:** EIN Areal-Set aus dem Shelf nach k11-subparcels.glb backen + in bucketMeshes.ts verdrahten, mit Smoke verifizieren — dann iterieren.
- **Annahmen die brechen könnten:** (1) Shelf-Vertex-Indizes passen zu taro_cortex_hosts (verify: re-bake stimmt mit atlas-julich.glb überein). (2) Preset-Färbung greift automatisch über SubParcels-Resolver (verify: Smoke). (3) Namen kollidieren nicht mit bestehenden 24 Patches (verify: disjunkt).
- **Surgical scope:** scripts/atlas/ (neues Bake-Script ODER build_subparcels erweitern), apps/brain-app/src/viewer/bucketMeshes.ts, public/assets/bodyparts3d/k11-subparcels.glb, public/scenes/structure-coords.json. NICHT: brain.glb, register_atlas.py (Transform ist fertig), App-Architektur.

> Karpathy-Disziplin: bei Drift vom Frame stop und nachfragen, nicht silently erweitern.

## Kontext (lies das zuerst, in dieser Reihenfolge)

1. **Atlas-SSoT:** `scripts/atlas/README.md` — §4 Artefakt-Inventar, §5 Integrationspfad, §3b Limitationen. ZUERST.
2. **Integrations-Index:** `scripts/atlas/work/atlas-manifest.json` — alle 352 Parzellen mit Host/Median/backfill. Hier stehen die verfügbaren Slugs.
3. **Transform-Plan:** `docs/superpowers/plans/2026-06-12-julich-dkt-voll-transform.md` — Phasen P0-P3 ✓, P4 ist DIESER Auftrag.
4. **Runtime-Bake-Vorbild:** `scripts/atlas/build_subparcels.mjs` — wie aus labels.json + Host-Geometrie nach k11-subparcels.glb gecarvt wird (combined-Host-Merge beachten).
5. **App-Resolver:** `apps/brain-app/src/viewer/bucketMeshes.ts` (Bucket→Mesh) + `SubParcels.tsx` (lädt k11-subparcels.glb, färbt bei colorMode='preset').
6. **Constraint-Doc:** Root `CLAUDE.md` (Atlas-Geometrie-Block) + `apps/brain-app/CLAUDE.md`-Regeln (Umlaute-frei in Identifiern, brain.glb unantastbar).

Memory-Checks (PFLICHT — existieren in diesem Projekt):
- `kapitel11-granulare-faerbemodi` — Transform-Stand, Frame-Befund, Backfill, fo3-Imbalance, SSoT-Verweis.
- `kapitel11-3d-lern-experience` — Plattform-Kontext.
- `brain-app-editorial-design-system` — theme-tokens nicht editieren, Viewport dunkel.

## Ziel (Goal-Driven, verifizierbar)

Mindestens EIN figur-relevantes Julich-Areal-Set aus dem Shelf in die Runtime integriert und gefärbt sichtbar — z.B. frontopolar→echtes fp1/fp2 (löst geometrische Näherung ab) ODER ifj→ifj1/2 (schliesst letzte Lücke). k11-subparcels.glb additiv erweitert, bucketMeshes verdrahtet, structure-coords ergänzt.

Verify-Steps:
1. `cd apps/brain-app && pnpm typecheck` → exit 0
2. `CI=true npx vitest run` → grün (Tests auf neue Slugs anpassen falls nötig)
3. Browser-Smoke: neues Areal sichtbar + gefärbt im zugehörigen Preset, kein Z-Fighting; bestehende 7 Smokes weiter grün

## Auftrag

### Pre-Flight (vor jedem Edit)

1. Branch-Check: auf `feature/grundmodi-steuerleiste`, Arbeit uncommitted (erwartet — ein Feature-Stream, kein neuer Branch).
2. Baseline: `cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app" && pnpm typecheck && CI=true npx vitest run` → exit 0, 48/48. Sonst Stop.
3. Atlas-Artefakt da? `ls "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/work/atlas-julich.glb"` — falls fehlt: Transform aus README.md §1B reproduzieren.
4. README.md + atlas-manifest.json lesen, Ziel-Slugs festlegen (z.B. fp1/fp2, ifj1/ifj2).
5. Backup vor Bake: `cp apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb archive/$(date +%F)-pre-p4/`  (mv/cp, nie rm).

### Implementation

**Schritt 1 — Ziel-Slugs + Bake**
Aus `atlas_labels_julich.json` die gewünschten Parzellen (Host + vertex_indices) nehmen, aus `taro_cortex_hosts.json` (combined-Host-Rekonstruktion wie in atlas_bake.mjs) carven, ADDITIV in k11-subparcels.glb mergen (bestehende 24 Patches behalten). Slugs disjunkt halten.

**Schritt 2 — structure-coords.json**
Centroid/BBox der neuen Patches anhängen (CameraRig unionBounds wirft sonst laut).

**Schritt 3 — bucketMeshes.ts verdrahten**
Bucket → neue Slugs (z.B. `frontopolar`→`[left/right-julich-fp1, ...]` oder kürzere Runtime-Slugs). Falls Runtime-Slugs gewünscht: beim Bake umbenennen, EINE Namensquelle. SubParcels-Preset-Färbung greift dann automatisch.

### Verification (Stop braucht Evidenz)

1. `cd apps/brain-app && pnpm typecheck` — exit 0
2. `CI=true npx vitest run` — grün
3. Dev-Server + Smoke: neues Areal sichtbar/gefärbt, kein Z-Fighting; `for s in preset figures carve frontopolar eeg eeg-p3z eeg-p3b; do SMOKE_URL=http://localhost:<port> node scripts/atlas/smoke-$s.mjs; done` weiter grün

### Plan-Doc + Updates (PFLICHT, parallel)

- Plan-Doc `2026-06-12-julich-dkt-voll-transform.md`: P4-Checkbox + Status-Header updaten.
- Memory `kapitel11-granulare-faerbemodi`: integrierte Areale notieren.

### Commit-Strategie

Projekt-Konvention bisher no-commit (Checkpoint = Verifikation). NICHT committen ausser User fragt explizit.

## Constraints (kritisch)

- **brain.glb UNANGETASTET** — Sub-Patches nur additiv in k11-subparcels.glb.
- **Bestehende 24 Patches + W1-B/W2 nicht brechen** — Namen disjunkt; 7 Smokes müssen grün bleiben.
- **KEINE stillen Fallbacks** — fehlende Slugs/leere Vertex-Sets werfen laut (globale `~/.claude/CLAUDE.md`).
- **theme-tokens/ NICHT editieren** — Overrides nur in `apps/brain-app/src/app.css`. Memory `brain-app-editorial-design-system`.
- **Identifiers ohne Umlaute** (ae/oe/ue/ss); Prosa/Kommentare mit echten Umlauten.
- **Evidence-First** — keine „fertig"-Aussage ohne typecheck/vitest/Smoke-Output.
- **Atlas-SSoT lesen, nicht neu suchen** — `scripts/atlas/README.md` gewinnt bei Widerspruch zu Erinnerung.

## Anti-Patterns (vermeiden)

- Shelf-GLB (work/atlas-*.glb) direkt als App-Asset laden → riesig, viele Draw-Calls. Nur gewünschte Slugs nach k11-subparcels.glb backen.
- Vertex-Indizes aus atlas_labels neu interpretieren ohne dieselbe combined-Host-Rekonstruktion → falsche Geometrie. atlas_bake.mjs-Logik spiegeln.
- bucketMeshes auf Slugs zeigen lassen, die nicht im GLB sind → Preset wirft laut. Erst backen, dann verdrahten.
- backfill:true-Parzellen für präzise Figuren nutzen → überlappende Näherung. Manifest prüfen.

## Nächste Session nach diesem

Nach P4-Integration: Wave 2 (restliche Figuren 11-06/08/09/10/11/12 als Presets/Szenen), DKT-Subkortex-Kerne für die BG-Schleife, optional fo3-ofc-Imbalance fixen.

---

Start mit Pre-Flight Schritt 1.
```
