# Brodmann-Layer (B-2): PALS_B12_Brodmann (Van-Essen-Populations-Brodmann) als 4. Kortex-Layer
# neben DKT/Destrieux/Julich. Quelle: FreeSurfer-fsaverage-Annotation (163842 Vtx/Hemi),
# aus dem FreeSurfer-Image extrahiert nach scripts/atlas/work/brodmann_src/.
#
# WICHTIG (verifiziert): lh und rh haben UNTERSCHIEDLICHE ctab/names-Tabellen, und dieselbe
# rohe Label-ID bedeutet links/rechts VERSCHIEDENES (lh 2=Brodmann.8, rh 2=GYRUS). Eine
# gemeinsame LUT auf Roh-IDs waere FALSCH. Loesung: beide Hemis auf einen EINHEITLICHEN
# Label-Raum = BA-Nummer (1..47) umindizieren -> L/R teilen eine korrekte LUT. Nicht-Brodmann-
# Filler (???, GYRUS, MEDIAL.WALL, ...) -> Label 0 = Medialwand/grau "—" (konsistent mit den
# anderen Layern). Echte Brodmann-Coverage ~84.8% (Rest = gyrale/mediale Filler ohne BA-Zuordnung).
#
# Separates Skript: ergaenzt NUR brodmann-Assets + Manifest-Eintraege, fasst bestehende
# DKT/Destrieux/Julich/curv-Assets NICHT an. Fail-loud bei jeder Inkonsistenz.
import json
import re
from pathlib import Path

import nibabel.freesurfer.io as fsio
import numpy as np

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "apps/brain-app/public/assets/atlas-canonical"
SRC = REPO / "scripts/atlas/work/brodmann_src"

N_VERTS = 163842
MEDIAL_GREY = [40, 40, 46]


def write_i16(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<i2").tobytes())


def ba_number(name):
    """'Brodmann.10' -> 10, sonst None (Nicht-Brodmann-Filler)."""
    m = re.fullmatch(r"Brodmann\.(\d+)", name)
    return int(m.group(1)) if m else None


# Einheitliche LUT: BA-Nummer -> {rgb, name}. Aus beiden Hemis gesammelt (RGB identisch).
brodmann_lut = {0: {"rgb": MEDIAL_GREY, "name": "—", "medial": True}}

print("=== Brodmann (PALS_B12) backen ===")
for hemi_lc, hemi in (("lh", "L"), ("rh", "R")):
    src = SRC / f"{hemi_lc}.PALS_B12_Brodmann.annot"
    if not src.exists():
        raise SystemExit(f"ABBRUCH: Quelle fehlt: {src}")
    raw_labels, ctab, names = fsio.read_annot(str(src))
    names = [n.decode() if isinstance(n, bytes) else n for n in names]

    if len(raw_labels) != N_VERTS:
        raise SystemExit(f"ABBRUCH {hemi}: Vertexzahl {len(raw_labels)} != {N_VERTS} "
                         f"(Vertex-Order/Quelle-Mismatch)")

    # Roh-ID -> BA-Nummer (0 fuer Nicht-Brodmann). Pro Hemi eigene Tabelle.
    remap = np.zeros(len(ctab), dtype=np.int32)
    for rid, nm in enumerate(names):
        ba = ba_number(nm)
        if ba is not None:
            remap[rid] = ba
            if ba not in brodmann_lut:
                brodmann_lut[ba] = {"rgb": [int(c) for c in ctab[rid][:3]], "name": f"BA{ba}"}
    labels = remap[raw_labels]

    if labels.min() < 0:
        raise SystemExit(f"ABBRUCH {hemi}: negative LabelId ({labels.min()})")
    if labels.max() > 32767:
        raise SystemExit(f"ABBRUCH {hemi}: LabelId {labels.max()} > i16-Max")

    write_i16(OUT / f"fsavg164_{hemi}_brodmann.i16", labels)

    n_areas = len([u for u in np.unique(labels) if u > 0])
    cov = 100.0 * np.sum(labels > 0) / len(labels)
    print(f"  [{hemi}] {n_areas} BA-Areale, Coverage {cov:.1f}% (>0), "
          f"Label-Range [{labels.min()},{labels.max()}]")

# Jede in den Daten vorkommende Label-ID muss einen LUT-Eintrag haben (Fail-loud).
for hemi in ("L", "R"):
    lab = np.frombuffer((OUT / f"fsavg164_{hemi}_brodmann.i16").read_bytes(), dtype="<i2")
    missing = [int(u) for u in np.unique(lab) if int(u) not in brodmann_lut]
    if missing:
        raise SystemExit(f"ABBRUCH {hemi}: Label-IDs ohne LUT-Eintrag: {missing}")

# Beispiele loggen
print("\nBeispiel-LUT-Eintraege:")
for k in (0, 10, 44, 45, 17):
    if k in brodmann_lut:
        print(f"  {k}: {brodmann_lut[k]}")
print(f"Gesamt BA-Areale in LUT (ohne 0): {len(brodmann_lut)-1}")

# --- Manifest erweitern (bestehende Eintraege NICHT veraendern) -------------
manifest_path = OUT / "manifest.json"
manifest = json.loads(manifest_path.read_text())

if not any(l["id"] == "brodmann" for l in manifest["layers"]):
    # nach julich einfuegen (beide axis:cyto)
    idx = next((i for i, l in enumerate(manifest["layers"]) if l["id"] == "julich"), len(manifest["layers"]) - 1)
    manifest["layers"].insert(idx + 1,
                              {"id": "brodmann", "axis": "cyto", "label_de": "Brodmann (klassisch)"})

manifest["lut"]["brodmann"] = {str(k): v for k, v in sorted(brodmann_lut.items())}
for hemi in ("L", "R"):
    manifest["hemis"][hemi]["labels"]["brodmann"] = f"fsavg164_{hemi}_brodmann.i16"

manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

print(f"\n=== FERTIG === brodmann-Layer ergaenzt. Layers jetzt: "
      f"{[l['id'] for l in manifest['layers']]}")
