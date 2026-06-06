#!/usr/bin/env python3
"""Inventory Markdown/MDX writing samples for brand voice profiling."""
from __future__ import annotations

import re
import sys
from pathlib import Path

EXTS = {".md", ".mdx"}
SKIP_PARTS = {".git", "node_modules", ".next", "dist", "build"}


def iter_files(paths: list[Path]) -> list[Path]:
    out: list[Path] = []
    for path in paths:
        if path.is_dir():
            for p in path.rglob("*"):
                if p.is_file() and p.suffix.lower() in EXTS and not (set(p.parts) & SKIP_PARTS):
                    out.append(p)
        elif path.is_file() and path.suffix.lower() in EXTS:
            out.append(path)
    return sorted(set(out))


def frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    data: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            data[k.strip()] = v.strip().strip('"\'')
    return data


def headings(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.startswith("#")][:8]


def first_nonempty_body_line(text: str) -> str:
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) == 3:
            text = parts[2]
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and not stripped.startswith("!"):
            return re.sub(r"\s+", " ", stripped)[:180]
    return ""


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: collect_samples.py <sample-file-or-dir>...", file=sys.stderr)
        return 2

    files = iter_files([Path(arg).expanduser().resolve() for arg in sys.argv[1:]])
    if not files:
        print("No Markdown/MDX files found.", file=sys.stderr)
        return 1

    common_parent = Path.cwd()
    try:
        common_parent = Path(__import__("os").path.commonpath([str(p.parent) for p in files]))
    except Exception:
        pass

    print("# Sample Inventory")
    print()
    print(f"Files: {len(files)}")
    print()
    for p in files:
        text = p.read_text(errors="ignore")
        fm = frontmatter(text)
        rel = p
        try:
            rel = p.relative_to(common_parent)
        except ValueError:
            pass
        print(f"## {rel}")
        print()
        print(f"- Words: {len(text.split())}")
        if fm.get("title"):
            print(f"- Title: {fm['title']}")
        if fm.get("category"):
            print(f"- Category: {fm['category']}")
        if fm.get("tags"):
            print(f"- Tags: {fm['tags']}")
        first = first_nonempty_body_line(text)
        if first:
            print(f"- First body line: {first}")
        hs = headings(text)
        if hs:
            print("- Headings:")
            for h in hs:
                print(f"  - {h}")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
