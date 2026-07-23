#!/usr/bin/env python3
"""Materialize the Status title in source HTML before deployment."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

TITLE = "Status // Atlas Systems"
TITLE_RE = re.compile(r"(<title>)(.*?)(</title>)", re.IGNORECASE | re.DOTALL)
OG_TITLE_RE = re.compile(r'<meta\s+property=["\']og:title["\'][^>]*>', re.IGNORECASE)
TWITTER_TITLE_RE = re.compile(r'<meta\s+name=["\']twitter:title["\'][^>]*>', re.IGNORECASE)


def normalize(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    if not TITLE_RE.search(original):
        raise SystemExit(f"missing <title> in {path}")

    updated = TITLE_RE.sub(lambda match: f"{match.group(1)}{TITLE}{match.group(3)}", original, count=1)
    insertions: list[str] = []
    if not OG_TITLE_RE.search(updated):
        insertions.append(f'<meta property="og:title" content="{TITLE}">')
    if not TWITTER_TITLE_RE.search(updated):
        insertions.append(f'<meta name="twitter:title" content="{TITLE}">')
    if insertions:
        marker = updated.lower().find("</title>")
        marker += len("</title>")
        updated = updated[:marker] + "\n" + "\n".join(insertions) + updated[marker:]

    if updated == original:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?", default="index.html")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    path = Path(args.path)
    changed = normalize(path)
    if args.check and changed:
        print(f"would normalize: {path}")
        return 1
    if changed:
        print(f"normalized: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
