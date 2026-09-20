#!/usr/bin/env python3
"""Allocate next monotonic Magisk versionCode for CertBridge.

Sources (max + 1):
  - module/module.prop
  - update.json / docs/public/update.json
  - remote Pages update.json
  - remote ci-dist/update.json

Usage:
  python3 next-version-code.py --fetch-remote
  # prints: version_code=N
"""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

INT32_MAX = 2147483647
DEFAULT_REPO = "Eikeitsu/CertBridge"
PAGES_UPDATE = "https://eikeitsu.github.io/CertBridge/update.json"


def _as_code(raw: object) -> int | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw if 0 < raw <= INT32_MAX else None
    if isinstance(raw, str) and raw.strip().isdigit():
        n = int(raw.strip())
        return n if 0 < n <= INT32_MAX else None
    return None


def read_code_from_prop(path: Path) -> int | None:
    if not path.is_file():
        return None
    m = re.search(r"^versionCode=(.+)$", path.read_text(encoding="utf-8"), re.MULTILINE)
    if not m:
        return None
    return _as_code(m.group(1).strip())


def read_code_from_json(path: Path) -> int | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return _as_code(data.get("versionCode"))


def read_code_from_url(url: str, timeout: float = 8.0) -> int | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CertBridge-version-code"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (
        urllib.error.URLError,
        TimeoutError,
        json.JSONDecodeError,
        ValueError,
        OSError,
    ):
        return None
    return _as_code(data.get("versionCode"))


def collect_codes(repo: Path, fetch_remote: bool) -> list[int]:
    codes: list[int] = []
    for c in (
        read_code_from_prop(repo / "module" / "module.prop"),
        read_code_from_json(repo / "update.json"),
        read_code_from_json(repo / "docs" / "public" / "update.json"),
    ):
        if c is not None:
            codes.append(c)

    if fetch_remote:
        owner_repo = os.environ.get("GITHUB_REPOSITORY", DEFAULT_REPO)
        for url in (
            PAGES_UPDATE,
            f"https://raw.githubusercontent.com/{owner_repo}/ci-dist/update.json",
        ):
            c = read_code_from_url(url)
            if c is not None:
                codes.append(c)
    return codes


def next_version_code(
    *, repo: Path, fetch_remote: bool = True, extras: list[int] | None = None
) -> int:
    codes = collect_codes(repo, fetch_remote)
    if extras:
        codes.extend(c for c in extras if isinstance(c, int) and c > 0)
    base = max(codes) if codes else 0
    nxt = base + 1
    if nxt > INT32_MAX:
        raise SystemExit(f"versionCode overflow: {nxt}")
    return nxt


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch-remote", action="store_true")
    parser.add_argument("--no-fetch-remote", action="store_true")
    args = parser.parse_args()
    fetch = True
    if args.no_fetch_remote:
        fetch = False
    elif args.fetch_remote:
        fetch = True
    code = next_version_code(repo=repo, fetch_remote=fetch)
    print(f"version_code={code}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
