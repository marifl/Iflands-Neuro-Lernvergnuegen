# Atlas-Geometrie & Transformation — Single Source of Truth

> **LIES MICH ZUERST, bevor du irgendetwas ueber Hirn-Atlas-Geometrie, Julich, DKT, Brodmann
> oder MNI→TARO behauptest.** Dieses Dokument haelt die teuer erkaempften Fakten fest, damit
> niemand denselben „Durchbruch" ein viertes Mal findet. Wenn eine Aussage hier einer Erinnerung
> oder einem aelteren Plan widerspricht: **dieses Dokument gewinnt** (oder verifiziere neu und
> aktualisiere es hier).

---

## ⚡ Carve-Tool — Bedienung (für Entwickler, copy-paste)

Das **Carve-Tool** färbt den gefurchten TARO-Kortex pro Hirn-Areal ein (`atlas-surface-*.glb`, in der App
unter Footer → Atlas → „Atlas auf Hirn"). Scharfe Grenzen, saubere Topologie, keine Artefakte. Volle
Methodik/Begründung: §1C. **Hier nur: wie man es bedient.**

### Voraussetzungen (einmalig, liegen in gitignored `scripts/atlas/work/`)
Diese Build-Inputs müssen vorhanden sein (regenerierbar via §1B Transform-Pipeline):
- `work/taro_cortex_hosts.json` — dekodierte TARO-Kortex-Gyri (aus `brain.glb`, `decode_glb.mjs`)
- `work/atlas_labels_{dkt,julich,brodmann}.json` — registrierte Parzellen-Labels (`register_atlas.py`)
- `host_map.json` — Mapping Atlas-Host → TARO-Gyrus (getrackt, liegt vor)

### Einen bestehenden Atlas (neu) carven
```bash
cd scripts/atlas
node export_clean_cortex.mjs          # 1× nötig: work/taro_cortex_clean.obj (gefurchtes, verschweisstes Mesh)
node bake_carve.mjs dkt               # -> apps/.../atlas-surface-dkt.glb + -pick.json   (analog: julich, brodmann)
node verify_topology.mjs dkt          # GATE: Normalen <0.02% falsch, T-junction-frei, 0 degeneriert
node audit_carve_fidelity.mjs dkt     # GATE: 0 FEHLEND (kein Areal verloren)
```
**Danach PFLICHT:** in `apps/brain-app/src/viewer/AtlasOverlay.tsx` die Konstante **`CARVE_V` hochzählen**
(Cache-Bust) — sonst serviert der Browser die alte GLB.

### Einen NEUEN Atlas hinzufügen (z. B. „aparc")
1. `work/atlas_labels_aparc.json` erzeugen (via `register_atlas.py`, s. §1B) + Hosts in `host_map.json` eintragen.
2. `'aparc'` in die `source`-Whitelist von `bake_carve.mjs`, `verify_topology.mjs`, `audit_carve_fidelity.mjs` aufnehmen.
3. `node bake_carve.mjs aparc` → `verify_topology.mjs aparc` → `audit_carve_fidelity.mjs aparc`.
4. In `AtlasOverlay.tsx`: `SURFACE_URL`/`PICK_URL` um `aparc` ergänzen + `CARVE_V` bumpen; Toggle im UI ergänzen.

### Was reinkommt / rauskommt
| Input | Output |
|---|---|
| `work/taro_cortex_hosts.json`, `work/atlas_labels_<src>.json`, `host_map.json` | `apps/brain-app/public/assets/bodyparts3d/atlas-surface-<src>.glb` + `-pick.json` |

Reproduzierbar (deterministisch): gleiche Inputs → byte-identische GLB. Gates müssen grün sein, sonst NICHT committen.

---

## 0. Die Fakten, die immer wieder „neu entdeckt" wurden (NICHT erneut suchen)

1. **Julich-412-Geometrie EXISTIERT.** Sie fehlt nur im *Archiv dieses Standalone-Repos*. Die echte Mesh-Geometrie liegt unter:
   - `<julich3.glb>` — extern bereitstellen (EBRAINS Julich-Brain, Amunts et al. 2020; lokal nach `scripts/atlas/work/` legen). **Nicht im Repo gebuendelt** (Lizenz).
   - **2,37 MB, MESHOPT-komprimiert (NICHT Draco!), 292 benannte kortikale Meshes**, MNI152-ICBM-2009c-Asym, Amunts et al. 2020.
   - Namens-Schema: `julich3-area-<arealcode>-<host-suffix>-<l|r>` → **der Host-Gyrus steht im Namen** (z.B. `area-44-ifg`, `op4-poperc`, `fp2-fpole`, `6mp-sma-mesial-sfg`).
2. **DKT-Geometrie** liegt in `archive/2026-06-11-mni-stack/public/figs3d/v2/glb/mni152-learn-brain.glb` (Draco). Enthaelt DKT-Kortex + Brodmann `ba-*` + Julich-FG/hOc + CIT168-Subkortex. **DKT = die figur-relevante gyrale Granularitaet** (pars opercularis=BA44, triangularis=BA45, orbitalis=BA47, rostral/caudal ACC, lateral/medial OFC). Julich = feinere zytoarchitektonische Ebene.
3. **MNI152 ≠ TARO sind ZWEI VERSCHIEDENE GEHIRNE.** MNI152 = Populations-Mittel, TARO (`brain.glb`, BodyParts3D) = Einzelindividuum. Globale Affine MNI→TARO ist ~**22 mm** lateral daneben (`work/residuals.json` h2_loo=21.9). **Es gibt keine perfekte globale Registrierung.** Methode der Wahl: **Within-Host-Split** (Parzelle auf den korrekten TARO-Gyrus zwingen, nur die innere Grenze registrieren). Eine echte dichte Surface-Registrierung wurde bewusst NICHT gewaehlt (riskanter zwischen zwei Hirnen).
4. **`julich3.glb` und `mni152-learn-brain.glb` liegen in UNTERSCHIEDLICHEN GLB-Welt-Frames** (z.B. Julich `area-44` vs DKT `parsopercularis` ~21 mm auseinander). → **Jede Quelle braucht ihre EIGENE `<source>→TARO`-Affine.** Die learn→TARO-Affine aus der 6-Patch-Pipeline gilt NICHT fuer Julich.
5. **`brain.glb` ist UNANTASTBAR.** Alle Sub-Patches kommen in SEPARATE GLBs. Das Runtime-`k11-subparcels.glb` enthaelt nur die in der App genutzten Patches; der volle Atlas liegt auf dem **Shelf** (`work/atlas-*.glb`, NICHT vom App-Asset geladen).
6. **Decoder:** `brain.glb` + `mni152-learn-brain.glb` = **Draco**; `julich3.glb` = **Meshopt**. `decode_glb.mjs` + `list_glb_names.mjs` setzen beide Decoder. Wer „setMeshoptDecoder must be called"-Fehler sieht: das GLB ist Meshopt.

---

## 1. Zwei Pipelines (nicht verwechseln)

### A) Runtime-Pipeline — `register.py` → `k11-subparcels.glb` (in der App)
Die hand-kuratierten, figur-genutzten Patches. **Diese GLB wird von der App geladen** (`SubParcels.tsx`).
- **Inhalt (Stand P4: 60 Meshes):**
  - **28 register.py-Patches** (`build_subparcels.mjs`-Basis, `work/k11-base-28.glb`): 6 Basis (`sma`, `pre-sma`, `anterior-cingulate` je l/r) + W1-B DKT-Splits (pars\*, rostral/caudal ACC, lateral/medial OFC, nucleus-accumbens) + W2 `frontopolar` (geom. Pol-Carve, jetzt ungenutzt) + **P4 GPi/GPe** (`gpi`/`gpe` je l/r — CIT168 within-host-Split des `globus-pallidus`-Hosts via Subkortex-Affine).
  - **32 Julich-Areale** (`bake_julich_runtime.mjs`, additiv auf die Basis): `julich-fp1/fp2` (Frontopol) + DLPFC-Subareale (`julich-mfg1/2/4`, `8v1/2`, `sfs1/2`, `sfg2/3/4`, `8d1/2`, 2 frontal-gapmaps) je l/r.
- **Targets:** `targets.json` (slug/src/names/host/mode[/group/warp/thresh_mm]). Modi: `absolute` (KDTree-Threshold), `partition` (zentroid-aligned Within-Host-Split — auch GPi/GPe + `warp:subcortical`), `geometric_pole` (Frontalpol = vorderste SFG+MFG-Spitze), `warp:subcortical` (eigene Striatum/Pallidum-Affine, da kortikale Affine Subkortex ~60 mm verfehlt). GPi/GPe-Quellgeometrie: `work/subcort_gp_extra.json` (CIT168 internus/externus, in `learn` gemerged).
- **Reproduktion:** `./.venv/bin/python register.py && node build_subparcels.mjs` (28-Patch-Basis) → `cp` nach `work/k11-base-28.glb` → `node bake_julich_runtime.mjs` (+32 Julich = 60). bake_julich ist idempotent (carvt das verwaltete Set immer frisch aus `k11-base-28.glb`).
- **NICHT anfassen ausser fuer Runtime-Aenderungen.** Verifiziert (typecheck 0, vitest 48/48, 7 Smokes).

### B) Transform-Pipeline — `register_atlas.py` → `work/atlas-*.glb` (Shelf, NICHT Runtime)
Das **gesamte** Julich + DKT auf TARO, als wiederverwendbares Artefakt fuer spaetere Integration. Beruehrt die Runtime NICHT.
- **Reproduktion:**
  ```bash
  # Julich: Meshopt-GLB decoden (kanonische Quelle, s. Abschnitt 0)
  node decode_glb.mjs work/julich3.glb work/julich_parcels.json "^julich3-"   # julich3.glb extern bereitstellen (s. Abschnitt 0)
  # Alle TARO-Kortex-Hosts decoden (62 Meshes)
  node decode_glb.mjs ../../apps/brain-app/public/assets/bodyparts3d/brain.glb work/taro_cortex_hosts.json "^(left|right)-(…alle Kortex-Gyri…)$"
  # Transform + Bake
  ./.venv/bin/python register_atlas.py julich work/julich_parcels.json
  node atlas_bake.mjs julich
  # DKT analog: decode_glb (DKT-Regex) -> dorsal/ventral-Merge -> register_atlas.py dkt -> atlas_bake.mjs dkt
  ```
- **Mapping:** `host_map.json` (56 Julich-Suffixe + DKT-Namen → TARO-Host). Combined-Hosts: `ofc-combined`, `ipl-combined`, `frontal-pole-combined`, `insula-combined`, `heschl-combined`. Sonderfaelle: Sulci→adjazenter Gyrus, Gapmaps→`AUTO_NEAREST` (zentroid-naechster Host, geloggt), Hippocampus-Subfelder→`hippocampus-proper`.
- **Ergebnis (2026-06-12):** **352 Parzellen, null Drops** — 292/292 Julich (274 sauber Median 4.1 mm + 18 Backfill) + 60/60 DKT (Median 2.3 mm).

---

### C) Carve-Surface-Pipeline — `bake_carve.mjs` → `atlas-surface-*.glb` (in der App)
Die figur-genaue **Areal-Einfaerbung auf dem gefurchten TARO-Kortex** (Footer → Atlas → „Atlas auf Hirn").
Laedt `AtlasOverlay.tsx`. **Ersetzt** die alte `bake_carved_surface.mjs` (splitTri-Cut → erzeugte Slivers).

**Vier Prinzipien (teuer erkaempft — NICHT zurueckdrehen):**
1. **GRENZ-KONFORMER Cut (`splitTri`) auf dem gefurchten clean-Mesh** → gerade, scharfe Arealgrenzen.
   **T-JUNCTION-FREI per Konstruktion** (geteilte Kante (P,Q) wird von beiden Nachbardreiecken identisch
   am Mittelpunkt geteilt; per-Vertex-Labels → konsistent). Verifiziert: offene Kanten bleiben ~2204
   (= Basis-Mesh), Normalen-Fehler <0.01 %, 0 degenerierte Dreiecke (`verify_topology.mjs`).
2. **WINDING-Korrektur (entscheidend gegen die „Shards"!):** `splitTri` emittiert manche Sub-Dreiecke
   gegenlaeufig UND die TARO-Gyri haben gemischte Face-Wicklung → falsch orientierte Normalen = gr/oliv-
   gruene Dreiecks-Flaps (im `MeshNormalMaterial` als Fehlfarben sichtbar — DAS war der „Spikes"-Bug).
   Fix: jedes Sub-Dreieck an der Eltern-Face-Normale ausrichten (Indizes tauschen wenn dot<0). Zusaetzlich
   ist `splitTri` selbst wicklungs-konsistent (Test in `carve_cut.test.mjs`). KEIN `laplacianSmooth`
   (off-surface Spikes), KEINE Normal-Inflation (riss Grenz-Duplikate). Mittelpunkte bleiben on-surface.
3. **Harte Farbkante (kein Batik):** `splitTri` dupliziert Grenz-Mittelpunkte pro Sub-Dreieck mit dessen
   Label → benachbarte Areale teilen KEINE Vertices an der Grenze → keine Farb-Interpolation. Material
   simpel: `vertexColors` + smooth NORMAL + `polygonOffset` (z-Fight gegen Cortex, kein Geometrie-Versatz).
   (Der `flat varying`-Shader-Weg wurde verworfen: `vColor` war nicht im assemblierten Shader → wirkungslos.)
4. **Wissenschaftlich treue Labels:** exakter Positions-Match der registrierten `atlas_labels_*`
   + **Nearest-Centroid-Aufloesung der Combined-Host-Overlaps** (Within-Host-Partition; sonst verschluckt
   z.B. `inferiorparietal`/`ipl-combined` das ganze `supramarginal`) + Seed-Garantie + Nearest-Fill nur
   fuer Luecken. **Normalen richtungs-bewusst** (`weldedNormalsDirectional`): gegenlaeufige Sulcus-Waende
   am ×64-Weld nicht zusammenfassen (sonst nach innen kippende Normalen → dunkle Chevrons).

**Reproduktion:**
```bash
node export_clean_cortex.mjs                          # work/taro_cortex_clean.obj (Merge + ×64-Weld, gefurcht)
node bake_carve.mjs dkt                               # + julich + brodmann  -> atlas-surface-*.glb + -pick.json
node audit_carve_fidelity.mjs dkt                # Treue-Audit: registriert vs. Carve (0 FEHLEND erwartet)
node verify_topology.mjs dkt                     # Normalen-Richtung, T-Junctions (offene Kanten ~2204), Slivers
```
**Audit-Stand:** 0 fehlende Parzellen; Normalen-Fehler <0.01 %; T-junction-frei (offene Kanten ~Basis 2204);
0 degeneriert, ~60 winzige Tripelpunkt-Slivers (on-surface, unkritisch). Rest-„Drift"/„Erosion" im
Fidelity-Audit sind KEINE Fehler (Nearest-Fill-Tiling bzw. korrekte Within-Host-Partition). Decke §3/§3c.

**Verworfen & GELOESCHT (NICHT erneut versuchen):**
- **Blender-Voxel-Remesh** (`remesh.py`) → ballonte die Furchen weg (Sulci gefuellt).
- **Label-Textur** (`uv_unwrap.py`+`bake_label_texture.mjs`) → gefalteter Cortex hat keine gute UV (Smart
  UV Project zersplittert in hunderte Mini-Inseln); ohne FreeSurfer-Inflation nicht bijektiv loesbar.
- **`flat varying`-Shader** → `vColor` war im assemblierten r184-Shader nicht vorhanden → wirkungslos.
- **non-indexed flat-per-Dreieck** → harte Farbe ja, aber Dreiecks-Treppe (Zacken).
- **`laplacianSmooth` / Material-Normal-Inflation** → Spikes/Shards.
- **`bake_carved_surface.mjs`** → ersetzt durch `bake_carve.mjs`.
- **Blender `fix_winding.py`** → unnoetig, der Bake-seitige Winding-Flip reicht (kein Blender im Carve-Pfad).
`carve_cut.mjs::splitTri`/`weldedNormalsDirectional` werden WEITER genutzt.

## 2. Schluessel-Mechanismen (warum es funktioniert)

- **Within-Host-Partition (zentroid-aligned):** Pro TARO-Host alle zugeordneten Parzellen gemeinsam auf den Host-Schwerpunkt zentrieren (entfernt den ~22 mm Bulk-Offset), dann jeden Host-Vertex der naechsten Parzelle zuweisen. Nur die RELATIVE Anordnung entscheidet die innere Grenze → robust gegen lateralen Registrierungs-Fehler. **Ohne Zentroid-Alignment reisst die am weitesten versetzte Teilregion (z.B. parsorbitalis) auf 0 Vertices.**
- **Subkortex-Affine:** Kortikal gefittete Affine extrapoliert auf tiefe Strukturen katastrophal (accumbens ~60 mm daneben). Eigene Affine aus Striatum/Pallidum-Landmarks (LOO 5.4 mm). Flag `warp:subcortical`.
- **Backfill (Transform-Pipeline):** In ueberfuellten Hosts (IFG bekommt 15+ Julich-Areale) verlieren winzige Parzellen per argmin alle Vertices. Backfill gibt ihnen garantiert ihre `FLOOR`=12 naechsten Host-Vertices (ueberlappend, ehrlich `backfill:true` markiert). `atlas_bake.mjs` hat einen Face-Fallback fuer Patches an Combined-Host-Naehten.
- **AUTO_NEAREST:** Gapmaps (Atlas-Uebergangszonen ohne klaren Namens-Host) → geometrisch dem zentroid-naechsten Kortex-Gyrus zugewiesen, im Log nachvollziehbar.

---

## 3. Praezisions-Decke (ehrlich)

- **Topologisch/lokal korrekt** (richtiger Gyrus, richtige relative Lage) — ja, fuer alle Parzellen.
- **Morphometrisch exakt — NEIN.** Die innere Grenze ist registrierungs-genaehert. Bekannte Artefakte aus dem **TARO-Mesh selbst** (nicht aus der Registrierung): `medial-orbital-gyrus` hat nur 422 Vertices (vs 4898 lateral) → medialer OFC strukturell untergroß. Solche bleiben unabhaengig vom Atlas.
- **Gegen das Buch (Kapitel 11):** Abbildungen sind schematisch (welche Region leuchtet, keine mm). Fuer „richtige Funktionsregion einfaerben" adaequat; fuer zytoarchitektonische Praezision Julich nutzen.
- **`backfill:true`-Patches** sind Naeherungen (ueberlappend) — fuer „color this area" ok, nicht fuer Flaechen-/Volumen-Messung.

---

## 3b. Verifikation & bekannte Limitationen des Voll-Transforms

**`verify_atlas.py`** prueft das Artefakt (reine Geometrie, kein Browser): anatomische Anordnung
(area-44 posterior zu area-45, Frontalpol am anteriorsten, V1 am posteriorsten, pre-SMA vor SMA, …)
**+ Ballooning-Detektor** (Parzellen >3500 Vertices). Stand 2026-06-12: **6/6 Anordnungs-Checks ✓**.

Zwei **combined-Host-Fallen** (hier dokumentiert, damit sie nicht neu entdeckt werden):
1. **Under-Tiling → GEFIXT.** Wenn wenige Parzellen einen grossen combined-Host bewohnen, den sie
   nicht ausfuellen (nur `fp1/fp2` im ganzen SFG+MFG), blaehen sie sich auf dessen Haelften auf statt
   nur den Pol. Fix: `host_restrictions` in `host_map.json` (`frontal-pole-combined` → anteriore
   25mm-Kappe), angewandt via `eligible_mask()` in `register_atlas.py` (volle Host-Indizierung bleibt
   fuer `atlas_bake.mjs` erhalten, nur die Zuweisung wird maskiert). fp2 sitzt danach korrekt anterior.
2. **Voronoi-Imbalance → BEKANNT/akzeptiert.** Im `ofc-combined` dominiert `fo3` (~8000 Vertices),
   weil die uebrigen OFC-Areale per Affine teils ausserhalb der Orbital-Gyri landen → fo3 gewinnt fast
   alle Vertices. Nicht figur-kritisch (Runtime nutzt lateral/medial OFC via DKT). Der Ballooning-
   Detektor flaggt es dauerhaft; bei Bedarf via host_restriction/feinerer OFC-Affine fixbar.

## 3c. „<5 mm auf TARO"-Verdikt (NICHT erneut versuchen)

**Frage (2026-06-13):** „Areale mit <5 mm Toleranz auf das TARO-Hirn übertragen." **Antwort: für die
zytoarchitektonischen Areale NICHT erreichbar** — aus zwei unabhängigen Gründen. Hier festgehalten,
damit es nicht ein weiteres Mal als „Durchbruch" angegangen wird.

1. **Gemessen reicht es nicht.** Der Voll-Transform-Shelf (Within-Host-Split) liefert pro Parzelle
   nur **Mediane** in dieser Güte: **Julich 61 % / DKT 72 % der Parzellen <5 mm Median**, p90 = 6,5–10,8 mm,
   Tails bis 14–22 mm (`work/atlas_residuals_{julich,dkt}.json`). Per-Vertex ist die <5-mm-Abdeckung noch
   niedriger (Median ⇒ Hälfte der Vertices schlechter).
2. **Daten-Decke.** TARO stammt aus einem **2-mm-MRT** (NICT-Voxel-Phantom) und das `brain.glb` ist die
   von Illustratoren **nachbearbeitete** Mesh-Version → kein sauberes 1-mm-T1 / keine FreeSurfer-Cortex-
   Surface für echte Surface-Registrierung (FreeSurfer/MSM). 2 mm ist zu grob für Recon.
3. **Biologische Decke.** Selbst perfekte Surface-Registrierung richtet sich nach **Faltung**; zyto-
   architektonische Areale (gerade **BA44/45, hOC5** — die Kapitel-11-relevanten) variieren relativ zur
   Faltung um **Zentimeter** zwischen Individuen. <5 mm ist zwischen zwei verschiedenen Hirnen für diese
   Areale nicht definierbar.

**Konsequenz / Entscheidung:** **fsaverage = der präzise Atlas** (Areale dort nativ, 0 mm — siehe
Atlas-App-Modus). **TARO = schematischer Figur-Layer** (60 Carve-Patches, „welche Region leuchtet" für
die schematischen Kapitel-Abbildungen — dafür ausreichend). Beides bleibt getrennt; nicht versuchen,
den Voll-Atlas <5 mm auf TARO zu zwingen.

## 4. Artefakt-Inventar

| Datei | Was | Runtime? |
|---|---|---|
| `apps/brain-app/public/assets/bodyparts3d/k11-subparcels.glb` | 60 figur-genutzte Patches (28 register.py + 32 Julich) | **JA (App laedt)** |
| `work/k11-base-28.glb` | register.py-Basis-Snapshot (Input fuer bake_julich) | nein (Build-Input) |
| `work/atlas-julich.glb` | 292 Julich-Parzellen | nein (Shelf) |
| `work/atlas-dkt.glb` | 60 DKT-Parzellen | nein (Shelf) |
| `work/atlas_labels_{julich,dkt}.json` | Parzelle → TARO-Host + Vertex-Indices | nein |
| `work/atlas_residuals_{julich,dkt}.json` | je Parzelle Median/n/backfill | nein |
| `work/atlas-manifest.json` | Integrations-Index (352 Parzellen) | nein |
| `work/{taro_cortex_hosts,julich_parcels,dkt_parcels}.json` | dekodierte Geometrie-Caches | nein |
| `host_map.json`, `targets.json` | Mapping-/Target-Tabellen | nein |

## 5. Integration in die Runtime (deferred P4 — nur auf Wunsch)
Gewuenschte Slugs aus `atlas-manifest.json` → in `k11-subparcels.glb` backen (analog `build_subparcels.mjs`, Quelle = `atlas_labels_*`) + in `apps/brain-app/src/viewer/bucketMeshes.ts` verdrahten. Dann z.B. `frontopolar`→echtes `fp1/fp2`, `ifj`→`ifj1/2` (letzte Lücke zu). `structure-coords.json` ergaenzen (CameraRig `unionBounds`), SubParcels-Preset-Faerbung greift automatisch (gleicher Resolver).

## 6. Skripte
| Skript | Zweck |
|---|---|
| `decode_glb.mjs` | GLB (Draco+Meshopt) → world-space Vertices/Faces JSON |
| `list_glb_names.mjs` | nur Mesh-Namen eines GLB (Draco+Meshopt) |
| `register.py` | Runtime-Patches (6 + W1-B + W2) → `labels.json`/`residuals.json` |
| `build_subparcels.mjs` | Runtime-Patches carven → `k11-subparcels.glb` |
| `register_atlas.py` | **Voll-Transform** Julich/DKT → `atlas_labels_*` (source-agnostisch, host_map) |
| `atlas_bake.mjs` | Shelf-Bake voller Atlas → `work/atlas-*.glb` |
| `verify_atlas.py` | Anatomische Anordnungs-Checks + Ballooning-Detektor des Artefakts |
| `smoke-*.mjs` | Browser-Smokes (preset/figures/carve/frontopolar/eeg/eeg-p3z/eeg-p3b) |

Vollstaendige Wave-/Phasen-Historie: `docs/superpowers/plans/2026-06-12-*.md` (mni-subparcellation, granulare-faerbemodi, julich-dkt-voll-transform).
