#!/usr/bin/env python3
"""Stamp module.prop with a CI-only version (monotonic versionCode).

Display: <baseWithoutV>.ci.<run>  e.g. 2.3.0.ci.42
versionCode: next global monotonic code (see next-version-code.py)

Usage:
  GITHUB_RUN_NUMBER=42 python3 stamp-ci-module-version.py --fetch-remote
  python3 stamp-ci-module-version.py --run 3 --version 2.3.0.ci.3 --code 20301
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import re
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent


def stamp_prop_text(prop_text: str, version: str, version_code: int) -> str:
    if not re.search(r"^version=", prop_text, re.MULTILINE):
        raise SystemExit("module.prop missing version=")
    if not re.search(r"^versionCode=", prop_text, re.MULTILINE):
        raise SystemExit("module.prop missing versionCode=")
    out = re.sub(r"^version=.*$", f"version={version}", prop_text, count=1, flags=re.MULTILINE)
    out = re.sub(
        r"^versionCode=.*$",
        f"versionCode={version_code}",
        out,
        count=1,
        flags=re.MULTILINE,
    )
    return out


def base_from_prop(prop_text: str) -> str:
    m = re.search(r"^version=(.+)$", prop_text, re.MULTILINE)
    raw = (m.group(1).strip() if m else "0.0.0").lstrip("vV")
    raw = re.sub(r"\.ci\.\d+$", "", raw)
    return raw or "0.0.0"


def load_next_version_code():
    spec = importlib.util.spec_from_file_location(
        "next_version_code",
        _SCRIPTS / "next-version-code.py",
    )
    if spec is None or spec.loader is None:
        raise SystemExit("cannot load next-version-code.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.next_version_code


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prop", type=Path, default=repo / "module" / "module.prop")
    parser.add_argument("--run", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--fetch-remote", action="store_true")
    parser.add_argument("--code", type=int, default=0)
    parser.add_argument("--version", type=str, default="")
    args = parser.parse_args()

    run = args.run
    if run <= 0:
        env_run = os.environ.get("GITHUB_RUN_NUMBER", "").strip()
        if env_run.isdigit() and int(env_run) >= 1:
            run = int(env_run)
        else:
            raise SystemExit("missing run number: set GITHUB_RUN_NUMBER or pass --run N")

    text = args.prop.read_text(encoding="utf-8")
    if args.code > 0:
        code = args.code
    else:
        next_version_code = load_next_version_code()
        code = next_version_code(repo=repo, fetch_remote=args.fetch_remote)

    version = args.version.strip() or f"{base_from_prop(text)}.ci.{run}"

    if not args.dry_run:
        args.prop.write_text(stamp_prop_text(text, version, code), encoding="utf-8")

    print(f"version={version}")
    print(f"version_code={code}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
