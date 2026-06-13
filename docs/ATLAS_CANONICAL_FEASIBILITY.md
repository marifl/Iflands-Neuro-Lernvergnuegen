# Kanonischer Hirnatlas — Machbarkeits-Befund (belegt)

> **Stand:** 2026-06-13. Auftrag: „Erst Inventur + Machbarkeit." Dieses Dokument beantwortet,
> ob ein **allgemeingültiger, 100 % korrekter, granularer und performanter** 3D-Hirnatlas aus den
> vorhandenen Quellen baubar ist — mit Belegen (URLs) statt Behauptungen. Es ist **kein** finaler
> Design-Doc; es ist die Entscheidungsgrundlage.

## 0. Verdikt vorweg

**Ja, machbar — und der Weg ist Industriestandard.** Der Grund, warum frühere Versuche an Performance
starben, war **architektonisch** (ein Mesh pro Areal → >900 Draw-Calls), nicht prinzipiell. Die richtige
Architektur ist seit Jahren etabliert (FreeSurfer, Connectome Workbench, pycortex, BrainBrowser):

> **EINE kanonische Kortexoberfläche (fsaverage) + mehrere Per-Vertex-Label-Layer + GPU-Umfärbung.**

Das löst **alle drei** Ziele zugleich: korrekt (kanonischer Raum), granular (jeder Vertex trägt alle
Atlas-Labels), performant (ein Mesh, ein Draw-Call).

**Die eigentliche Entscheidung ist nicht technisch, sondern Lizenz + Scope** (siehe §3, §5).

---

## 1. Warum „auf TARO zwingen" der Konstruktionsfehler war

Belegt durch lokales Inventar (`scripts/atlas/work/`, gemessen 2026-06-13):

| Quelle | Parzellen | Schwerpunkt (mm) | Span (mm) | Befund |
|---|---|---|---|---|
| julich_parcels | 292 | [0.7, 19.7, 20.3] | 139×127×175 | mm-Skala, **eigener Ursprung** |
| dkt_parcels | 60 | [0.4, −1.6, −3.3] | 144×135×177 | **~22 mm versetzt** zu Julich |
| mni_allen_all | 551 | [−5.7, 13.2, 18.9] | 333×**1053**×208 | **Y-Span 1053 mm = Geometrie-Müll** |
| mni_subcort | 6 | [−0.7, −15.1, −20.8] | 73×40×50 | sauber, separat (subkortikal) |

Unsere bisherigen Extrakte sind **keine kohärente Basis**: verschiedene Frames, Allen kaputt. Und TARO
(BodyParts3D) ist ein **Einzelindividuum**, ~13,5° gekippt — für einen *allgemeingültigen* Atlas das
falsche Substrat. Atlanten leben kanonisch in **fsaverage / MNI**, nicht auf einem zufälligen Schädel.

→ Konsequenz: Den Atlas in **fsaverage** bauen (der gemittelten Standard-Oberfläche), nicht auf TARO
warpen. Die Sample-Punkt-Warp-Idee ist eine valide Technik (Landmark-TPS) — aber im gemeinsamen
fsaverage-Raum unnötig, weil die Atlanten dort schon co-registriert vorliegen (s. §3). Wo Registrierung
nötig ist, macht es FreeSurfers **sphärische Surface-Registrierung** (sulcus-getrieben, tausende
Korrespondenzen) automatisch und robuster als Hand-Pins.

---

## 2. Die Architektur (Render + Pick)

Quelle der Empfehlung: Recherche-Synthese (threejsfundamentals „Indexed Textures", three-mesh-bvh,
BrainBrowser, pycortex, Nilearn `view_surf`).

- **Geometrie:** EINE fsaverage-Oberfläche. Standard = **163.842 Vertices/Hemisphäre** (≈ 327k gesamt);
  Low-Res-Fallback **fsaverage6 = 40.962/Hemi**. Alle Surface-Varianten (`pial`/`white`/`inflated`)
  teilen denselben Vertex-Index → Morph zwischen pial↔inflated gratis.
  Beleg: mne.tools FreeSurfer-Background, diedrichsenlab surface-guide.
- **Label-Layer:** pro Atlas EIN `Int`-Attribut je Vertex (`aLabelJulich`, `aLabelDKT`, …), alle
  koexistierend. Umschalten = anderes Attribut aktiv / andere LUT.
- **Färbung:** Farbe aus kleiner **Color-LUT (`DataTexture`, NearestFilter)** im Fragment-Shader
  (`label/maxLabel`). Umfärben/Highlight/„alles grau außer X" = nur LUT/Uniform anfassen — **kein
  Re-Upload der Vertex-Daten**. `flat varying` für die Label-ID ist Pflicht (sonst Misch-IDs an
  Arealgrenzen). WebGL2/GLSL3 für Integer-Attribute.
- **Picking:** CPU-Raycast auf das EINE Mesh, beschleunigt mit **three-mesh-bvh** → `faceIndex` →
  Vertex → `labelArray[v]` → Areal-ID. Robust, stall-frei (kein GPU-Readback). R3F: `onClick`/
  `onPointerMove` liefern `faceIndex` + `point` direkt.
- **Performance:** 327k Vertices in 1 Draw-Call mit **32-bit-Indices** sind unkritisch. Erst bei
  gemessenem Bottleneck (Mobile, mehrere Layer + Postprocessing) auf fsaverage6 runter — nicht prophylaktisch.
- **R3F-Hygiene:** Geometrie/Material außerhalb des React-Render-Pfads memoisieren; Färbung imperativ
  via Ref aufs Material, nicht über React-State pro Frame.

**Subkortex (BG, Thalamus) ist NICHT auf der Kortexoberfläche** — Kapitel 11 ist aber PFC **+ Basalganglien**.
→ Hybrid: Kortex = Surface+Labels, subkortikale Kerne = wenige kleine Solid-Meshes (haben wir teils:
`mni_subcort.json` + CIT168). Das ist sauber trennbar und performant (Handvoll Meshes).

---

## 3. Datenquellen — was frei & in der richtigen Form verfügbar ist

| Atlas | fsaverage-Surface? | Granularität | Lizenz | Eignung |
|---|---|---|---|---|
| **DKT** (`aparc.DKTatlas.annot`) | **ja, nativ in FreeSurfer** | 31/Hemi (62) — inkl. pars opercularis/triangularis/orbitalis, rostral/caudal ACC, lat/med OFC | **permissiv** (MGH 2011) | ✅ **Fundament** |
| **Desikan-Killiany** (`aparc.annot`) | ja, nativ | 34/Hemi (68) | permissiv | ✅ optional |
| **Destrieux** (`aparc.a2009s.annot`) | ja, nativ | 74/Hemi (148, Gyri+Sulci) | permissiv | ✅ feiner gyral |
| **Julich-Brain v3** | **ja**, via siibra-python (`get_map(space="fsaverage")` → `verts/faces/labels`) | 148 kortikale Areale (zytoarchitektonisch) | **CC BY-NC-SA** (NC + ShareAlike, viral) | ⚠️ nur nicht-kommerziell |
| **Brodmann** (`BA_exvivo.thresh.annot`) | ja, nativ in FreeSurfer | **nur Subset** der BAs (1,2,3,4,6,44,45,17,18,MT…) | **„no commercial use"** | ⚠️ Subset + NC |
| **Allen Human** | **nein** (2D-histologisch / grobes MNI-Volumen, 141 Strukturen) | kortikal grob | NC | ❌ als Surface-Layer; nur 2D-Referenzbild |
| **BigBrain** | via BigBrainWarp möglich | Laminae/Mikrostruktur (Overkill für Lehre) | CC BY-NC-SA | ❌ v1; späteres Nice-to-have |

**Belege:** DKT/DK/Destrieux/BA + fsaverage-Vertexzahlen + `.annot`-Format (nibabel `read_annot`,
Falle `orig_ids=False`): surfer.nmr.mgh.harvard.edu (FsTutorial, BrodmannAreaMaps), andysbrainbook,
nipy.org/nibabel. — Julich v3 auf fsaverage + siibra: search.kg.ebrains.eu/instances/f1fe19e8…,
juser.fz-juelich.de/record/916305, siibra-python.readthedocs.io (Access surface maps), Amunts et al.
Science 2020 (doi:10.1126/science.abb4588). — Allen: help.brain-map.org, community.brain-map.org
(„Allen Human Reference Atlas – 3D, 2020", MNI152, 141 Strukturen, kortikal grob). — BigBrain/
BigBrainWarp: elifesciences.org/articles/70119, github.com/caseypaquola/BigBrainWarp,
ftp.bigbrainproject.org/.../License.txt.

### FastSurfer-Rolle (Skill `fastsurfer-overview`)
FastSurfer ist **nicht** nötig, um den kanonischen Atlas zu *bauen* — die fsaverage-Geometrie und
DKT/DK/Destrieux/BA-Annotationen liegen bereits in `$FREESURFER_HOME/subjects/fsaverage` bzw. werden
mitgeliefert; Julich kommt via siibra. FastSurfer ist relevant für **zwei spätere Optionen**:
(a) Atlas auf ein **konkretes Individuum** mappen (Output `label/?h.aparc.DKTatlas.mapped.annot` +
Surfaces) — falls je gewünscht, den Atlas auf ein bestimmtes Referenzhirn statt fsaverage zu legen;
(b) Surfaces aus einem Volumen erzeugen. Für die v1 (kanonisch auf fsaverage) brauchen wir **keinen
FastSurfer-Run**.

---

## 4. Die ehrlichen Randbedingungen

1. **Kortex-Surface ≠ Subkortex.** Surface-Annotationen decken nur den Kortex. BG/Thalamus brauchen
   einen separaten Mesh-/Volumen-Pfad (haben wir teils). Kein Blocker, aber zwei Pfade.
2. **Lizenz-Gabel (die eigentliche Hauptfrage):**
   - **Permissiv:** DKT/DK/Destrieux → freie Nutzung + Redistribution mit Attribution. Deckt die
     Kapitel-11-Granularität (benannte Gyri, IFG-Subdivisionen, ACC, OFC) **bereits ab**.
   - **NC + ShareAlike:** Julich, Brodmann-BA, BigBrain, Allen → nur **nicht-kommerziell**; ShareAlike
     zwingt abgeleitete Atlas-Assets unter dieselbe Lizenz. **Sobald die App je monetarisiert wird,
     fallen diese raus.**
   → Die Wahl der Quellen hängt davon ab, ob die App je kommerziell wird.
3. **fsaverage ≠ TARO.** Der Atlas lebt auf der gemittelten Standard-Oberfläche, nicht auf TARO. Das ist
   für „allgemeingültig + 100 % korrekt" **richtig so** — aber es heißt: Atlas-Modus = fsaverage-Hirn,
   nicht das TARO-Hirn der Grobanatomie. Zwei Substrate, je perfekt in ihrem Raum.
4. **Version-Pinning.** siibra (Julich 2.9/3.0/3.1) + Mesh-Vertex-Reihenfolge müssen exakt zur
   Label-Array-Reihenfolge passen, sonst Labels verschoben. Eine Version festnageln.

---

## 5. Empfohlener Scope v1 + offene Entscheidungen

**Empfehlung v1 (permissiv, vollständig genug, performant):**
- fsaverage-Kortexoberfläche (pial + inflated, gemeinsamer Vertex-Index)
- Layer: **DKT** (Fundament) + optional **Destrieux** (feiner gyral) — beide permissiv
- Subkortikale Kerne (BG) als separate Solid-Meshes (CIT168/vorhandene)
- Architektur §2 (Single-Surface + Per-Vertex-Label + LUT + BVH-Pick)

**Julich/Brodmann** als zusätzlicher Layer **nur**, wenn die App nicht-kommerziell bleibt (NC/SA).

**Offene Entscheidungen (für den Design-Doc):**
- A) Wird die App je kommerziell? → entscheidet, ob Julich/Brodmann erlaubt sind.
- B) fsaverage-Atlas-Modus als eigenständiger Modus neben TARO, oder TARO im Atlas-Modus ersetzen?
- C) v1-Layer-Set: nur DKT, oder DKT+Destrieux(+Julich)?
- D) Volle fsaverage (327k) oder fsaverage6 (82k) als Start?

---

## 6. Nächste Schritte (nach Entscheidung)

1. Verifizieren: liegt `$FREESURFER_HOME/subjects/fsaverage` + die `.annot`-Dateien lokal vor?
   (FastSurfer-Setup ist da; FS-Lizenz nötig für Surface-Tooling.)
2. Kleiner Extraktor (Python/nibabel + ggf. siibra): `lh/rh.pial` + gewählte `.annot` →
   Binär-Vertex/Face/Label-Arrays + Farb-LUT-JSON für WebGL. `orig_ids`-Falle + Medial-Wall-Maske beachten.
3. R3F-Prototyp: ein Surface-Mesh + ein Label-Attribut + LUT-Shader + BVH-Pick. An EINEM Layer
   Performance + Pick verifizieren, dann Layer-Switch ergänzen.
4. Subkortex-Pfad separat anbinden.

→ Erst nach Entscheidung §5 in den Design-Doc + Implementierungsplan (writing-plans).
