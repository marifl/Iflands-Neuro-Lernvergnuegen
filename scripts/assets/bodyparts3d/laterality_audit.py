"""Lateralitaets- und Volumen-Audit ueber den GESAMTEN Strukturbestand.

Motivation: Der BodyParts3D-Datensatz zeigt eine systematische Schlagseite — viele
linke Gegenstuecke fehlen, und selbst wo beide Seiten vorliegen, ist die linke Seite
oft volumendefizitaer (unvollstaendiges Mesh). Dieses Audit schreibt den kompletten
Bestand mit allen FMA-Codes nieder UND prueft die Lateralitaet, ergaenzend zu fma_audit.py
(das nur FMA-ID-/Label-Korrektheit prueft, nicht die bilaterale Vollstaendigkeit).

Drei Fehlermodi (rein evidenzbasiert, kein manueller Fall-Katalog):
  M1  Gegenseite fehlt   ein lateralisierter Begriff (Left/Right X) hat nur EINE Seite
                         als Knoten im Register.
  M2  Volumen-Asymmetrie beide Seiten vorhanden, aber Volumenverhaeltnis kleiner als
                         der Schwellwert (eine Seite hat ein unvollstaendiges Mesh).
  M3  Einseitige Mittellinie  ein als 'midline' gefuehrter Knoten ist geometrisch nur
                         auf EINER Seite der Mittelsagittalebene (Tentorium-Typ).

Echte Anatomie vs. Defekt: Duralsinus (cavernosus/transversus/sigmoideus/petrosus) sind
natuerlich asymmetrisch (mirror_plan.json: LABEL-ASYM) — diese werden als OK-asym gefuehrt,
nicht als Defekt. Gefaesse (artery/vein/branch/trunk) werden bei fehlender Seite als
'vaskulaer (Asymmetrie evtl. real)' markiert, strukturelle Begriffe (Cortex/Kern/Gyrus/
Area) als wahrscheinlicher Defekt — das priorisiert den spaeteren Fix, fabriziert aber
NICHTS (reines Reporting).

Output (nicht-destruktiv):
  docs/laterality-volume-audit.md            menschlich: Summary + Befunde + Voll-Inventar
  reference/laterality_audit.json            maschinenlesbar
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict

import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
STRUCTURES = os.path.join(REPO, "apps/brain-app/public/assets/bodyparts3d/structures.json")
FMA_AUDIT = os.path.join(HERE, "reference/fma_audit.json")
MIRROR_PLAN = os.path.join(HERE, "reference/mirror_plan.json")
REPORT_MD = os.path.join(REPO, "docs/laterality-volume-audit.md")
REPORT_JSON = os.path.join(HERE, "reference/laterality_audit.json")

SRC_DIRS = [os.path.expanduser(f"~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/{d}")
            for d in ["20260611111252", "20260611112101", "20260611120253"]]
NAME_RE = re.compile(r"^([A-Za-z0-9]+)_BP\d+_FMA\d+_(.+)\.obj$")
SIDE_RE = re.compile(r"\b(left|right)\b", re.IGNORECASE)
VASCULAR_RE = re.compile(r"\b(artery|arterial|vein|venous|sinus|branch|trunk|plexus|arteries|veins)\b", re.I)
# Durale Sinus (Hirnhaut-Venenleiter) — anatomisch grossteils mittellinig/bilateral und
# damit Defekt-Kandidaten, wenn schief/einseitig. Abzugrenzen von parenchymalen Venen
# (cerebral vein, vein sets, Perforatoren), die im Einzelpraeparat real einseitig sein
# koennen. Sinus cavernosus z. B. ist IMMER bilateral — fehlende Seite = sichere Luecke.
DURAL_SINUS_RE = re.compile(
    r"\b(sagittal sinus|straight sinus|transverse sinus|sigmoid sinus|cavernous sinus|"
    r"petrosal sinus|occipital sinus|sphenoparietal sinus|intercavernous sinus|"
    r"marginal sinus|basilar (venous )?plexus)\b|confluen", re.I)

# Volumenverhaeltnis (kleinere/groessere Seite); darunter = Volumen-Asymmetrie-Defekt.
VOL_RATIO_MIN = 0.6
# Schiefe einer Mittellinienstruktur: Verhaeltnis der bbox-Ausdehnung der schwaecheren
# zur staerkeren Seite von X_mid. Darunter = stark schief/einseitig (M3). bbox-Ausdehnung
# statt Vertex-Anteil, weil ungleiche Tesselierung sonst symmetrische Strukturen (z. B.
# Medulla: 79% Verts rechts, aber geometrisch beidseitig) faelschlich flaggt.
SKEW_RATIO_MIN = 0.30
# Mindest-Ausdehnung (mm) der staerkeren Seite, damit ein winziger Mittellinien-Stummel
# nicht als schief gilt.
SKEW_MIN_EXTENT_MM = 5.0


def base_name(name: str) -> str:
    """Name ohne Seiten-Token, normalisiert — gruppiert 'left X' und 'right X' zusammen."""
    return re.sub(r"\s+", " ", SIDE_RE.sub("", name)).strip().lower()


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


def index_source_sides() -> dict[tuple[str, str], list[str]]:
    """Map (Basisname, Seite) -> Liste der Quell-Dateinamen. Seite aus dem Dateinamen
    (Left/Right/midline). Damit laesst sich pruefen, ob eine fehlende Gegenseite ueberhaupt
    als Quell-Mesh existiert (Lade-Luecke) oder gar nicht modelliert wurde (Mirror noetig)."""
    out: dict[tuple[str, str], list[str]] = defaultdict(list)
    for d in SRC_DIRS:
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            m = NAME_RE.match(f)
            if not m:
                continue
            nm = m.group(2)
            sm = SIDE_RE.search(nm)
            side = sm.group(1).lower() if sm else "midline"
            out[(base_name(nm), side)].append(f)
    return out


def midsagittal_x(structures: dict, src_idx: dict[str, str]) -> float:
    xs = []
    for v in structures.values():
        if v["side"] != "midline":
            continue
        p = src_idx.get(v["fileId"])
        if p:
            xs.append(float(trimesh.load(p, process=False).centroid[0]))
    if len(xs) < 5:
        raise SystemExit(f"Zu wenige Mittellinien-Referenzen fuer X_mid: {len(xs)}")
    xs.sort()
    return xs[len(xs) // 2]


def main() -> None:
    structures = json.load(open(STRUCTURES, encoding="utf-8"))
    audit = json.load(open(FMA_AUDIT, encoding="utf-8"))
    fma_by_key = {f["key"]: f for f in audit["findings"]}
    plan = json.load(open(MIRROR_PLAN, encoding="utf-8")) if os.path.exists(MIRROR_PLAN) else []
    asym_fma = {r["fma"] for r in plan if r["decision"] == "LABEL-ASYM"}
    mirrored_fma = {r["left_fma"].upper() for r in plan if r["decision"] == "MIRROR"}

    src_idx = index_sources()
    src_sides = index_source_sides()
    xmid = midsagittal_x(structures, src_idx)
    print(f"X_mid = {xmid:.2f} mm", file=sys.stderr)

    # Gruppen nach Basisname.
    groups: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for slug, v in structures.items():
        groups[base_name(v["name"])].append((slug, v))

    findings = {"missing_side": [], "volume_asym": [], "onesided_midline": []}

    for b, members in groups.items():
        by_side: dict[str, list[tuple[str, dict]]] = defaultdict(list)
        for slug, v in members:
            by_side[v["side"]].append((slug, v))
        has_l, has_r = "left" in by_side, "right" in by_side

        # --- lateralisierte Begriffe: M1 (fehlende Seite) + M2 (Volumen) ---
        if has_l or has_r:
            if has_l != has_r:  # M1
                present = "left" if has_l else "right"
                missing = "right" if has_l else "left"
                mem = by_side[present]
                vol = round(sum(v["volume_cm3"] for _, v in mem), 4)
                fmas = sorted({v["fma"] for _, v in mem})
                is_asym = any(f in asym_fma for f in fmas)
                vascular = bool(VASCULAR_RE.search(b))
                dural = bool(DURAL_SINUS_RE.search(b))
                contra = src_sides.get((b, missing), [])
                # Durale Sinus zuerst: auch wenn im mirror_plan als LABEL-ASYM gefuehrt, sind
                # die grossen Sinus (cavernosus!) anatomisch bilateral -> eigener Review-Bucket
                # statt stillem 'ok_asym_real'.
                classification = ("dural_sinus" if dural
                                  else "ok_asym_real" if is_asym
                                  else "vascular_maybe_real" if vascular
                                  else "probable_defect")
                fix = ("review" if classification == "dural_sinus"
                       else "keep_asym" if classification == "ok_asym_real"
                       else "load" if contra else "mirror")
                findings["missing_side"].append({
                    "base": b, "present": present, "missing": missing,
                    "present_volume_cm3": vol, "fma": fmas,
                    "classification": classification,
                    "contralateral_in_source": bool(contra),
                    "fix": fix,
                    "slugs": [s for s, _ in mem],
                })
            else:  # M2
                vl = round(sum(v["volume_cm3"] for _, v in by_side["left"]), 4)
                vr = round(sum(v["volume_cm3"] for _, v in by_side["right"]), 4)
                lo, hi = min(vl, vr), max(vl, vr)
                ratio = round(lo / hi, 3) if hi else 1.0
                if ratio < VOL_RATIO_MIN:
                    findings["volume_asym"].append({
                        "base": b, "left_volume_cm3": vl, "right_volume_cm3": vr,
                        "ratio": ratio, "deficit": "left" if vl < vr else "right",
                        "vascular": bool(VASCULAR_RE.search(b)),
                        "fma": sorted({v["fma"] for _, v in members}),
                    })

        # --- Mittellinien-Knoten: M3 (geometrisch schief/einseitig) ---
        for slug, v in by_side.get("midline", []):
            if v.get("reconstructed"):
                continue  # bereits per Reflexion vervollstaendigt (z. B. Tentorium)
            # Gemergte Knoten bestehen aus mehreren Quell-Meshes — die Schiefe MUSS ueber die
            # Vereinigung ALLER Teil-Meshes geprueft werden, nicht ueber das eine primaere
            # fileId (sonst False Positive: eine Haelfte sieht einseitig aus, obwohl der
            # gemergte Knoten beide Seiten abdeckt).
            file_ids = v.get("merged_from") or [v["fileId"]]
            paths = [src_idx[f] for f in file_ids if f in src_idx]
            if not paths:
                continue
            x0 = min(float(trimesh.load(p, process=False).bounds[0][0]) for p in paths)
            x1 = max(float(trimesh.load(p, process=False).bounds[1][0]) for p in paths)
            # Ausdehnung je Seite von X_mid; eine echte Mittellinienstruktur reicht etwa
            # gleich weit nach links wie rechts. Stark schief = eine Seite kaum vorhanden.
            right_ext = max(0.0, xmid - x0)
            left_ext = max(0.0, x1 - xmid)
            mx, mn = max(right_ext, left_ext), min(right_ext, left_ext)
            if mx >= SKEW_MIN_EXTENT_MM and (mn / mx) < SKEW_RATIO_MIN:
                nm = v["name"].lower()
                category = ("dural_sinus" if DURAL_SINUS_RE.search(nm)
                            else "parenchymal_vessel" if VASCULAR_RE.search(nm)
                            else "non_vascular")
                findings["onesided_midline"].append({
                    "slug": slug, "name": v["name"], "fma": v["fma"],
                    "x_min": round(x0, 1), "x_max": round(x1, 1),
                    "dominant_side": "right" if right_ext > left_ext else "left",
                    "skew_ratio": round(mn / mx, 3),
                    "weak_extent_mm": round(mn, 1),
                    "category": category,
                    "vascular": bool(VASCULAR_RE.search(nm)),
                    "volume_cm3": v["volume_cm3"],
                })

    # Sortierung nach Schwere/Volumen.
    findings["missing_side"].sort(key=lambda x: -x["present_volume_cm3"])
    findings["volume_asym"].sort(key=lambda x: x["ratio"])
    findings["onesided_midline"].sort(key=lambda x: x["skew_ratio"])

    def count_class(items, key, val):
        return sum(1 for i in items if i.get(key) == val)

    summary = {
        "total_structures": len(structures),
        "sides": {s: sum(1 for v in structures.values() if v["side"] == s)
                  for s in ("left", "right", "midline")},
        "missing_side_total": len(findings["missing_side"]),
        "missing_left": count_class(findings["missing_side"], "missing", "left"),
        "missing_right": count_class(findings["missing_side"], "missing", "right"),
        "missing_probable_defect": count_class(findings["missing_side"], "classification", "probable_defect"),
        "missing_dural_sinus": count_class(findings["missing_side"], "classification", "dural_sinus"),
        "missing_ok_asym_real": count_class(findings["missing_side"], "classification", "ok_asym_real"),
        "missing_vascular_maybe_real": count_class(findings["missing_side"], "classification", "vascular_maybe_real"),
        "missing_fix_load": count_class(findings["missing_side"], "fix", "load"),
        "missing_fix_mirror": count_class(findings["missing_side"], "fix", "mirror"),
        "volume_asym_total": len(findings["volume_asym"]),
        "volume_asym_left_deficit": count_class(findings["volume_asym"], "deficit", "left"),
        "onesided_midline_total": len(findings["onesided_midline"]),
        "onesided_dural_sinus": count_class(findings["onesided_midline"], "category", "dural_sinus"),
        "onesided_parenchymal_vessel": count_class(findings["onesided_midline"], "category", "parenchymal_vessel"),
        "onesided_non_vascular": count_class(findings["onesided_midline"], "category", "non_vascular"),
        "x_mid_mm": round(xmid, 2),
        "vol_ratio_min": VOL_RATIO_MIN,
    }

    json.dump({"summary": summary, "findings": findings},
              open(REPORT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"  JSON: {REPORT_JSON}", file=sys.stderr)

    write_markdown(summary, findings, structures, fma_by_key)
    print(f"  Markdown: {REPORT_MD}", file=sys.stderr)


def write_markdown(summary, findings, structures, fma_by_key) -> None:
    L = []
    L.append("# Lateralitaets- & Volumen-Audit — BodyParts3D-Hirnstrukturen\n")
    L.append("Vollstaendiges Inventar mit FMA-Codes + Lateralitaets-Pruefung. Erzeugt von "
             "`scripts/assets/bodyparts3d/laterality_audit.py` (nicht-destruktiv). Ergaenzt "
             "`fma_audit.py` (FMA-ID/Label) um die **bilaterale Vollstaendigkeit** und "
             "**Volumenverteilung**.\n")
    s = summary
    L.append("## Summary\n")
    L.append(f"- Strukturen gesamt: **{s['total_structures']}** "
             f"(links {s['sides']['left']} · rechts {s['sides']['right']} · midline {s['sides']['midline']})")
    L.append(f"- **M1 Gegenseite fehlt: {s['missing_side_total']}** "
             f"(links fehlt {s['missing_left']} · rechts fehlt {s['missing_right']})")
    L.append(f"  - davon wahrscheinlicher Defekt: **{s['missing_probable_defect']}** · "
             f"duraler Sinus (Review): **{s['missing_dural_sinus']}** · "
             f"vaskulaer (evtl. real): {s['missing_vascular_maybe_real']} · "
             f"echte Asymmetrie: {s['missing_ok_asym_real']}")
    L.append(f"  - Fix-Methode: Gegenseite in Quelle vorhanden (load) {s['missing_fix_load']} · "
             f"nicht modelliert (mirror) {s['missing_fix_mirror']}")
    L.append(f"- **M2 Volumen-Asymmetrie >{int((1-s['vol_ratio_min'])*100)}%: {s['volume_asym_total']}** "
             f"(links defizitaer {s['volume_asym_left_deficit']})")
    L.append(f"- **M3 schiefe/einseitige Mittellinie: {s['onesided_midline_total']}** "
             f"(duraler Sinus {s['onesided_dural_sinus']} · parenchymale Vene "
             f"{s['onesided_parenchymal_vessel']} · nicht-vaskulaer {s['onesided_non_vascular']}; "
             f"Schwelle <{int(SKEW_RATIO_MIN*100)}%; reconstructed ausgenommen)\n")

    L.append("## M1 — Gegenseite fehlt\n")
    L.append("Fix = `load` (Gegenseite existiert als Quell-Mesh → in convert.py-Whitelist "
             "aufnehmen) oder `mirror` (nicht modelliert → Reflexion noetig).\n")
    L.append("| fehlt | Klassifikation | Fix | Basisname | vorhandene Seite | Vol cm³ | FMA |")
    L.append("|---|---|---|---|---|---|---|")
    for f in findings["missing_side"]:
        L.append(f"| {f['missing']} | {f['classification']} | {f['fix']} | {f['base']} | {f['present']} | "
                 f"{f['present_volume_cm3']} | {', '.join(f['fma'])} |")

    L.append("\n## M2 — Volumen-Asymmetrie (beide Seiten vorhanden)\n")
    L.append("| L cm³ | R cm³ | ratio | defizitaer | vaskulaer | Basisname |")
    L.append("|---|---|---|---|---|---|")
    for f in findings["volume_asym"]:
        L.append(f"| {f['left_volume_cm3']} | {f['right_volume_cm3']} | {f['ratio']} | "
                 f"{f['deficit']} | {'ja' if f['vascular'] else 'nein'} | {f['base']} |")

    L.append("\n## M3 — Schiefe/einseitige Mittellinien-Strukturen\n")
    L.append("Schiefe = Ausdehnung schwache/starke Seite von X_mid. <0.30 = stark schief. "
             "Nicht-vaskulaere Faelle sind die Defekt-Kandidaten (Gefaesse sind im Einzelpraeparat "
             "oft real einseitig).\n")
    if findings["onesided_midline"]:
        L.append("| Name | FMA | Kategorie | x-Range | dominant | Schiefe | schwach mm | Vol cm³ |")
        L.append("|---|---|---|---|---|---|---|---|")
        for f in findings["onesided_midline"]:
            L.append(f"| {f['name']} | {f['fma']} | {f['category']} | {f['x_min']}..{f['x_max']} | "
                     f"{f['dominant_side']} | {f['skew_ratio']} | {f['weak_extent_mm']} | "
                     f"{f['volume_cm3']} |")
    else:
        L.append("Keine.")

    L.append("\n## Voll-Inventar (alle Strukturen)\n")
    L.append("| Slug | Name | FMA | Seite | Vol cm³ | FMA-Lateralitaet | Flags |")
    L.append("|---|---|---|---|---|---|---|")
    for slug in sorted(structures):
        v = structures[slug]
        fa = fma_by_key.get(slug, {})
        flags = []
        if v.get("reconstructed"):
            flags.append("reconstructed")
        if v.get("mirrored"):
            flags.append("mirrored")
        if v.get("merged_from"):
            flags.append("merged")
        L.append(f"| {slug} | {v['name']} | {v['fma']} | {v['side']} | {v['volume_cm3']} | "
                 f"{fa.get('fma_laterality', '?')} | {', '.join(flags)} |")

    with open(REPORT_MD, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
