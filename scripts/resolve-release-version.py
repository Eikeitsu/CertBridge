#!/usr/bin/env python3
"""Parse CertBridge semver input → version + versionCode (stdout: KEY=value).

versionCode:
  base = MAJOR*10000 + MINOR*100 + PATCH
  seen = max(prop / update.json / Pages / ci-dist) if any
  final = seen+1 if seen > base else base

So when the latest CI (or prior formal) is already above the semver
mapping, the release still wins Magisk update checks; otherwise keep
the semver-derived code.

Usage:
  RAW=2.2.0 python3 resolve-release-version.py
  python3 resolve-release-version.py v2.2.0
  RAW=4.2.2 python3 resolve-release-version.py --fetch-remote
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import re
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
_REPO = Path(__file__).resolve().parents[2]
INT32_MAX = 2147483647


def load_version_code_helpers():
    spec = importlib.util.spec_from_file_location(
        "next_version_code",
        _SCRIPTS / "next-version-code.py",
    )
    if spec is None or spec.loader is None:
        raise SystemExit("cannot load next-version-code.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.collect_codes


def parse_semver(raw: str) -> tuple[str, int]:
    raw = raw.strip().lstrip("vV")
    if not raw:
        raise SystemExit("empty version")

    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", raw)
    if not m:
        raise SystemExit(f"unsupported version (expect MAJOR.MINOR.PATCH): {raw}")

    major, minor, patch = map(int, m.groups())
    if major > 214 or minor > 99 or patch > 99:
        raise SystemExit(f"version out of range for versionCode: {raw}")

    code = major * 10000 + minor * 100 + patch
    if code > INT32_MAX:
        raise SystemExit(f"versionCode {code} exceeds int32 max")

    version = f"v{major}.{minor}.{patch}"
    return version, code


def resolve(raw: str, *, fetch_remote: bool) -> tuple[str, int, int, int | None]:
    """Return (version, final_code, semver_code, seen_max)."""
    version, semver_code = parse_semver(raw)
    collect_codes = load_version_code_helpers()
    codes = collect_codes(_REPO, fetch_remote)
    seen_max = max(codes) if codes else None
    if seen_max is not None and seen_max > semver_code:
        code = seen_max + 1
    else:
        code = semver_code
    if code > INT32_MAX:
        raise SystemExit(f"versionCode {code} exceeds int32 max")
    return version, code, semver_code, seen_max


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "raw",
        nargs="?",
        default="",
        help="version like 2.2.0 or v2.2.0 (else RAW env)",
    )
    parser.add_argument(
        "--fetch-remote",
        action="store_true",
        help="include Pages + ci-dist update.json when computing floor",
    )
    parser.add_argument(
        "--no-fetch-remote",
        action="store_true",
        help="only local prop / update.json",
    )
    args = parser.parse_args()

    raw = args.raw or os.environ.get("RAW", "")
    if args.no_fetch_remote:
        fetch = False
    elif args.fetch_remote or os.environ.get("CI") == "true":
        fetch = True
    else:
        fetch = False

    version, code, semver_code, seen_max = resolve(raw, fetch_remote=fetch)
    print(f"version={version}")
    print(f"version_code={code}")
    print(f"semver_code={semver_code}")
    if seen_max is not None:
        print(f"seen_max_code={seen_max}")
    if code != semver_code:
        print(
            f"# versionCode raised {semver_code} → {code} (above seen max {seen_max})",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
