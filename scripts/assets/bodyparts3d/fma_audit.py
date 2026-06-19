"""Systematischer FMA-Diskrepanz-Report fuer die BodyParts3D-Hirnstrukturen.

Drei-Quellen-Cross-Walk pro Struktur aus structures.json:

  A  structures.json     unsere Daten (name, fma, side, fileId)
  B  Source-.obj-Dateien  autoritative BodyParts3D-Zuordnung aus dem Dateinamen
                          (Muster FJxxxx_BPxxxx_FMAxxxx_<Name>.obj)
  C  Live-FMA via OLS4    kanonisches Label, obsolet?, Definition, part-of-Eltern

Geprueft wird je Struktur:
  1. FMA-ID-Validitaet   existiert der Term in der Live-FMA? obsolet?
  2. Lateralitaet         Seite aus dem FMA-Label (left/right/midline) vs unsere side
  3. Namenstreue          unser name vs FMA-Label vs Source-Dateiname
  4. part-of-Eltern       aus FMA, als Kontext + Plausibilitaet
  5. Source-Konsistenz    unser fileId im Source-Set? FMA passt?

Keine stillen Ersatzpfade: OLS4-Fehler werden explizit als FETCH_FAILED erfasst,
gezaehlt und im Report laut ausgewiesen. Cache unter reference/fma_ols_cache.json
macht Reruns billig.

Aufruf:
    python3 fma_audit.py [--source <dir>] [--limit N] [--refresh]
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
STRUCTURES = os.path.join(
    REPO, "apps", "brain-app", "public", "assets", "bodyparts3d", "structures.json")
CACHE = os.path.join(HERE, "reference", "fma_ols_cache.json")
REPORT_MD = os.path.join(REPO, "docs", "fma-discrepancy-report.md")
REPORT_JSON = os.path.join(HERE, "reference", "fma_audit.json")

OLS_BASE = "https://www.ebi.ac.uk/ols4/api/ontologies/fma/terms"
SOURCE_RE = re.compile(r"^(FJ\w+?)_(BP\d+)_(FMA\d+)_(.+)\.obj$")
SIDE_RE = re.compile(r"\b(left|right)\b", re.IGNORECASE)
# Teil-von-Marker: 'X half/part/portion/segment/division of <Ganzes>'. Greift den Namen des
# Ganzen ab, um zu pruefen, ob es ebenfalls als eigene Struktur im Register steht.
PART_OF_RE = re.compile(r"\b(?:half|part|portion|segment|division)\s+of\s+(.+)$", re.IGNORECASE)


def audit_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


# --- Source-Index (B) --------------------------------------------------------

def load_source_index(source_dir: str) -> dict[str, dict]:
    """fileId -> {bp, fma, name} aus den Dateinamen des Source-Exports."""
    if not os.path.isdir(source_dir):
        raise SystemExit(f"Source-Verzeichnis fehlt: {source_dir}")
    idx: dict[str, dict] = {}
    unparsed = []
    for fn in os.listdir(source_dir):
        if not fn.endswith(".obj"):
            continue
        m = SOURCE_RE.match(fn)
        if not m:
            unparsed.append(fn)
            continue
        fj, bp, fma, name = m.groups()
        idx[fj] = {"bp": bp, "fma": fma, "name": name}
    if unparsed:
        print(f"WARN: {len(unparsed)} Source-Dateien nicht geparst, z.B. {unparsed[:3]}",
              file=sys.stderr)
    return idx


# --- OLS4-FMA (C) mit Cache --------------------------------------------------

def fma_iri(fma_id: str) -> str:
    num = fma_id.replace("FMA", "")
    return f"http://purl.org/sig/ont/fma/fma{num}"


def _get(url: str, retries: int = 4) -> dict | None:
    """JSON holen. 404 -> None (Term existiert nicht). Andere Fehler -> Retry,
    dann Exception (kein stiller Ersatzpfad)."""
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            last = e
        except Exception as e:  # noqa: BLE001 - Netz/Timeout, wird geretryt
            last = e
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"OLS4-Fetch endgueltig fehlgeschlagen: {url} ({last})")


def fetch_fma(fma_id: str) -> dict:
    """Einen FMA-Term aus OLS4 ziehen: label, obsolete, synonyms, definition,
    part_of-Eltern. status in {ok, not_found}."""
    enc = urllib.parse.quote(urllib.parse.quote(fma_iri(fma_id), safe=""), safe="")
    term = _get(f"{OLS_BASE}/{enc}")
    if term is None:
        return {"status": "not_found"}
    parents = []
    pj = _get(f"{OLS_BASE}/{enc}/hierarchicalParents")
    if pj:
        for t in pj.get("_embedded", {}).get("terms", []):
            parents.append({"fma": t.get("obo_id", "").replace("FMA:", "FMA"),
                            "label": t.get("label")})
    desc = term.get("description") or []
    return {
        "status": "ok",
        "label": term.get("label"),
        "obsolete": bool(term.get("is_obsolete")),
        "synonyms": term.get("synonyms") or [],
        "definition": desc[0] if desc else None,
        "parents": parents,
    }


def load_cache() -> dict:
    if os.path.exists(CACHE):
        with open(CACHE) as f:
            return json.load(f)
    return {}


def save_cache(cache: dict) -> None:
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=0, sort_keys=True)


def build_fma_data(fma_ids: list[str], refresh: bool) -> tuple[dict, int]:
    cache = {} if refresh else load_cache()
    todo = [f for f in fma_ids if f not in cache]
    failed = 0
    if todo:
        print(f"OLS4: hole {len(todo)} FMA-Terms ({len(fma_ids) - len(todo)} aus Cache) ...")

        def work(fid: str):
            try:
                return fid, fetch_fma(fid)
            except RuntimeError as e:
                print(f"  FAIL {fid}: {e}", file=sys.stderr)
                return fid, {"status": "fetch_failed"}

        done = 0
        with ThreadPoolExecutor(max_workers=6) as ex:
            for fid, data in ex.map(work, todo):
                cache[fid] = data
                if data["status"] == "fetch_failed":
                    failed += 1
                done += 1
                if done % 50 == 0:
                    print(f"  {done}/{len(todo)}")
                    save_cache(cache)
        save_cache(cache)
    return cache, failed


# --- Cross-Walk + Befunde ----------------------------------------------------

def label_side(label: str | None) -> str:
    if not label:
        return "unknown"
    m = SIDE_RE.search(label)
    return m.group(1).lower() if m else "midline"


def norm(name: str | None) -> str:
    if not name:
        return ""
    s = SIDE_RE.sub("", name.lower())
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def load_policy() -> dict:
    """FMA-Lateralitaets-Policy (gleiche Datei wie convert.py). Macht den Audit bewusst,
    dass lateralisierte Kind-IDs + Dead-ID-Remaps absichtlich und FMA-korrekt sind."""
    path = os.path.join(HERE, "reference", "fma_laterality_policy.json")
    if not os.path.exists(path):
        return {"paired": {}, "midline": {}, "id_remap": {}, "part_whole": {}}
    p = json.load(open(path, encoding="utf-8"))
    return {"paired": p.get("paired", {}), "midline": p.get("midline", {}),
            "id_remap": p.get("id_remap", {}), "part_whole": p.get("part_whole", {})}


def audit(structures: dict, source: dict, fma_data: dict, policy: dict | None = None) -> list[dict]:
    policy = policy or {"paired": {}, "midline": {}, "id_remap": {}, "part_whole": {}}
    findings = []
    for key, s in structures.items():
        fid = s["fma"]
        fd = fma_data.get(fid, {"status": "missing"})
        src = source.get(s["fileId"])
        issues = []
        sev = "ok"

        # 1. FMA-ID-Validitaet
        if fd["status"] == "not_found":
            issues.append("FMA-ID existiert nicht in Live-FMA (ungueltige/veraltete ID)")
            sev = "error"
        elif fd["status"] == "fetch_failed":
            issues.append("OLS4-Abfrage fehlgeschlagen (unbewertet)")
            sev = max(sev, "warn", key=_sevrank)
        elif fd.get("obsolete"):
            issues.append(f"FMA-Term ist als obsolet markiert: {fd.get('label')}")
            sev = "error"

        # 2. Lateralitaet (FMA-Label ist die Wahrheit)
        fma_lat = label_side(fd.get("label")) if fd["status"] == "ok" else "unknown"
        our_side = s["side"]
        if fd["status"] == "ok":
            if fma_lat in ("left", "right") and our_side == "midline":
                issues.append(
                    f"Lateralitaet: FMA-Label ist '{fma_lat}', wir fuehren side=midline")
                sev = "error"
            elif fma_lat == "midline" and our_side in ("left", "right"):
                issues.append(
                    f"Lateralitaet: FMA-Label ist unpaarig/midline ('{fd.get('label')}'), "
                    f"wir fuehren side={our_side}")
                sev = "error"
            elif fma_lat in ("left", "right") and our_side in ("left", "right") \
                    and fma_lat != our_side:
                issues.append(
                    f"Lateralitaet: FMA-Label '{fma_lat}' != unsere side='{our_side}' (gespiegelt?)")
                sev = "error"

        # 3. Namenstreue
        if fd["status"] == "ok" and norm(s["name"]) != norm(fd.get("label")):
            issues.append(
                f"Name weicht ab: unser '{s['name']}' vs FMA '{fd.get('label')}'")
            sev = max(sev, "warn", key=_sevrank)
        if src and norm(s["name"]) != norm(src["name"]):
            issues.append(
                f"Name weicht vom Source-Dateinamen ab: '{s['name']}' vs '{src['name']}'")
            sev = max(sev, "warn", key=_sevrank)

        # 5. Source-Konsistenz. Ein Mismatch ist KORREKT, wenn unsere FMA eine bewusste,
        # FMA-belegte Spezialisierung der Quell-ID ist: lateralisiertes FMA-Kind (Quell-ID
        # ist hierarchicalParent unserer ID) oder dokumentierter Dead-ID-Remap.
        if src and src["fma"] != fid:
            parent_fmas = {p.get("fma", "").upper() for p in fd.get("parents", [])}
            remap_ok = policy["id_remap"].get(src["fma"]) == fid
            child_ok = src["fma"].upper() in parent_fmas
            if not (remap_ok or child_ok):
                issues.append(
                    f"Source-Dateiname traegt {src['fma']}, wir fuehren {fid} (fileId fehlverdrahtet)")
                sev = "error"
        in_source = src is not None

        # 6. Teil/Ganzes-Ueberlappung: Teilstruktur ('half/part/segment of X'), deren ganzes
        # X ebenfalls im Register steht. Generisch ueber den Namen (hierarchicalParents taugen
        # nicht: das Ganze ist dort nicht der Elternterm). Echte geometrische Duplikate werden
        # bereits in convert.py (collapse_geometric_duplicates) verworfen und tauchen hier nicht
        # mehr auf; was hier verbleibt, ist eine BEWUSST behaltene, nicht-deckungsgleiche
        # Substruktur. Nur sichtbar machen (info, mit Volumen-Evidenz) — kein Drop, kein Fehler.
        part_whole_overlap = None
        name_for_part = (fd.get("label") if fd["status"] == "ok" else None) or s["name"]
        m = PART_OF_RE.search(name_for_part)
        if m:
            whole_slug = audit_slug(m.group(1))
            whole = structures.get(whole_slug)
            if whole and whole_slug != key:
                vp, vw = s.get("volume_cm3"), whole.get("volume_cm3")
                rel = abs(vp - vw) / vw if (vp is not None and vw) else None
                part_whole_overlap = {"whole": whole_slug, "part_vol": vp, "whole_vol": vw,
                                      "rel_vol_delta": rel}
                dvol = f" (dvol={rel * 100:.2f}%)" if rel is not None else ""
                issues.append(
                    f"Teil/Ganzes-Ueberlappung mit '{whole_slug}'{dvol} "
                    "— bewusst behaltene Substruktur (nicht deckungsgleich)")
                sev = max(sev, "info", key=_sevrank)

        findings.append({
            "part_whole_overlap": part_whole_overlap,
            "key": key,
            "fma": fid,
            "our_name": s["name"],
            "our_side": our_side,
            "fma_label": fd.get("label"),
            "fma_status": fd["status"],
            "fma_laterality": fma_lat,
            "definition": fd.get("definition"),
            "parents": fd.get("parents", []),
            "in_source": in_source,
            "severity": sev,
            "issues": issues,
        })
    return findings


_SEV = {"ok": 0, "info": 1, "warn": 2, "error": 3}


def _sevrank(s: str) -> int:
    return _SEV.get(s, 0)


# --- Report ------------------------------------------------------------------

def pair_gap(source: dict) -> list[str]:
    """Strukturen, die im Source-Set nur rechts (linke Seite fehlt) vorliegen."""
    left, right = set(), set()
    for v in source.values():
        nl = v["name"].lower()
        b = norm(v["name"])
        if nl.startswith("left "):
            left.add(b)
        elif nl.startswith("right "):
            right.add(b)
    return sorted(right - left)


def write_report(findings: list[dict], source: dict, failed: int) -> None:
    by_sev = collections.Counter(f["severity"] for f in findings)
    errors = [f for f in findings if f["severity"] == "error"]
    warns = [f for f in findings if f["severity"] == "warn"]
    gap = pair_gap(source)

    L = []
    L.append("# FMA-Diskrepanz-Report")
    L.append("")
    L.append("Systematischer Abgleich der BodyParts3D-Hirnstrukturen gegen die "
             "Live-FMA-Ontologie (EBI OLS4) plus den Source-Export.")
    L.append("")
    L.append("## Zusammenfassung")
    L.append("")
    L.append(f"- Strukturen geprueft: **{len(findings)}**")
    L.append(f"- Fehler (ERROR): **{by_sev['error']}**")
    L.append(f"- Warnungen (WARN): **{by_sev['warn']}**")
    L.append(f"- Sauber (OK): **{by_sev['ok']}**")
    if failed:
        L.append(f"- ⚠️ OLS4-Abfragen fehlgeschlagen (unbewertet): **{failed}** "
                 "— Report unvollstaendig, Rerun noetig")
    L.append("")

    L.append("## ERROR — harte Diskrepanzen")
    L.append("")
    if not errors:
        L.append("_Keine._")
    else:
        L.append("| Struktur | FMA | unsere side | FMA-Label | Befund |")
        L.append("|---|---|---|---|---|")
        for f in sorted(errors, key=lambda x: x["key"]):
            L.append(f"| `{f['key']}` | {f['fma']} | {f['our_side']} | "
                     f"{f['fma_label'] or '—'} | {'; '.join(f['issues'])} |")
    L.append("")

    L.append("## WARN — Namensabweichungen (oft nur de/la-Lokalisierung, pruefen)")
    L.append("")
    if not warns:
        L.append("_Keine._")
    else:
        L.append("| Struktur | FMA | unser Name | FMA-Label | Befund |")
        L.append("|---|---|---|---|---|")
        for f in sorted(warns, key=lambda x: x["key"]):
            L.append(f"| `{f['key']}` | {f['fma']} | {f['our_name']} | "
                     f"{f['fma_label'] or '—'} | {'; '.join(f['issues'])} |")
    L.append("")

    overlaps = [f for f in findings if f.get("part_whole_overlap")]
    L.append("## Teil/Ganzes-Ueberlappungen (bewusst behaltene Substrukturen)")
    L.append("")
    L.append("Teilstrukturen ('half/part/segment of X'), deren ganzes X ebenfalls im Register "
             "steht. Echte geometrische Duplikate (Volumen UND Schwerpunkt-Lage deckungsgleich) "
             "werden in der Pipeline verworfen und erscheinen hier NICHT mehr; was bleibt, ist "
             "eine nicht-deckungsgleiche, eigenstaendige (buchrelevante) Substruktur. Hinweis: "
             "ein kleiner dvol allein bedeutet KEIN Duplikat — der posteriore STG-Teil etwa hat "
             "fast das Volumen des ganzen Gyrus, liegt aber raeumlich versetzt (Hinterhaelfte) "
             "und ist daher eigenstaendig. Das Duplikat-Kriterium prueft Volumen UND Lage "
             "gemeinsam (siehe convert.py / fma_laterality_policy.json -> part_whole).")
    L.append("")
    if not overlaps:
        L.append("_Keine._")
    else:
        L.append("| Teilstruktur | Ganzes | Teil cm3 | Ganzes cm3 | dvol |")
        L.append("|---|---|---|---|---|")
        for f in sorted(overlaps, key=lambda x: x["key"]):
            o = f["part_whole_overlap"]
            rel = f"{o['rel_vol_delta'] * 100:.2f}%" if o["rel_vol_delta"] is not None else "—"
            L.append(f"| `{f['key']}` | `{o['whole']}` | {o['part_vol']} | {o['whole_vol']} | {rel} |")
    L.append("")

    L.append("## Lateralitaets-Luecke im Source-Export")
    L.append("")
    L.append(f"Strukturen, die im Source-Set nur **rechts** vorliegen "
             f"(linke Seite fehlt im Download): **{len(gap)}**")
    L.append("")
    for b in gap:
        L.append(f"- {b}")
    L.append("")

    os.makedirs(os.path.dirname(REPORT_MD), exist_ok=True)
    with open(REPORT_MD, "w") as f:
        f.write("\n".join(L) + "\n")

    with open(REPORT_JSON, "w") as f:
        json.dump({"summary": dict(by_sev), "fetch_failed": failed,
                   "pair_gap": gap, "findings": findings},
                  f, ensure_ascii=False, indent=2)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default=os.environ.get("FMA_SOURCE", ""),
                    help="Verzeichnis mit den Source-.obj-Dateien")
    ap.add_argument("--limit", type=int, default=0, help="nur erste N FMA-IDs (Debug)")
    ap.add_argument("--refresh", action="store_true", help="Cache ignorieren")
    args = ap.parse_args()
    if not args.source:
        raise SystemExit("--source <dir> noetig (oder FMA_SOURCE setzen)")

    structures = json.load(open(STRUCTURES))
    source = load_source_index(args.source)
    fma_ids = sorted({v["fma"] for v in structures.values()})
    if args.limit:
        fma_ids = fma_ids[:args.limit]

    fma_data, failed = build_fma_data(fma_ids, args.refresh)
    findings = audit(structures, source, fma_data, load_policy())
    write_report(findings, source, failed)

    by_sev = collections.Counter(f["severity"] for f in findings)
    print(f"\nFertig. ERROR={by_sev['error']} WARN={by_sev['warn']} OK={by_sev['ok']} "
          f"fetch_failed={failed}")
    print(f"Report:  {REPORT_MD}")
    print(f"JSON:    {REPORT_JSON}")


if __name__ == "__main__":
    main()
