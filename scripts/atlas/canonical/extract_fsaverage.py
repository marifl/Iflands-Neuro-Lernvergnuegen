# Kanonischer-Atlas-Extraktor (P2-2): volle fsaverage-Surface (163.842 Vtx/Hemi)
# + drei koexistierende Label-Layer:
#   - DKT      (Macroanat., templateflow Desikan2006, GIFTI label.gii)
#   - Destrieux(Macroanat., templateflow Destrieux2009, GIFTI label.gii)
#   - Julich   (Cytoarchit., siibra v3.0.3 MNI152-NIfTI -> nilearn vol_to_surf, bewiesen P2-1)
# -> kompakte Binaer-Assets + LUT-JSON + Manifest fuer die WebGL-Runtime.
#
# Vertex-Order-Garantie (P2-1 verifiziert): templateflow-164k-Surfaces == neuromaps-164k-Surfaces
# (coords max abs diff = 0.0, faces identisch). Die templateflow label.gii teilen diese Order.
# Surfaces kommen aus neuromaps (enthaelt pial UND inflated; templateflow hat kein inflated).
# Julich-vol_to_surf nutzt DIESELBE pial-Surface -> Labels liegen auf identischer Vertex-Order.
#
# Fail-loud: jede Inkonsistenz (Vertexzahl, Topologie, negative Label-Id) bricht hart ab.
import json
from pathlib import Path

import nibabel as nib
import numpy as np
import siibra
from nilearn import surface

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "apps/brain-app/public/assets/atlas-canonical"
OUT.mkdir(parents=True, exist_ok=True)

NEUROMAPS = Path.home() / "neuromaps-data/atlases/fsaverage"
TEMPLATEFLOW = Path.home() / "Library/Caches/templateflow/tpl-fsaverage"

N_VERTS = 163842  # fsaverage (= fsaverage7), Verts/Hemisphaere

SURF = {
    "L": {
        "pial": NEUROMAPS / "tpl-fsaverage_den-164k_hemi-L_pial.surf.gii",
        "infl": NEUROMAPS / "tpl-fsaverage_den-164k_hemi-L_inflated.surf.gii",
        "sulc": NEUROMAPS / "tpl-fsaverage_den-164k_hemi-L_desc-sulc_midthickness.shape.gii",
    },
    "R": {
        "pial": NEUROMAPS / "tpl-fsaverage_den-164k_hemi-R_pial.surf.gii",
        "infl": NEUROMAPS / "tpl-fsaverage_den-164k_hemi-R_inflated.surf.gii",
        "sulc": NEUROMAPS / "tpl-fsaverage_den-164k_hemi-R_desc-sulc_midthickness.shape.gii",
    },
}

# templateflow label.gii pro Hemi (DKT desc-curated; Destrieux2009)
LABELGII = {
    "L": {
        "dkt": TEMPLATEFLOW / "tpl-fsaverage_hemi-L_den-164k_atlas-Desikan2006_seg-aparc_desc-curated_dseg.label.gii",
        "destrieux": TEMPLATEFLOW / "tpl-fsaverage_hemi-L_den-164k_atlas-Destrieux2009_dseg.label.gii",
    },
    "R": {
        "dkt": TEMPLATEFLOW / "tpl-fsaverage_hemi-R_den-164k_atlas-Desikan2006_seg-aparc_desc-curated_dseg.label.gii",
        "destrieux": TEMPLATEFLOW / "tpl-fsaverage_hemi-R_den-164k_atlas-Destrieux2009_dseg.label.gii",
    },
}


def write_f32(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<f4").tobytes())


def write_u32(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<u4").tobytes())


def write_i16(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<i2").tobytes())


def require(path):
    if not path.exists():
        raise SystemExit(f"ABBRUCH: Quelle fehlt: {path}")
    return path


def load_curv_normalized(path, hemi):
    """Sulc-Shape laden, robust auf [0,1] normalisieren (2./98. Perzentil-Clip).
    Fail-loud: Laenge != 163842 oder NaN."""
    d = np.asarray(nib.load(require(path)).darrays[0].data, dtype=np.float64)
    if d.shape[0] != N_VERTS:
        raise SystemExit(f"ABBRUCH {hemi}/curv: Laenge {d.shape[0]} != {N_VERTS}")
    if np.isnan(d).any():
        raise SystemExit(f"ABBRUCH {hemi}/curv: NaN in Sulc-Quelle")
    lo, hi = np.percentile(d, [2.0, 98.0])
    if hi <= lo:
        raise SystemExit(f"ABBRUCH {hemi}/curv: degenerierte Perzentile lo={lo} hi={hi}")
    norm = np.clip((d - lo) / (hi - lo), 0.0, 1.0)
    if np.isnan(norm).any():
        raise SystemExit(f"ABBRUCH {hemi}/curv: NaN nach Normalisierung")
    return norm.astype(np.float32)


def load_labelgii(path):
    """Liefert (labels:int-ndarray, labeltable: dict key->(name, rgb255))."""
    g = nib.load(require(path))
    labels = np.asarray(g.darrays[0].data)
    table = {}
    for lab in g.labeltable.labels:
        rgb = [int(round(c * 255)) for c in (lab.red or 0, lab.green or 0, lab.blue or 0)]
        table[int(lab.key)] = (lab.label, rgb)
    return labels, table


def remap_medial_to_zero(labels, hemi, layer):
    """FreeSurfer markiert Medialwand als -1. Wir mappen -1 -> 0 (Unknown/Medial).
    Danach Invariante labels.min() >= 0."""
    labels = labels.astype(np.int32)
    labels[labels < 0] = 0
    if labels.min() < 0:
        raise SystemExit(f"ABBRUCH {hemi}/{layer}: negative LabelId nach Remap ({labels.min()})")
    return labels


# --- Julich (native fsaverage-Surface-MPM via siibra) ----------------------
# O-4: native fsaverage-MPM statt vol2surf. siibra.get_map(..., space="fsaverage")
# liefert per-Vertex-Labels auf voller fsaverage (163842/Hemi), 100% Kortex-Coverage,
# scharfe Areal-Grenzen (offizielle MPM, JuSER 916305). fetch(fragment=...) -> dict
# {verts, faces, labels}. Labels sind PER-FRAGMENT 1..128; label N ist links/rechts der
# SELBE Areal-Typ (symmetrisch, gleiche Farbe) -> geteilte LUT ist korrekt.
# Labels 127/128 sind nicht in siibras Region-Registry (nicht-kartierter Rest, ~5% Kortex)
# -> Neutralgrau "nicht kartiert", explizit (kein gefakter Name/Farbe).
print("Lade Julich-Brain v3.0.3 (native fsaverage-Surface-MPM via siibra)...")
_jb = siibra.parcellations.get("julich 3.0.3")
_jsurf = siibra.get_map(parcellation="julich 3.0.3", space="fsaverage")
_JFRAG = {"L": "left hemisphere", "R": "right hemisphere"}
# Label -> bilateraler Arealname (ohne " left"/" right"); aus L-Fragment (symmetrisch).
JULICH_LABEL_TO_NAME = {}
for _rname in _jsurf.regions:
    _idx = _jsurf.get_index(_rname)
    if _idx.fragment == "left hemisphere":
        _base = _rname[:-5] if _rname.endswith(" left") else _rname
        JULICH_LABEL_TO_NAME[int(_idx.label)] = _base
print(f"  Native Surface-MPM: {len(JULICH_LABEL_TO_NAME)} benannte Areale (1..{max(JULICH_LABEL_TO_NAME)})")


def julich_labels_for(hemi):
    """Native fsaverage-Surface-Labels (per Hemi-Fragment)."""
    d = _jsurf.fetch(fragment=_JFRAG[hemi])
    return np.asarray(d["labels"]).astype(np.int32)


# --- Hauptlauf -------------------------------------------------------------
manifest = {
    "space": "fsaverage",
    "verts_per_hemi": N_VERTS,
    "layers": [
        {"id": "dkt", "axis": "macro", "label_de": "DKT (Gyri)"},
        {"id": "destrieux", "axis": "macro", "label_de": "Destrieux (Gyri/Sulci)"},
        {"id": "julich", "axis": "cyto", "label_de": "Julich-Brain v3"},
    ],
    "hemis": {},
}

# Layer-Label-Tabellen sammeln (fuer LUT). DKT/Destrieux: aus GIFTI; Julich: aus siibra.
dkt_table = {}
destrieux_table = {}
julich_present = set()  # alle in den Daten vorkommenden Julich-Label-IDs (L+R)

for hemi in ("L", "R"):
    print(f"\n[{hemi}] Surface + Labels...")
    pcoords, pfaces = surface.load_surf_mesh(str(require(SURF[hemi]["pial"])))
    icoords, ifaces = surface.load_surf_mesh(str(require(SURF[hemi]["infl"])))

    # Surface-Invarianten
    if pcoords.shape[0] != N_VERTS:
        raise SystemExit(f"ABBRUCH {hemi}: pial Vertexzahl {pcoords.shape[0]} != {N_VERTS}")
    if icoords.shape[0] != N_VERTS:
        raise SystemExit(f"ABBRUCH {hemi}: inflated Vertexzahl {icoords.shape[0]} != {N_VERTS}")
    if not np.array_equal(pfaces, ifaces):
        raise SystemExit(f"ABBRUCH {hemi}: pial/inflated teilen nicht dieselbe Topologie (faces)")

    # Labels laden
    dkt_raw, dkt_tab = load_labelgii(LABELGII[hemi]["dkt"])
    destr_raw, destr_tab = load_labelgii(LABELGII[hemi]["destrieux"])
    dkt_table.update(dkt_tab)
    destrieux_table.update(destr_tab)

    dkt = remap_medial_to_zero(dkt_raw, hemi, "dkt")
    destrieux = remap_medial_to_zero(destr_raw, hemi, "destrieux")
    julich = julich_labels_for(hemi)  # native MPM, 100% Kortex
    julich[julich < 0] = 0
    julich_present.update(int(x) for x in np.unique(julich) if x > 0)
    _jcov = 100.0 * np.sum(julich > 0) / julich.shape[0]
    print(f"  [{hemi}] Julich native MPM Coverage: {_jcov:.1f}% (>0)")

    # Label-Invarianten je Layer
    for layer_id, lab in (("dkt", dkt), ("destrieux", destrieux), ("julich", julich)):
        if lab.shape[0] != N_VERTS:
            raise SystemExit(f"ABBRUCH {hemi}/{layer_id}: Label-Laenge {lab.shape[0]} != {N_VERTS}")
        if lab.min() < 0:
            raise SystemExit(f"ABBRUCH {hemi}/{layer_id}: negative LabelId ({lab.min()})")
        if lab.max() > 32767:
            raise SystemExit(f"ABBRUCH {hemi}/{layer_id}: LabelId {lab.max()} > i16-Max")

    # Curvature/Sulc backen
    curv = load_curv_normalized(SURF[hemi]["sulc"], hemi)

    # Schreiben
    write_f32(OUT / f"fsavg164_{hemi}_pial.f32", pcoords)
    write_f32(OUT / f"fsavg164_{hemi}_infl.f32", icoords)
    write_u32(OUT / f"fsavg164_{hemi}_faces.u32", pfaces.reshape(-1))
    write_i16(OUT / f"fsavg164_{hemi}_dkt.i16", dkt)
    write_i16(OUT / f"fsavg164_{hemi}_destrieux.i16", destrieux)
    write_i16(OUT / f"fsavg164_{hemi}_julich.i16", julich)
    write_f32(OUT / f"fsavg164_{hemi}_curv.f32", curv)

    manifest["hemis"][hemi] = {
        "verts": int(N_VERTS),
        "faces": int(pfaces.shape[0]),
        "pial": f"fsavg164_{hemi}_pial.f32",
        "infl": f"fsavg164_{hemi}_infl.f32",
        "faces_file": f"fsavg164_{hemi}_faces.u32",
        "curv": f"fsavg164_{hemi}_curv.f32",
        "labels": {
            "dkt": f"fsavg164_{hemi}_dkt.i16",
            "destrieux": f"fsavg164_{hemi}_destrieux.i16",
            "julich": f"fsavg164_{hemi}_julich.i16",
        },
    }
    print(f"  [{hemi}] OK: {N_VERTS} Verts, {pfaces.shape[0]} Faces, "
          f"DKT/Destrieux/Julich Labels max={dkt.max()}/{destrieux.max()}/{julich.max()}, "
          f"curv [{curv.min():.3f},{curv.max():.3f}]")

# --- LUTs (offizielle Paletten) --------------------------------------------
# Konvention: Label 0 = Medialwand/Unknown -> neutral grau "—" medial:true.
# DKT/Destrieux: offizielle Farben aus der GIFTI-Label-Tabelle (lab.red/green/blue).
# Julich: offizielle siibra-Farben via region.rgb (native MPM, Label N = bilateraler
# Areal-Typ, symmetrisch -> geteilte LUT). Labels in den Daten, die keine benannte
# Region/Farbe haben (nicht-kartierter Kortexrest), -> Neutralgrau "nicht kartiert",
# explizit geloggt (KEIN rng, KEINE gefakten Namen).
MEDIAL_GREY = [40, 40, 46]
JULICH_NOCOLOR_GREY = [90, 90, 96]


def build_lut_gifti(table):
    """table: dict {labelId: (name, rgb255)} aus GIFTI-Label-Tabelle."""
    lut = {}
    for lid in sorted(table):
        name, rgb = table[lid]
        if lid == 0:
            lut[lid] = {"rgb": MEDIAL_GREY, "name": "—", "medial": True}
        else:
            lut[lid] = {"rgb": [int(c) for c in rgb], "name": name}
    return lut


def build_lut_julich(label_to_name, present_labels, parcellation):
    """Offizielle siibra-Farben (region.rgb). label_to_name: benannte Areale (bilateral).
    present_labels: alle in den Daten vorkommenden Label-IDs (>0). Labels ohne benannte
    Region (nicht-kartierter Rest) -> Neutralgrau."""
    lut = {0: {"rgb": MEDIAL_GREY, "name": "—", "medial": True}}
    unmapped = []
    for lid in sorted(present_labels):
        if lid == 0:
            continue
        name = label_to_name.get(lid)
        if name is None:
            lut[lid] = {"rgb": JULICH_NOCOLOR_GREY, "name": "nicht kartiert"}
            unmapped.append(lid)
            continue
        reg = parcellation.get_region(name)
        rgb = getattr(reg, "rgb", None)
        if rgb is None:
            lut[lid] = {"rgb": JULICH_NOCOLOR_GREY, "name": name}
            unmapped.append(lid)
        else:
            lut[lid] = {"rgb": [int(c) for c in rgb], "name": name}
    if unmapped:
        print(f"  Julich: {len(unmapped)} Label-ID(s) ohne benannte/farbige Region -> "
              f"Neutralgrau {JULICH_NOCOLOR_GREY} (nicht-kartierter Kortexrest): {unmapped}")
    return lut


print("\n--- LUTs ---")
print("DKT LUT: GIFTI-Farben (templateflow Desikan2006-Label-Tabelle)")
print("Destrieux LUT: GIFTI-Farben (templateflow Destrieux2009-Label-Tabelle)")
print("Julich LUT: siibra region.rgb (offizielle Julich-Brain-v3-Farben, native MPM)")

dkt_lut = build_lut_gifti(dkt_table)
destrieux_lut = build_lut_gifti(destrieux_table)
julich_lut = build_lut_julich(JULICH_LABEL_TO_NAME, julich_present, _jb)

manifest["lut"] = {
    "dkt": {str(k): v for k, v in dkt_lut.items()},
    "destrieux": {str(k): v for k, v in destrieux_lut.items()},
    "julich": {str(k): v for k, v in julich_lut.items()},
}

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

print("\n=== FERTIG ===")
print(f"Output: {OUT}")
print(f"Layer: dkt({len(dkt_lut)}) destrieux({len(destrieux_lut)}) julich({len(julich_lut)})")
print(f"Hemis: L/R @ {N_VERTS} Verts + curv-Bake")
