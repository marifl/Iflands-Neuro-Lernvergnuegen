#!/usr/bin/env python3
"""Recompute the textbook glossary/register crosswalk from local Markdown.

The parser is intentionally conservative. It proves which local headwords are
already represented by a wiki slug/title/alias and keeps noisy/OCR-derived
entries as partial or open instead of inflating coverage.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class SourceSpec:
    name: str
    path: Path
    start: int
    stop: int
    parser: str
    note: str


SOURCES = [
    SourceSpec(
        "Jaencke Index",
        Path("raw/textbooks/jaencke-kogn-neurowiss-4.md"),
        48095,
        49458,
        "index",
        "Zweispalten-OCR; Unterpunkte mit Parent-Kontext, Literatur-/Aufgabenverweise verworfen.",
    ),
    SourceSpec(
        "Lehrner Sachverzeichnis",
        Path("raw/textbooks/lehrner-klin-neuropsych-2.md"),
        40338,
        40622,
        "index",
        "Nur echtes Sachverzeichnis; Herausgeberbiografien danach ausgeschlossen.",
    ),
    SourceSpec(
        "Karnath Glossar",
        Path("raw/textbooks/karnath-kogn-neurowiss-3.md"),
        38218,
        39491,
        "glossary",
        "Glossar vor Anatomielisten und Literatur begrenzt; Definitionsfortsetzungen konservativ verworfen.",
    ),
    SourceSpec(
        "Bear Glossar",
        Path("raw/textbooks/bear-neurowiss-4.md"),
        58243,
        59943,
        "glossary",
        "Glossar vor Sachverzeichnis begrenzt; Zweispalten-Bleed konservativ behandelt.",
    ),
    SourceSpec(
        "Bear Sachverzeichnis",
        Path("raw/textbooks/bear-neurowiss-4.md"),
        59949,
        61245,
        "index",
        "Dreispalten-Sachverzeichnis vor Werbeblock begrenzt; Namen und Verweise bleiben reviewpflichtig.",
    ),
]


DROP_EXACT = {
    "",
    "index",
    "glossar",
    "sachverzeichnis",
    "anhang",
    "teil iv",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
}

DROP_WORDS = {
    "abb",
    "abbildung",
    "all",
    "alle",
    "aus",
    "copyright",
    "dokument",
    "doi",
    "fragen",
    "fresenius",
    "gebrauch",
    "hochschule",
    "kapitel",
    "literatur",
    "page",
    "persönlichen",
    "springer",
    "zusammenfassung",
}

ENTRY_START_RE = re.compile(r"^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9ˇα-ωΑ-ΩγβΔ/’'().,;:+\- ]{1,90}")
PAGE_NUM_RE = re.compile(r"(?:[, ]+\d{1,4}(?:[–-]\d{1,4})?)+\.?$")
TRAILING_INDEX_NUM_RE = re.compile(r"\s+\d{1,4}(?:[–-]\d{1,4})?(?:,\s*\d{1,4}(?:[–-]\d{1,4})?)*\.?$")
SEE_RE = re.compile(r"\b(?:s\.|siehe|Siehe|→)\b.*$")
INDEX_SUB_RE = re.compile(r"^[–\-—,]\s*")
GLOSSARY_SPLIT_RE = re.compile(
    r"\b(?:Siehe|siehe|Eine|Ein|Der|Die|Das|Alle|Bezeichnet|Durch|Wichtige|Seltene|"
    r"Anatomische|Psychische|Erworbene|Oberbegriff|Begriff|In)\b"
)
DROP_PREFIX_RE = re.compile(
    r"^(?:An der|An den|An die|Als |Areals\b|Bei |Damit |Dieses |Diese |Dieser |"
    r"Hier |Nach |Wird |Werden |Wenn )"
)


def load_term_exclusions() -> set[tuple[str, str]]:
    path = OUT_DIR / "term-exclusions.json"
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        (str(item.get("source")), str(item.get("norm")))
        for item in data.get("exclusions", [])
        if item.get("source") and item.get("norm")
    }


TERM_EXCLUSIONS = load_term_exclusions()


def normalize(value: str) -> str:
    value = value.replace("ß", "ss")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower()
    value = value.replace("&", " und ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def tokens(value: str) -> set[str]:
    return {part for part in normalize(value).split("-") if len(part) > 2}


def read_lines(path: Path, start: int, stop: int) -> list[tuple[int, str]]:
    lines = (ROOT / path).read_text(encoding="utf-8", errors="replace").splitlines()
    return [(idx, lines[idx - 1]) for idx in range(start, min(stop, len(lines)) + 1)]


def split_cells(line: str) -> list[str]:
    line = line.replace("\u00ad", "")
    line = re.sub(r"\s{2,}", "\t", line.strip())
    return [cell.strip() for cell in line.split("\t") if cell.strip()]


def cleanup_index_cell(cell: str) -> str | None:
    cell = SEE_RE.sub("", cell)
    cell = re.sub(r",\s*\d{1,4}.*$", "", cell)
    cell = re.sub(r"\s+\d{2,4}(?:[–-]\d{1,4})?(?:,\s*\d{1,4}.*)?$", "", cell)
    cell = TRAILING_INDEX_NUM_RE.sub("", cell)
    cell = PAGE_NUM_RE.sub("", cell).strip(" ,.;")
    cell = INDEX_SUB_RE.sub("", cell).strip(" ,.;")
    cell = re.sub(r"\s+", " ", cell)
    if not is_useful_term(cell):
        return None
    return cell


def cleanup_glossary_cell(cell: str) -> str | None:
    cell = cell.strip(" ,.;")
    if DROP_PREFIX_RE.match(cell):
        return None
    if not ENTRY_START_RE.match(cell):
        return None
    paren = re.search(r"\s+\([^)]{1,90}\)", cell)
    see = re.search(r"\s+(?:Siehe|siehe|→)\s+", cell)
    cue = GLOSSARY_SPLIT_RE.search(cell)
    cut_positions = [m.start() for m in (paren, see, cue) if m and m.start() > 1]
    if not cut_positions:
        return None
    cut = min(cut_positions)
    if cut > 2:
        cell = cell[:cut].strip(" ,.;")
    else:
        match = cue
        if not match:
            return None
        cell = cell[: match.start()].strip(" ,.;")
    cell = re.sub(r"\([^)]{1,90}\)", "", cell)
    cell = SEE_RE.sub("", cell)
    cell = re.sub(r"\s+", " ", cell).strip(" ,.;")
    if not is_useful_term(cell):
        return None
    return cell


def is_useful_term(term: str) -> bool:
    norm = normalize(term)
    if norm in DROP_EXACT:
        return False
    parts = norm.split("-")
    if not norm or len(norm) < 3:
        return False
    if any(word in DROP_WORDS for word in parts):
        return False
    if sum(ch.isalpha() for ch in term) < 3:
        return False
    if len(parts) == 1 and parts[0].isdigit():
        return False
    return True


def extract_terms(spec: SourceSpec) -> list[dict[str, object]]:
    terms_by_norm: dict[str, dict[str, object]] = {}
    parent_by_column: dict[int, str] = {}
    cleaner = cleanup_index_cell if spec.parser == "index" else cleanup_glossary_cell

    for line_no, line in read_lines(spec.path, spec.start, spec.stop):
        cells = split_cells(line)
        for col, raw_cell in enumerate(cells):
            cleaned = cleaner(raw_cell)
            if not cleaned:
                continue
            if spec.parser == "index" and raw_cell.lstrip().startswith(("–", "-", "—", ",")):
                parent = parent_by_column.get(col)
                if parent:
                    cleaned = f"{parent}, {cleaned}"
            elif spec.parser == "index" and not raw_cell.lstrip().startswith(("–", "-", "—", ",")):
                parent_by_column[col] = cleaned
            norm = normalize(cleaned)
            if (spec.name, norm) in TERM_EXCLUSIONS:
                continue
            if norm not in terms_by_norm:
                terms_by_norm[norm] = {
                    "term": cleaned,
                    "norm": norm,
                    "anchor": f"{spec.path}:{line_no}",
                    "source": spec.name,
                    "parser_note": spec.note,
                }
    return list(terms_by_norm.values())


def parse_frontmatter(path: Path) -> tuple[str | None, list[str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("---\n"):
        return None, []
    end = text.find("\n---", 4)
    if end == -1:
        return None, []
    fm = text[4:end]
    title = None
    aliases: list[str] = []
    in_aliases = False
    for line in fm.splitlines():
        stripped = line.strip()
        if stripped.startswith("title:"):
            title = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            in_aliases = False
            continue
        if stripped.startswith("aliases:"):
            in_aliases = True
            raw = stripped.split(":", 1)[1].strip()
            if raw.startswith("[") and raw.endswith("]"):
                aliases.extend(part.strip().strip('"').strip("'") for part in raw[1:-1].split(",") if part.strip())
                in_aliases = False
            elif raw:
                aliases.extend(re.findall(r'"([^"]+)"', raw))
                aliases.extend(re.findall(r"'([^']+)'", raw))
            continue
        if in_aliases and stripped.startswith("- "):
            aliases.append(stripped[2:].strip().strip('"').strip("'"))
            continue
        if in_aliases and re.match(r"^[A-Za-z_]+:", stripped):
            in_aliases = False
    return title, aliases


def wiki_name_index() -> tuple[dict[str, list[str]], list[dict[str, object]]]:
    names: dict[str, list[str]] = defaultdict(list)
    pages: list[dict[str, object]] = []
    for path in sorted((ROOT / "knowledge/wiki").glob("*/*.md")):
        rel = path.relative_to(ROOT).as_posix()
        slug = path.stem
        title, aliases = parse_frontmatter(path)
        candidates = [slug]
        if title:
            candidates.extend([title, re.split(r"\s+[—-]\s+", title, maxsplit=1)[0]])
        candidates.extend(aliases)
        page_names = sorted({name for name in candidates if name})
        for name in page_names:
            names[normalize(name)].append(rel)
        pages.append({"path": rel, "slug": slug, "title": title, "aliases": aliases})
    return names, pages


def classify(term: dict[str, object], name_map: dict[str, list[str]]) -> dict[str, object]:
    norm = str(term["norm"])
    if norm in name_map:
        return {**term, "status": "matched", "matches": sorted(set(name_map[norm])), "match_rule": "exact"}

    term_tokens = tokens(str(term["term"]))
    partials: list[str] = []
    if len(term_tokens) >= 2:
        for name_norm, paths in name_map.items():
            name_tokens = set(name_norm.split("-"))
            if not name_tokens:
                continue
            overlap = len(term_tokens & name_tokens) / len(term_tokens)
            if overlap >= 0.75:
                partials.extend(paths)
    else:
        singular = re.sub(r"(en|er|e|n|s)$", "", norm)
        if singular and singular != norm:
            for name_norm, paths in name_map.items():
                if re.sub(r"(en|er|e|n|s)$", "", name_norm) == singular:
                    partials.extend(paths)

    if partials:
        return {
            **term,
            "status": "partial",
            "matches": sorted(set(partials))[:8],
            "match_rule": "token_or_stem_overlap",
        }
    return {**term, "status": "open", "matches": [], "match_rule": "none"}


def build_report() -> dict[str, object]:
    name_map, pages = wiki_name_index()
    classified: list[dict[str, object]] = []
    for spec in SOURCES:
        classified.extend(classify(term, name_map) for term in extract_terms(spec))

    counts: dict[str, dict[str, int]] = {}
    for source, rows in group_by_source(classified).items():
        status_counts = Counter(str(row["status"]) for row in rows)
        counts[source] = {
            "total": len(rows),
            "matched": status_counts["matched"],
            "partial": status_counts["partial"],
            "open": status_counts["open"],
        }

    return {
        "generated_at": datetime.now(ZoneInfo("Europe/Berlin")).isoformat(timespec="seconds"),
        "method": "local_md_register_glossary_recompute_v1",
        "source_ranges": [
            {
                "source": spec.name,
                "path": spec.path.as_posix(),
                "start_line": spec.start,
                "stop_line": spec.stop,
                "parser": spec.parser,
                "note": spec.note,
            }
            for spec in SOURCES
        ],
        "wiki_page_count": len(pages),
        "wiki_name_count": len(name_map),
        "counts": counts,
        "terms": sorted(classified, key=lambda row: (str(row["source"]), str(row["term"]).lower())),
    }


def group_by_source(rows: list[dict[str, object]]) -> dict[str, list[dict[str, object]]]:
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        grouped[str(row["source"])].append(row)
    return grouped


def pct(value: int, total: int) -> str:
    if total == 0:
        return "0,0%"
    return f"{value / total * 100:.1f}%".replace(".", ",")


def write_markdown(report: dict[str, object], path: Path) -> None:
    counts = report["counts"]
    assert isinstance(counts, dict)
    terms = report["terms"]
    assert isinstance(terms, list)
    lines = [
        "# Recomputed Book Glossary/Register Crosswalk",
        "",
        f"Generated: `{report['generated_at']}`",
        "",
        "This is a conservative machine audit from local Markdown only. It is not a 100% coverage verdict.",
        "",
        "## Source Ranges",
        "",
        "| Source | Path | Lines | Parser note |",
        "|---|---|---:|---|",
    ]
    for item in report["source_ranges"]:
        assert isinstance(item, dict)
        lines.append(
            f"| {item['source']} | `{item['path']}` | {item['start_line']}-{item['stop_line']} | {item['note']} |"
        )

    lines.extend(
        [
            "",
            "## Counts",
            "",
            "| Source | Total | Matched | Matched % | Partial | Partial % | Open | Open % |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    totals = Counter()
    for source, row in counts.items():
        assert isinstance(row, dict)
        total = int(row["total"])
        matched = int(row["matched"])
        partial = int(row["partial"])
        open_count = int(row["open"])
        totals.update({"total": total, "matched": matched, "partial": partial, "open": open_count})
        lines.append(
            f"| {source} | {total} | {matched} | {pct(matched, total)} | "
            f"{partial} | {pct(partial, total)} | {open_count} | {pct(open_count, total)} |"
        )
    total = totals["total"]
    lines.append(
        f"| **Total** | **{total}** | **{totals['matched']}** | **{pct(totals['matched'], total)}** | "
        f"**{totals['partial']}** | **{pct(totals['partial'], total)}** | "
        f"**{totals['open']}** | **{pct(totals['open'], total)}** |"
    )

    lines.extend(["", "## First Open Terms Per Source", ""])
    for source, rows in group_by_source(terms).items():
        open_rows = [row for row in rows if row["status"] == "open"][:40]
        lines.append(f"### {source}")
        lines.append("")
        if not open_rows:
            lines.append("No open machine terms.")
            lines.append("")
            continue
        lines.extend(["| Term | Anchor |", "|---|---|"])
        for row in open_rows:
            lines.append(f"| {row['term']} | `{row['anchor']}` |")
        lines.append("")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_self_checks(report: dict[str, object]) -> None:
    counts = report["counts"]
    terms = report["terms"]
    assert isinstance(counts, dict)
    assert isinstance(terms, list)
    assert counts, "no counts generated"
    assert terms, "no terms generated"
    for source in (spec.name for spec in SOURCES):
        assert source in counts, f"missing source count: {source}"
        row = counts[source]
        assert isinstance(row, dict)
        assert int(row["total"]) == int(row["matched"]) + int(row["partial"]) + int(row["open"])
    assert any(row["status"] == "matched" for row in terms), "no matched terms"
    assert any(row["status"] == "open" for row in terms), "no open terms"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write JSON and Markdown artifacts")
    args = parser.parse_args()

    report = build_report()
    run_self_checks(report)

    if args.write:
        json_path = OUT_DIR / "book-crosswalk-recomputed.json"
        md_path = OUT_DIR / "book-crosswalk-recomputed.md"
        json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_markdown(report, md_path)
        print(json_path)
        print(md_path)
    else:
        print(json.dumps({"generated_at": report["generated_at"], "counts": report["counts"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
