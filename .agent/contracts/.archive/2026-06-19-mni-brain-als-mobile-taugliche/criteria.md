---
outcome:
  user_signal: |
    Das MNI Brain kann als detailreiches, mobile-taugliches Referenzmodell bewertet
    werden, ohne TARO blind zu ersetzen.
  observable_in: |
    Contract-Eval, MNI-Inventar, BrainModel-Importmanifest und Browser-Smoke-
    Evidenz im Standalone-Repo.
  guardrail: |
    Mobile darf kein HQ-Asset laden; bestehende TARO-Overlays und Doku-Drift-Gates
    duerfen nicht regressieren.
  read_horizon: |
    Vor jeder Entscheidung, MNI als Default zu setzen oder TARO im Explorer zu
    ersetzen.
---

# Akzeptanzkriterien — MNI Brain als mobile-taugliches Referenzmodell optimieren

> Contract-ID: `2026-06-19-mni-brain-als-mobile-taugliche`
> Revision: v1 (2026-06-19)

Jedes Kriterium MUSS binaer testbar sein (Pass/Fail). Keine vagen Begriffe
("appropriate", "robust", "clean"). Konkrete, messbare Aussagen.

## C1 — MNI-Inventar ist reproduzierbar
- Szenario: MNI-Assets aus dem alten Monorepo werden inventarisiert
  - Input: exakt diese aktiven Mengen ohne `_archive/`, `.backup*/`, `.pre-*` und andere Backup-/Archiv-Unterverzeichnisse: `mni152-native-highqual-brain*.glb`, `mni152-learn-brain.glb`, `mni152-composition-brain.glb`, `subcortex-cit168.glb`, `regions_bigbrain/*-{hires,medium,low}.glb` und alle GLBs, die in `brain-models.json` referenziert sind
  - Erwartet: Ein Artefakt listet pro Datei Pfad, Hash, MB, Meshzahl, Materialzahl, Vertexzahl, Indexzahl, Bounding-Box, Rolle und bekannte Quelle; ein zweiter Lauf mit demselben Input erzeugt dieselbe sortierte Pfad-/Hash-Liste

## C2 — Mobile-Kandidat verletzt kein Budget
- Szenario: Der mobile MNI-Kandidat wird gegen das Mobile-Budget geprueft
  - Input: `mni152-native-highqual-brain-mobile-balanced.glb` oder ein neu erzeugter Mobile-LOD-Kandidat
  - Erwartet: Datei <= 8 MB, Vertices <= 1,6 Mio., Indices <= 10 Mio., Materials <= 24, Meshes <= 550; jede Abweichung blockiert den Default-Vorschlag mit Begruendung

## C3 — HQ-Leak ist ausgeschlossen
- Szenario: Mobile-Profil oeffnet den MNI-Kandidaten im Browser
  - Input: Mobile-Smoke mit Viewport 390x844, `isMobile=true`, `hasTouch=true` und DPR 3
  - Erwartet: Network/Runtime-Evidenz zeigt nur den Mobile-LOD oder einen kleineren Kandidaten; `mni152-native-highqual-brain.glb` wird nicht geladen

## C4 — Detailkritische Regionen bleiben erhalten
- Szenario: Qualitaets-A/B zwischen HQ, Desktop-LOD, Mobile-LOD und TARO
  - Input: Screenshot-Set mit lateral, medial, frontal und superior fuer HQ, Desktop-LOD, Mobile-LOD und TARO plus Checkliste fuer PFC, Sulci/Gyri, Hippocampus/Amygdala, Thalamus/Basalganglien und kortikale ROI-Grenzen
  - Erwartet: Das Eval enthaelt pro Region genau einen Status `PASS` oder `FAIL`; ein `FAIL` blockiert den Mobile-Kandidaten. `PASS` ist nur erlaubt, wenn die Region im Mobile-Screenshot sichtbar, anatomisch plausibel positioniert und gegen HQ/TARO nicht vollstaendig verloren oder grob verschmolzen ist.

## C5 — Space- und Alignment-Vertrag ist explizit
- Szenario: MNI-Kandidat wird als BrainModel beschrieben
  - Input: Importmanifest fuer den Kandidaten
  - Erwartet: Manifest enthaelt `brainModelId`, `spaceId`, Koordinatenframe, Unit, Up-Axis, Transformkette, Asset-Hashes, LOD-Rollen und bekannte Limitierungen

## C6 — Problematische Monorepo-Quellen werden nicht blind uebernommen
- Szenario: Asset stammt aus einer im Audit kritisierten Quelle oder einem dirty/untracked Pfad
  - Input: GLB/Sidecar aus dem alten Monorepo mit geaendertem, geloeschtem oder untracked Git-Status
  - Erwartet: Das Contract-Eval markiert den Importstatus als `BLOCKED`, bis Quelle, Hash, Buildscript, Alignment-Gate und Visual-Gate dokumentiert sind; der Kandidat darf in keinem BrainModel-Manifest als `default` erscheinen

## C7 — TARO bleibt stabil
- Szenario: MNI-Kandidat wird in Standalone vorbereitet
  - Input: bestehende TARO-Carve-Overlays und `BodyParts3DViewer`-Explorerpfade
  - Erwartet: TARO bleibt lauffaehig; MNI wird nicht durch Austausch von `brain.glb` aktiviert; inkompatible TARO-Carve-Sidecars werden nicht auf MNI angewendet

## C8 — Negativfall: inkompatibles Overlay wird abgelehnt
- Szenario: Ein TARO-Carve-Sidecar wird fuer ein MNI-BrainModel angefragt
  - Input: Overlay ohne passende `brainModelId`/Vertexreihenfolge/Transformmetrik
  - Erwartet: Validierung liefert einen blockierenden Fehler statt Nearest-Neighbor- oder Silent-Fallback-Rendering

## C9 — Doku-Drift-Gate bleibt gruen
- Szenario: MNI-Contract oder Importvorbereitung aendert Architektur-/Produktdoku
  - Input: `pnpm --dir apps/brain-app docs:drift`
  - Erwartet: Exit 0; jeder Exit ungleich 0 blockiert den Contract-Abschluss, bis die Drift-Funde entweder bereinigt oder als erlaubte historische Treffer im Drift-Guard kodiert sind
