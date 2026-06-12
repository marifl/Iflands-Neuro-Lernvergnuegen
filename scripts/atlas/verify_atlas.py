# Verifikation des Voll-Transform-Artefakts (work/atlas-*.glb): anatomische Plausibilitaet
# der Anordnung + Ballooning-Detektor (combined-Host-Unter-Tiling). Reine Geometrie-Checks
# gegen die carved Centroide. Aufruf: ./.venv/bin/python verify_atlas.py
# Achsen (TARO-Viewer-Raum): +X=links, +Y=superior, +Z=anterior.
import json
from pathlib import Path

WORK = Path(__file__).parent / "work"
c = json.loads((WORK / "atlas-julich-coords.json").read_text())
res = json.loads((WORK / "atlas_residuals_julich.json").read_text())["parcels"]


def coord(slug, ax, side="-r"):
    for k, v in c.items():
        if slug in k and k.endswith(side):
            return v["centroid"][ax]
    return None


Z = lambda s: coord(s, 2)
Y = lambda s: coord(s, 1)

# Anatomische Anordnung (rechte Hemisphaere).
checks = [
    ("IFG: area-44 (pars opercularis) posterior zu area-45 (triangularis)", Z("area-44-ifg"), "<", Z("area-45-ifg")),
    ("Frontalpol fp2 am anteriorsten (anteriorer als IFG area-44)", Z("area-fp2-fpole"), ">", Z("area-44-ifg")),
    ("pre-SMA (6ma) anteriorer als SMA (6mp)", Z("area-6ma"), ">", Z("area-6mp")),
    ("V1 (hoc1) am posteriorsten (posterior zu IFG)", Z("hoc1"), "<", Z("area-44-ifg")),
    ("Frontalpol superior zu OFC (fo3)", Y("area-fp2"), ">", Y("fo3")),
    ("Postzentral posterior zu Praezentral (1-postcg vs 4a-precg)", Z("area-1-postcg"), "<", Z("area-4a-precg")),
]
ok = 0
print("=== Anatomische Anordnungs-Checks (rechts, +Z=anterior, +Y=superior) ===")
for name, a, op, b in checks:
    if a is None or b is None:
        print(f"  ?? {name}: Wert fehlt")
        continue
    passed = (a < b) if op == "<" else (a > b)
    ok += passed
    print(f"  {'OK  ' if passed else 'FAIL'} {name}  [{a:.1f} {op} {b:.1f}]")
print(f"  -> {ok}/{len(checks)} bestanden")

# Ballooning-Detektor: combined-Host-Parzellen sollten ihren Host nicht ueber-fuellen.
# Heuristik: keine kortikale Parzelle > 3500 Vertices (ein TARO-Gyrus-Anteil).
print("\n=== Ballooning-Detektor (Parzellen > 3500 Vertices) ===")
big = [(s, v["n_vertices"]) for s, v in res.items() if v["n_vertices"] > 3500]
if big:
    for s, n in sorted(big, key=lambda x: -x[1]):
        print(f"  WARN {s}: {n} Vertices (moeglw. Unter-Tiling im combined-Host)")
else:
    print("  OK — keine Parzelle blaeht ihren Host auf")
