---
created_at: "2026-06-13T21:35:00+02:00"
session_dauer: "~Langsession (Diagnose → Pivot → kompletter kanonischer Atlas)"
session_topic: Kanonischer fsaverage-Atlas — 4 Kortex-Layer (DKT/Destrieux/Julich/Brodmann) + Subkortex
status: erfolgreich
branch: feature/grundmodi-steuerleiste
letzter_commit: "df304d3 feat(atlas): Brodmann-Layer (PALS_B12, FreeSurfer fsaverage) als 4. Kortex-Layer"
uncommitted_changes: "nein — Working Tree clean (alle Atlas-Commits gepusht-bar, 35 vor master)"
best_result: "Kanonischer Atlas: 4 Kortex-Klassifikationen + Subkortex auf EINEM fsaverage-Modell, 60 FPS, demobar via ?spike=atlas"
best_result_pfad: apps/brain-app/src/viewer/atlas/ + apps/brain-app/public/assets/atlas-canonical/
blocker: "keiner — inhaltlich komplett; einzig offen: echter App-Modus statt ?spike-Dev-Route"
naechste_schritte:
  - "Echten 'atlas'-AppMode bauen (viewerStore + FooterBar + main.tsx), ?spike-Route ersetzen"
  - "Atlas-Modus + Layer-Panel sauber ins Editorial-UI integrieren"
  - "Atlas-Doku finalisieren (README/CLAUDE.md-Verweis, Reproduktion der Pipeline)"
offene_entscheidungen:
  - "Atlas-Modus als eigener Canvas (wie jetzt) oder im bestehenden BodyParts3DViewer-Layout?"
  - "?spike=atlas-Route entfernen oder als Dev-Fallback behalten?"
spec_dokument: docs/superpowers/specs/2026-06-13-canonical-atlas-design.md
plan_dokument: docs/superpowers/plans/2026-06-13-canonical-atlas-phase2.md (+ -spike, -optics)
vorgaenger_dokument: "END_SESSION_2026-06-12_Julich-DKT-Voll-Transform.md"
consumed_by: []
next_session_prompt_present: true
next_session_topic: "Canonical-Atlas App-Modus + Dokumentation"
next_session_branch: "feature/grundmodi-steuerleiste"
next_session_dart_task: "n/a (kein Dart-Projekt)"
---

## TL;DR für nächste Session

Diese Session hat aus dem gescheiterten „Carve auf TARO" einen **kanonischen fsaverage-Atlas** gebaut:
EIN Mesh + Per-Vertex-Label-Layer + GPU-Umfärbung, mit 4 getrennten Klassifikationen (DKT, Destrieux,
Julich-Brain v3, Brodmann) + Subkortex (BG inkl. GPe/GPi + Thalamus), inflated/Curvature/offizielle
Paletten, 60 FPS — demobar via `cd apps/brain-app && pnpm dev` → `http://localhost:5173/?spike=atlas`.
**Einzig offen:** die `?spike=atlas`-Dev-Route durch einen echten `appMode === 'atlas'` ersetzen + die
Atlas-Doku finalisieren. Code liegt unter `apps/brain-app/src/viewer/atlas/`, Assets unter
`apps/brain-app/public/assets/atlas-canonical/`.

## Umgebung & Setup

```
- Branch: feature/grundmodi-steuerleiste (35 vor master, Working Tree clean)
- App: apps/brain-app (Vite + React + R3F/three.js 0.184, R3F 9.6.1)
- Python: scripts/atlas/.venv — nibabel 5.4.2, nilearn 0.13.1, siibra ~1.0.1-alpha, templateflow, scikit-image, trimesh, numpy/scipy
- Build-Skripte: scripts/atlas/canonical/{extract_fsaverage,extract_subcortex,extract_pallidum_cit168,extract_brodmann}.py
- Externe Daten (lokal gecacht, KEIN Auth): ~/neuromaps-data/atlases/fsaverage (164k Surfaces), ~/Library/Caches/templateflow (DKT/Destrieux), nilearn_data (Harvard-Oxford), siibra-Cache (Julich)
- Docker: für Brodmann genutzt (freesurfer/freesurfer:7.4.1) — Image nach Extraktion wieder geloescht
- Verifikation: cd apps/brain-app && pnpm typecheck (exit 0) && pnpm exec vitest run src/viewer/atlas/ (3 Tests) + Browser-Smoke
```

## Was wurde in dieser Session getan?

1. **Diagnose Carve** — numerisch (Grid-NN: 100 % der Carve-Vertices ≤0,1 mm, max 0,000 mm) + visuell belegt: der Within-Host-Carve sitzt exakt auf TARO, ist aber nur TARO-Polygonisierung, kein echter Areal-Atlas. Diagnose-Overlay-Toggle gebaut (Commit `aedd670`, noch im Tree als Carve-Vergleich).
2. **Pivot** — Kernerkenntnis (User): TARO (Einzelindividuum, 62 getrennte Gyrus-Meshes, keine Zytoarchitektur) ist das falsche Substrat für einen *allgemeingültigen* Atlas. Lösung: **fsaverage**, der kanonische Raum.
3. **Brainstorming → Spec → Plan** (`docs/superpowers/specs|plans/2026-06-13-canonical-atlas-*`).
4. **Phase 1 (Spike)** — Architektur am lebenden Objekt bewiesen: fsaverage5 + Destrieux, LUT-Shader, BVH-freier Raycast-Pick, 60 FPS. Commits `77f9c5b`…`4d1cd08`.
5. **Phase 2 (Multi-Layer 164k)** — DKT + Destrieux (templateflow GIFTI) + Julich (siibra). Layer-Panel (Makro/Zyto), GPU-Umschaltung, baryzentrischer Pick. Commits `a73e608`…`a905ece`.
6. **Optik** — offizielle Paletten (GIFTI/siibra), inflated-Default + Curvature-Shading + Pial/Inflated-Toggle, **native Julich-MPM** statt vol2surf (100 % statt 94,9 % Coverage). Commits `38c3a39`…`b6a2144`.
7. **Subkortex** — Harvard-Oxford MNI152 → Marching Cubes, frame-verifiziert (100 % in pial-Hülle), Ghost-Kortex-Toggle, Pick→deutsche Namen. **GPe/GPi-Split** via CIT168/Pauli statt grobem Pallidum. Commits `860525f`…`c09318c`.
8. **Brodmann (4. Layer)** — `PALS_B12_Brodmann.annot` aus FreeSurfer-Docker extrahiert (echtes BA_exvivo gibt's NICHT fertig auf fsaverage), 40 BAs, 84,8 % Coverage, auf einheitlichen BA-Nummern-Labelraum umindiziert. Commit `df304d3`.

## Was funktioniert (gesichert)

1. **Kanonischer Atlas im Browser** — 4 Layer + Subkortex, alle Toggles.
   - Verifikation: `cd apps/brain-app && pnpm dev` → `http://localhost:5173/?spike=atlas` → Layer durchklicken (DKT/Destrieux/Julich/Brodmann), Inflated/Pial, Basalganglien/Thalamus. Pick zeigt korrekte Namen, 0 Konsolen-Fehler.
2. **Build-Pipeline reproduzierbar** — alle Layer + Subkortex aus auth-freien Quellen.
   - Verifikation: `cd scripts/atlas && .venv/bin/python canonical/extract_fsaverage.py` (DKT/Destrieux/Julich/curv), `.../extract_subcortex.py`, `.../extract_pallidum_cit168.py`, `.../extract_brodmann.py`.
3. **Tests + Typecheck grün.**
   - Verifikation: `cd apps/brain-app && pnpm typecheck && pnpm exec vitest run src/viewer/atlas/` → exit 0, 3 Tests.

## Was NICHT funktioniert hat (verworfene Ansätze)

1. **Carve als Atlas-Ersatz** — sitzt 0 mm auf TARO, ist aber TARO-Polygonisierung, keine echte Areal-Geometrie. Diagnose-Overlay (`atlas-carved-*.glb` + Toggle) bleibt nur als Beleg im Tree.
2. **TARO als Atlas-Substrat** — Einzelindividuum + 62 getrennte Gyrus-Patches (kein registrierbares Manifold) + keine Zytoarchitektur. Für allgemeingültigen Atlas prinzipiell ungeeignet. Verworfen zugunsten fsaverage.
3. **Julich via `vol_to_surf`** — körnige Grenzen, 94,9 % Coverage, subkortikale Leaks. Ersetzt durch native siibra-fsaverage-MPM. **Wichtig:** `parcellation.get_map("fsaverage")` (Methode) wirft `MapNotFound` (→ fsaverage6); `siibra.get_map(parcellation="julich 3.0.3", space="fsaverage")` (Top-Level-Funktion) funktioniert.
4. **Echtes BA_exvivo auf fsaverage** — existiert NICHT fertig (nur im Subjekt `bert` nativ). fsaverage-Mapping braucht FS-Lizenz + surf2surf + wäre Einzelhirn. Stattdessen PALS_B12_Brodmann (Van-Essen-Populations-Atlas, fertig auf fsaverage).
5. **Alte Subkortex-Meshes** (`work/mni_subcort.json`, `work/subcort_gp_extra.json`) — falscher Frame (~25-35 mm zu tief, Caudat z=-27 statt ~+11). Nicht verwendet; neu aus Harvard-Oxford gebacken.

## Aktuelle Dateien & Pfade

```
apps/brain-app/src/viewer/atlas/        # AKTIV — kanonischer Atlas (Runtime)
├── atlasAssets.ts                       # Loader + Manifest-/Hemi-/Subkortex-Typen (fail-loud)
├── atlasLut.ts (+ .test.ts)             # LUT-Bau + Label-Resolver (getestet)
├── atlasPick.ts (+ .test.ts)            # nearestCornerVertex (baryzentrischer Pick, getestet)
├── CanonicalSurface.tsx                 # EIN Mesh + Per-Vertex-Label + LUT-Shader + Curvature + opacity-Ghost
├── SubcorticalMeshes.tsx                # Subkortex-Solid-Meshes
├── AtlasLayerPanel.tsx                  # UI: Layer (Makro/Zyto) + Oberflaeche + Subkortex-Toggle
└── CanonicalAtlasSpike.tsx              # Mount (aktuell via ?spike=atlas) — wird zum echten Modus
apps/brain-app/public/assets/atlas-canonical/   # AKTIV — gebackene Assets (164k)
├── manifest.json                        # space/layers[{id,axis,label_de}]/hemis/lut/subcortical
├── fsavg164_{L,R}_{pial,infl}.f32 + _faces.u32 + _curv.f32
├── fsavg164_{L,R}_{dkt,destrieux,julich,brodmann}.i16
└── subcort_{thalamus,caudate,putamen,gpe,gpi,accumbens}_{L,R}.{f32,_norm.f32,_faces.u32}
apps/brain-app/src/main.tsx              # AKTIV — ?spike=atlas-Guard rendert CanonicalAtlasSpike
scripts/atlas/canonical/*.py             # AKTIV — Build-Pipeline (4 Extraktoren)
docs/ATLAS_CANONICAL_FEASIBILITY.md      # AKTIV — Machbarkeits-Befund + Sourcing-Tabellen
docs/superpowers/specs|plans/2026-06-13-canonical-atlas-*  # AKTIV — Spec + 3 Pläne (lokal, gitignored)
apps/brain-app/public/assets/bodyparts3d/atlas-carved-*.glb  # DIAGNOSE — Carve-Vergleich (aus aedd670)
scripts/atlas/work/brodmann_src/         # CACHE — extrahierte PALS-annot (nicht getrackt)
```

**Aufräum-Kandidaten:** `atlas-carved-{julich,dkt}.glb` (~8,7 MB) + Carve-Overlay-Toggle in
`AtlasOverlay.tsx`/`StructureTree.tsx`/`viewerStore.ts` — Diagnose erfüllt, kann beim App-Modus-Bau
entfernt werden (eigene Entscheidung, nicht zwingend).

## Offene Entscheidungen

1. **Atlas-Modus-Layout**
   - Option A: eigener Vollbild-Canvas (wie `CanonicalAtlasSpike` jetzt) — sauber getrennt vom TARO-Viewer.
   - Option B: in `BodyParts3DViewer`-Layout integriert (gemeinsame Sidebar/Footer).
   - Empfehlung: A (eigener Canvas), da fsaverage ≠ TARO-Substrat — sauberste Trennung; Editorial-UI-Stil für das Panel angleichen.
2. **`?spike=atlas`-Route** — nach App-Modus-Bau entfernen oder als Dev-Fallback behalten. Empfehlung: entfernen (der echte Modus ersetzt sie).

## Kontext & Entscheidungshistorie

- **fsaverage statt TARO** weil: allgemeingültiger Atlas darf nicht auf einem Einzelindividuum sitzen; fsaverage ist der kanonische Raum, in dem alle Atlanten co-registriert vorliegen. fsaverage-pial ≈ MNI152 mm (bewiesen via Julich-vol_to_surf) → MNI-Subkortex passt direkt.
- **nicht-kommerziell/akademisch** bestätigt (User) → NC-Quellen (Julich CC-BY-NC-SA, FreeSurfer-Daten) erlaubt mit Attribution.
- **Brodmann ≠ Julich** = zwei getrennte Klassifikationssysteme (User-Korrektur) → getrennte `cyto`-Layer.
- **GPe/GPi-Split**: vom Hintergrund-Agenten eigenmächtig gebaut (Commit bebf204→c09318c), nachträglich verifiziert + behalten + signiert. War auf der Offen-Liste.
- **Commit-Signing**: SSH-Signing via 1Password; `git log --show-signature` zeigt „No signature" nur mangels `gpg.ssh.allowedSignersFile` — die Signatur existiert (gpgsig-Header). Falls 1Password-Agent gesperrt: Commit kann mit `--no-gpg-sign` durchlaufen, danach `git commit --amend -S` nachziehen.

## Befehle zum Fortsetzen

```bash
# 1. Stand ansehen
cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app"
pnpm dev   # → http://localhost:5173/?spike=atlas  (alle 4 Layer + Subkortex durchklicken)

# 2. Verifikation
pnpm typecheck                              # exit 0
pnpm exec vitest run src/viewer/atlas/      # 3 Tests gruen

# 3. Pipeline reproduzieren (optional, Assets liegen schon committed)
cd ../../scripts/atlas
.venv/bin/python canonical/extract_fsaverage.py
.venv/bin/python canonical/extract_subcortex.py
.venv/bin/python canonical/extract_pallidum_cit168.py
.venv/bin/python canonical/extract_brodmann.py
```

## Offene Tasks (aus Claude Task-Management)

Alle Session-Tasks (Spike 1-9, P2-1…P2-6, S-1…S-4, B-1/B-2) sind `completed`.
Einziger offener Folge-Auftrag (noch kein Task): **echter App-Modus + Doku** — siehe Next-Session Prompt.

## Next-Session Prompt

> Copy-paste in eine neue Claude-Session. Der `/session-kickoff`-Skill kann das auch automatisch laden.

```markdown
# Session-Auftrag: Canonical-Atlas App-Modus + Dokumentation

## Karpathy Frame (lies und bewahre durch die Session)

- **Problem:** Der fertige kanonische Atlas ist nur über die Dev-Route `?spike=atlas` erreichbar — kein echter, im UI verlinkter App-Modus. Endnutzer (Vortrag) kommen nicht ran.
- **Why now:** Atlas ist inhaltlich komplett (4 Kortex-Layer + Subkortex, verifiziert); ohne echten Modus bleibt er unbenutzbar im Produkt.
- **Symptom vs Problem:** Symptom = man muss `?spike=atlas` an die URL haengen. Problem = die Atlas-Experience ist nicht in die `appMode`-Architektur (Lernen/Explorer/Phineas) integriert.
- **Smallest change:** `appMode` um `'atlas'` erweitern + bei aktivem Atlas-Modus den Canonical-Canvas statt des TARO-Viewers mounten; `?spike`-Route entfernen.
- **Annahmen die brechen koennten:** (1) `setAppMode` wirft bei unbekanntem Modus → muss 'atlas' erlauben (viewerStore.ts:248). (2) `FooterBar` iteriert hart `['learn','explore','phineas']` → 'atlas' ergaenzen. (3) `main.tsx` mountet `BodyParts3DViewer` unbedingt → Atlas-Zweig einbauen. Jede vor Edit per grep verifizieren.
- **Surgical scope:** `apps/brain-app/src/main.tsx`, `apps/brain-app/src/viewer/viewerStore.ts`, `apps/brain-app/src/viewer/FooterBar.tsx`, `apps/brain-app/src/viewer/atlas/CanonicalAtlasSpike.tsx` (→ in `CanonicalAtlasMode.tsx` umbenennen), ggf. `apps/brain-app/src/viewer/atlas/AtlasLayerPanel.tsx` (Editorial-Stil). NICHTS am TARO-Viewer/Ontologie/Figur-Pipeline.

> Karpathy-Disziplin: bei Drift vom Frame stop und nachfragen, nicht silently erweitern.

## Kontext (lies das zuerst, in dieser Reihenfolge)

1. **Handover (Vollkontext):** `docs/END_SESSION_2026-06-13_Kanonischer-Atlas.md` — was gebaut wurde, alle Pfade, verworfene Ansaetze.
2. **Spec:** `docs/superpowers/specs/2026-06-13-canonical-atlas-design.md` — Architektur + Entscheidungen (Substrat fsaverage, Layer-Achsen Makro/Zyto).
3. **Code-Truth Runtime:** `apps/brain-app/src/viewer/atlas/CanonicalAtlasSpike.tsx` (aktueller Mount) + `CanonicalSurface.tsx`/`AtlasLayerPanel.tsx`.
4. **AppMode-Stellen:** `apps/brain-app/src/viewer/viewerStore.ts` (Zeilen ~27, ~172, ~247-252) + `apps/brain-app/src/viewer/FooterBar.tsx` (~20, ~123-128) + `apps/brain-app/src/main.tsx` (Mount + ?spike-Guard).
5. **UI-Stil-Konstraint:** Editorial-Theme — Memory `brain-app-editorial-design-system` (theme-tokens NICHT editieren, 3D-Viewport bleibt dunkel).

Memory-Checks (PFLICHT — existieren in diesem Projekt):
- `kanonischer-fsaverage-atlas` — komplette Atlas-Architektur + Sourcing-Fakten (DIE Referenz).
- `brain-app-editorial-design-system` — UI-Stil fuer das Atlas-Panel (ed-btn/eyebrow/ed-panel).
- `kapitel11-3d-lern-experience` — appMode/SceneStage-Plattformkontext.

## Ziel (Goal-Driven, verifizierbar)

Ein echter App-Modus „Atlas" existiert: im Footer-Modus-Flyout waehlbar, mountet den kanonischen
fsaverage-Atlas (4 Layer + Subkortex) statt des TARO-Viewers; die `?spike=atlas`-Dev-Route ist entfernt.
Atlas-Nutzung ist dokumentiert.

Verify-Steps:
1. `pnpm typecheck` → exit 0
2. `pnpm exec vitest run src/viewer/atlas/` → 3 Tests gruen
3. Browser: App starten (ohne `?spike`), Modus-Flyout → „Atlas" → Canonical-Atlas erscheint, alle 4 Layer + Inflated/Pial + Subkortex funktionieren, Pick zeigt Namen, 0 Konsolen-Fehler. Andere Modi (Explorer/Lernen/Phineas) weiter intakt.

## Auftrag

### Pre-Flight (vor jedem Edit)

1. Branch-Check: `git -C "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone" status` muss sauber sein, auf `feature/grundmodi-steuerleiste` (Atlas-Modus ist Teil des Grundmodi-Features → KEIN neuer Branch).
2. Baseline-Smoke: `cd "/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app" && pnpm typecheck && pnpm exec vitest run src/viewer/atlas/` — exit 0 erwartet (sonst pre-existing dokumentieren).
3. Dev-Server-Check: `curl -sI http://localhost:5173 -o /dev/null -w "HTTP %{http_code}\n" --max-time 3` (oder Port aus `pnpm dev`-Log).

### Implementation

**Schritt 1 — viewerStore: 'atlas'-Modus erlauben**
`apps/brain-app/src/viewer/viewerStore.ts`: `AppMode`-Typ um `'atlas'` erweitern; den Guard in `setAppMode` (`if (appMode !== 'learn' ...)`) um `'atlas'` ergaenzen, sonst wirft er.

**Schritt 2 — FooterBar: Modus „Atlas" anbieten**
`apps/brain-app/src/viewer/FooterBar.tsx`: `MODE_LABEL` um `atlas: 'Atlas'` ergaenzen; die harte Liste `(['learn','explore','phineas'] as const)` um `'atlas'` erweitern.

**Schritt 3 — Mount-Verzweigung**
`CanonicalAtlasSpike.tsx` → in `CanonicalAtlasMode.tsx` umbenennen (Default-Export beibehalten). In `main.tsx`: den `?spike=atlas`-Guard ENTFERNEN; stattdessen rendert die App immer `BodyParts3DViewer`, und INNERHALB des Viewer-Layouts wird bei `appMode === 'atlas'` der Canonical-Canvas statt des TARO-Canvas gemountet (3D-Bereich austauschen, Footer bleibt). Konkrete Stelle via grep auf den Canvas-Mount in `BodyParts3DViewer.tsx` finden. Falls die saubere Integration zu invasiv wird (Frame-Drift!): stop und Option mit User klaeren (eigener Vollbild-Canvas vs. Layout-Integration — siehe Handover „Offene Entscheidungen").

**Schritt 4 — Panel-Stil angleichen**
`AtlasLayerPanel.tsx` nutzt schon `ed-btn`/`eyebrow`; sicherstellen, dass es im echten Modus sauber positioniert ist (nicht mit Footer/Sidebar kollidiert). Editorial-Theme respektieren (Memory `brain-app-editorial-design-system`).

**Schritt 5 — Doku**
Kurzen Abschnitt in `CLAUDE.md` (oder `docs/ATLAS_CANONICAL_FEASIBILITY.md` ergaenzen) + README-Verweis: was der Atlas-Modus zeigt, wie die Pipeline reproduziert wird (4 Extraktoren), Quellen/Lizenzen (templateflow/siibra/Harvard-Oxford/PALS — Attribution akademisch). Attribution-Hinweis im UI (Footer/Panel) erwaegen.

### Verification (Stop-Hook braucht Evidenz)

1. `pnpm typecheck` — exit 0
2. `pnpm exec vitest run src/viewer/atlas/` — 3 gruen
3. Browser-Smoke (Playwright/manuell): Modus „Atlas" waehlbar, alle 4 Layer + Subkortex + Inflated/Pial funktionieren, Pick-Namen korrekt, 0 Konsolen-Fehler; Explorer/Lernen/Phineas unveraendert.

### Commit-Strategie

Mehrere kleine Commits (Store, FooterBar, Mount, Doku) ODER ein kohaerenter Feature-Commit — Begruendung: der Modus-Schalter ist eine zusammenhaengende Aenderung.

```
feat(atlas): echter 'atlas'-AppMode statt ?spike-Dev-Route

appMode um 'atlas' erweitert (viewerStore-Guard + FooterBar-Flyout);
CanonicalAtlasMode mountet bei appMode==='atlas' statt TARO-Viewer;
?spike-Route entfernt. Atlas-Nutzung + Pipeline-Reproduktion dokumentiert.
Verifikation: typecheck 0, vitest 3 gruen, Browser-Smoke (4 Layer + Subkortex).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

Push: `git push -u origin feature/grundmodi-steuerleiste`. PR-Drafting: offen — User entscheidet.

## Constraints (kritisch)

- **Branch:** `feature/grundmodi-steuerleiste`, sonst Stop.
- **TARO-Viewer unantastbar** — Ontologie, Figur-Faerbung, Phineas-Szene, theme-tokens nicht aendern. Nur die Modus-Verzweigung + Atlas-Komponenten.
- **fsaverage ≠ TARO** — der Atlas-Modus zeigt das fsaverage-Hirn, nicht TARO. Nicht versuchen, beide zu mischen.
- **Evidence-First:** keine „fertig"-Aussage ohne typecheck/vitest/Smoke-Evidenz.
- **Umlaute in Prosa:** echte ä/ö/ü/ß in Doku/Kommentaren/Commits; ASCII nur in Identifiern/Dateinamen/Branch.
- **Commit-Signing:** SSH via 1Password; falls Agent gesperrt → `--no-gpg-sign`, danach `git commit --amend -S` nachziehen. „No signature" bei `--show-signature` ist nur fehlende `allowedSignersFile`, kein Fehlen der Signatur.
- **Karpathy-Disziplin:** Surgical Scope (nur die 4-5 Frame-Files). Bei zu invasiver Mount-Integration stop + nachfragen.

## Anti-Patterns (vermeiden)

- `setAppMode` erweitern vergessen → wirft `unbekannter appMode "atlas"` zur Laufzeit.
- TARO-Viewer-Layout fuer den Atlas umbauen → bricht Explorer/Lernen/Phineas. Atlas bekommt eigenen Canvas-Zweig.
- Inflated-Surface ohne lateralen Offset rendern → Hemisphaeren ueberlappen (fsaverage-inflated ist um Origin zentriert; Offset ±50 ist in CanonicalAtlasSpike schon geloest — beim Umbau erhalten).
- Subkortex in Inflated-Ansicht zeigen → Kerne fehlplatziert (nur Pial; Logik `surf = showSub ? 'pial' : surface` erhalten).
- `?spike`-Route entfernen aber Mount-Zweig vergessen → Atlas gar nicht mehr erreichbar.

---

Start mit Pre-Flight Schritt 1.
```
