#!/usr/bin/env python3
"""Build a local SQLite index for wiki coverage audits.

Markdown remains the source of truth. This DB is a disposable query/index layer
for fast coverage, alias, and review checks.
"""

from __future__ import annotations

import importlib.util
import json
import re
import sqlite3
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = Path(__file__).resolve().parent
DB_PATH = OUT_DIR / "coverage.sqlite"


def load_crosswalk_module():
    path = OUT_DIR / "recompute_book_crosswalk.py"
    spec = importlib.util.spec_from_file_location("recompute_book_crosswalk", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def frontmatter(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---") or text.count("---") < 2:
        return {}
    raw = text.split("---", 2)[1]
    data: dict[str, object] = {}
    for key in ("type", "title"):
        match = re.search(rf"^{key}:\s*[\"']?(.*?)[\"']?\s*$", raw, re.M)
        if match:
            data[key] = match.group(1)
    data["aliases"] = list_values(raw, "aliases")
    data["sources"] = list_values(raw, "sources")
    return data


def list_values(raw: str, key: str) -> list[str]:
    inline = re.search(rf"^{key}:\s*\[(.*?)\]", raw, re.M)
    if inline:
        return [item.strip().strip("\"'") for item in inline.group(1).split(",") if item.strip()]
    block = re.search(rf"^{key}:\s*\n((?:\s*-\s*.*\n)+)", raw, re.M)
    if not block:
        return []
    return [
        re.sub(r"^\s*-\s*", "", line).strip().strip("\"'")
        for line in block.group(1).splitlines()
        if line.strip()
    ]


def main() -> None:
    cw = load_crosswalk_module()
    report = cw.build_report()
    pages = cw.wiki_name_index()[1]
    if DB_PATH.exists():
        DB_PATH.unlink()

    con = sqlite3.connect(DB_PATH)
    con.execute("pragma journal_mode=wal")
    con.executescript(
        """
        create table pages (
          path text primary key,
          section text not null,
          slug text not null,
          title text,
          page_type text,
          source_count integer not null
        );
        create table names (
          norm text not null,
          name text not null,
          path text not null references pages(path),
          kind text not null,
          unique(norm, path, kind)
        );
        create table source_terms (
          source text not null,
          term text not null,
          norm text not null,
          anchor text not null,
          status text not null,
          match_rule text not null,
          matches_json text not null
        );
        create index names_norm_idx on names(norm);
        create index source_terms_status_idx on source_terms(source, status);
        """
    )

    with con:
        for page in pages:
            rel = page["path"]
            path = ROOT / str(rel)
            fm = frontmatter(path)
            section = Path(str(rel)).parts[2]
            con.execute(
                "insert into pages values (?, ?, ?, ?, ?, ?)",
                (
                    rel,
                    section,
                    page["slug"],
                    fm.get("title") or page.get("title"),
                    fm.get("type"),
                    len(fm.get("sources", [])),
                ),
            )
            names = [(page["slug"], "slug")]
            if page.get("title"):
                names.append((str(page["title"]), "title"))
            for alias in page.get("aliases", []):
                names.append((str(alias), "alias"))
            for name, kind in names:
                con.execute(
                    "insert or ignore into names values (?, ?, ?, ?)",
                    (cw.normalize(name), name, rel, kind),
                )

        for term in report["terms"]:
            con.execute(
                "insert into source_terms values (?, ?, ?, ?, ?, ?, ?)",
                (
                    term["source"],
                    term["term"],
                    term["norm"],
                    term["anchor"],
                    term["status"],
                    term["match_rule"],
                    json.dumps(term["matches"], ensure_ascii=False),
                ),
            )

    summary = {
        "db": DB_PATH.as_posix(),
        "pages": con.execute("select count(*) from pages").fetchone()[0],
        "names": con.execute("select count(*) from names").fetchone()[0],
        "source_terms": con.execute("select count(*) from source_terms").fetchone()[0],
        "open_terms": con.execute("select count(*) from source_terms where status='open'").fetchone()[0],
        "alias_collisions": con.execute(
            """
            select count(*) from (
              select norm from names group by norm having count(distinct path) > 1
            )
            """
        ).fetchone()[0],
    }
    (OUT_DIR / "coverage-sqlite-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    con.close()


if __name__ == "__main__":
    main()
