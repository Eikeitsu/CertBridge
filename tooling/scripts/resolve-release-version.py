#!/usr/bin/env python3
"""Parse CertBridge semver input → version + versionCode (stdout: KEY=value).

Usage:
  RAW=2.2.0 python3 resolve-release-version.py
  python3 resolve-release-version.py v2.2.0
"""

from __future__ import annotations

import os
import re
import sys


def resolve(raw: str) -> tuple[str, int]:
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
    if code > 2147483647:
        raise SystemExit(f"versionCode {code} exceeds int32 max")

    version = f"v{major}.{minor}.{patch}"
    return version, code


def main() -> int:
    raw = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("RAW", "")
    version, code = resolve(raw)
    print(f"version={version}")
    print(f"version_code={code}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
