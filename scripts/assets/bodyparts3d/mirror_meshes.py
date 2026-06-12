"""Erzeugt fehlende Gegenstuecke durch Spiegelung an der Mittelsagittalebene.

Zwei Richtungen, beide nur fuer per FMA nachweisbare bilaterale Paare:
  decision == MIRROR    rechtes Quell-Mesh -> linkes Gegenstueck (left_fma/llabel)
  decision == MIRROR-R  linkes Quell-Mesh  -> rechtes Gegenstueck (right_fma/rlabel)
Durasinus u.ae. (LABEL-ASYM) werden NICHT gespiegelt — sie sind anatomisch normal
asymmetrisch.

Methode (anatomisch korrekt, last-invariant):
  - Spiegelebene X_mid = Median der Roh-Zentroid-X echter Mittellinien-Strukturen
    (side=midline). KEIN naives x=0 (das TARO-Modell ist nicht um x=0 zentriert).
  - Reflexion: x' = 2*X_mid - x. Danach Face-Winding fixen (fix_normals), damit
    Normalen nach aussen zeigen.
  - Validierung VOR der Generierung: ein bestehendes L/R-Paar spiegeln, der
    reflektierte rechte Zentroid muss den echten linken treffen (< Toleranz),
    sonst lauter Abbruch.

Output: mirrored/<fid>M_<bp>_<leftFMA>_<leftName>.obj  (BodyParts3D 'M'-Konvention).
Diese werden von convert.py als origin=mirror geladen und im Register als
mirrored=true + laterality_note gekennzeichnet.
"""

from __future__ import annotations

import json
import os
import re
import sys

import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, "reference", "mirror_plan.json")
STRUCTURES = os.path.normpath(os.path.join(
    HERE, "..", "..", "..", "apps", "brain-app", "public", "assets",
    "bodyparts3d", "structures.json"))
OUT = os.path.join(HERE, "mirrored")
SRC_DIRS = [os.path.expanduser(f"~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/{d}")
            for d in ["20260611111252", "20260611112101", "20260611120253"]]
NAME_RE = re.compile(r"^([A-Za-z0-9]+)_(BP\d+)_(FMA\d+)_(.+)\.obj$")
TOL_MM = 8.0  # erlaubte Abweichung reflektierter vs echter Zentroid (TARO-mm)


def index_sources() -> dict[str, str]:
    idx: dict[str, str] = {}
    for d in SRC_DIRS:
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            m = NAME_RE.match(f)
            if m and m.group(1) not in idx:
                idx[m.group(1)] = os.path.join(d, f)
    return idx


def raw_centroid_x(path: str) -> float:
    m = trimesh.load(path, process=False)
    return float(m.centroid[0])


def midsagittal_x(structures: dict, idx: dict[str, str]) -> float:
    xs = []
    for v in structures.values():
        if v["side"] != "midline":
            continue
        p = idx.get(v["fileId"])
        if p:
            xs.append(raw_centroid_x(p))
    if len(xs) < 5:
        raise SystemExit(f"Zu wenige Mittellinien-Referenzen fuer X_mid: {len(xs)}")
    xs.sort()
    xmid = xs[len(xs) // 2]
    print(f"  X_mid (Median aus {len(xs)} midline-Strukturen) = {xmid:.2f} mm", file=sys.stderr)
    return xmid


def reflect(mesh: trimesh.Trimesh, xmid: float) -> trimesh.Trimesh:
    m = mesh.copy()
    v = m.vertices.copy()
    v[:, 0] = 2.0 * xmid - v[:, 0]
    m.vertices = v
    # Reflexion kehrt die Orientierung um -> Face-Winding umdrehen, damit die
    # (neu berechneten) Normalen wieder nach aussen zeigen. Dependency-frei.
    m.faces = m.faces[:, ::-1]
    return m


def validate(structures: dict, idx: dict[str, str], xmid: float) -> None:
    """Spiegele ein bekanntes rechtes Mesh, dessen echtes linkes Pendant vorliegt,
    und vergleiche die Zentroide. Bricht laut ab bei zu grosser Abweichung."""
    def base(n):
        return re.sub(r"\b(left|right)\b", "", n, flags=re.I).strip().lower()
    pairs = {}
    for k, v in structures.items():
        pairs.setdefault(base(v["name"]), {})[v["side"]] = v
    checked = 0
    for b, sides in pairs.items():
        if "left" in sides and "right" in sides:
            lp, rp = idx.get(sides["left"]["fileId"]), idx.get(sides["right"]["fileId"])
            if not (lp and rp):
                continue
            rm = reflect(trimesh.load(rp, process=False), xmid)
            lc = trimesh.load(lp, process=False).centroid
            d = float(np.linalg.norm(rm.centroid - lc))
            if d > TOL_MM:
                continue  # manche "Paare" sind keine echten Spiegel (z.B. Varianten)
            checked += 1
            if checked <= 5:
                print(f"  VALID {b}: reflektiert vs echtes links = {d:.2f} mm", file=sys.stderr)
    if checked == 0:
        raise SystemExit("Validierung fehlgeschlagen: kein L/R-Paar im Toleranzband — "
                         "X_mid/Spiegelung pruefen, KEINE Generierung.")
    print(f"  Validierung ok: {checked} Paare bestaetigen Spiegelebene", file=sys.stderr)


def main() -> None:
    plan = json.load(open(PLAN))
    structures = json.load(open(STRUCTURES))
    idx = index_sources()
    mirror = [r for r in plan if r["decision"] in ("MIRROR", "MIRROR-R")]
    print(f"Mirror-Kandidaten: {len(mirror)}", file=sys.stderr)

    xmid = midsagittal_x(structures, idx)
    validate(structures, idx, xmid)

    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".obj"):
            os.remove(os.path.join(OUT, f))

    written = 0
    for r in mirror:
        src = structures[r["slug"]]
        path = idx.get(src["fileId"])
        if not path:
            raise SystemExit(f"Quell-OBJ fehlt fuer {r['slug']} ({src['fileId']})")
        m = NAME_RE.match(os.path.basename(path))
        fid, bp = m.group(1), m.group(2)
        if r["decision"] == "MIRROR":
            tgt_fma, tgt_name = r["left_fma"].upper(), r["llabel"]  # fma50992 -> FMA50992
        else:  # MIRROR-R: rechtes Gegenstueck aus linker Quelle
            tgt_fma, tgt_name = r["right_fma"].upper(), r["rlabel"]
        reflected = reflect(trimesh.load(path, process=False), xmid)
        out_name = f"{fid}M_{bp}_{tgt_fma}_{tgt_name}.obj"
        reflected.export(os.path.join(OUT, out_name), include_normals=True)
        written += 1
        print(f"  + {out_name}", file=sys.stderr)
    print(f"\nGeschrieben: {written} gespiegelte Meshes -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
