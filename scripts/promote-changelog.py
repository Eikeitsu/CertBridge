#!/usr/bin/env python3
"""Changelog helpers for release workflow.

Commands:
  promote-changelog.py <version> [changelog.md]
      Promote non-empty ## Unreleased → ## <version>, keep empty Unreleased stub.

  promote-changelog.py --export-docs <src.md> <dst.md> [dst2.md ...]
      Write changelog copies for the docs site WITHOUT ## Unreleased.
"""

from __future__ import annotations

import pathlib
import re
import sys

HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")


def version_keys(version: str) -> set[str]:
    raw = version.strip()
    if not raw:
        return set()
    keys = {raw, raw.lstrip("vV")}
    bare = raw.lstrip("vV")
    keys.add(f"v{bare}")
    keys.add(f"V{bare}")
    return {k for k in keys if k}


def is_unreleased(heading: str) -> bool:
    return heading.strip().lower() == "unreleased"


def parse(text: str) -> tuple[str, list[tuple[str, str]]]:
    lines = text.splitlines()
    preamble: list[str] = []
    i = 0
    while i < len(lines) and not HEADING_RE.match(lines[i]):
        preamble.append(lines[i])
        i += 1
    sections: list[tuple[str, str]] = []
    while i < len(lines):
        match = HEADING_RE.match(lines[i])
        assert match
        heading = match.group(1).strip()
        i += 1
        body: list[str] = []
        while i < len(lines) and not HEADING_RE.match(lines[i]):
            body.append(lines[i])
            i += 1
        sections.append((heading, "\n".join(body).rstrip("\n")))
    preamble_text = "\n".join(preamble).rstrip()
    if not preamble_text:
        preamble_text = "# 更新日志"
    return preamble_text + "\n", sections


def render(preamble: str, sections: list[tuple[str, str]]) -> str:
    """Serialize sections with exactly one blank line around each heading/body.

    parse() keeps the blank line after ``##`` inside ``body`` (leading ``\\n``).
    Re-adding another blank here would create MD012 (multiple blanks), and
    markdownlint --fix may then collapse into MD022/MD032 on commit hooks.
    """
    parts = [preamble.rstrip(), ""]
    for heading, body in sections:
        parts.append(f"## {heading}")
        parts.append("")
        cleaned = body.strip("\n")
        if cleaned.strip():
            parts.append(cleaned)
            parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def promote(text: str, version: str) -> tuple[str, str]:
    version = version.strip()
    if not version:
        return text, "empty version, skipped"

    preamble, sections = parse(text if text.strip() else "# 更新日志\n")

    unreleased_body = ""
    other: list[tuple[str, str]] = []
    for heading, body in sections:
        if is_unreleased(heading):
            if body.strip():
                unreleased_body = body.strip()
            continue
        other.append((heading, body))

    version_idx = None
    for idx, (heading, _) in enumerate(other):
        if version_keys(heading) & version_keys(version):
            version_idx = idx
            break

    if unreleased_body:
        if version_idx is None:
            other.insert(0, (version, unreleased_body))
            status = f"promoted Unreleased -> {version}"
        else:
            old_h, old_b = other[version_idx]
            merged = (
                (old_b.strip() + "\n\n" + unreleased_body).strip()
                if old_b.strip()
                else unreleased_body
            )
            other[version_idx] = (old_h, merged)
            status = f"merged Unreleased into existing {old_h}"
    else:
        status = "Unreleased empty or missing; kept stub only"

    sections = [("Unreleased", "")] + other
    return render(preamble, sections), status


def export_docs(text: str) -> str:
    """Docs site changelog: published versions only (no Unreleased)."""
    preamble, sections = parse(text if text.strip() else "# 更新日志\n")
    published = [(h, b) for h, b in sections if not is_unreleased(h)]
    return render(preamble, published)


def export_bilingual(zh_text: str, en_text: str) -> str:
    """Single Magisk-facing file: per-version 中文 then English (newest first).

    Magisk only has one changelog URL, so both languages share this file.
    Interleaving by version keeps the latest release at the top for every reader
    instead of forcing English users to scroll past the full Chinese history.
    """

    def published(text: str, fallback_title: str) -> list[tuple[str, str]]:
        _, sections = parse(text if text.strip() else f"{fallback_title}\n")
        return [(h, b) for h, b in sections if not is_unreleased(h)]

    def is_meta_heading(heading: str) -> bool:
        key = heading.strip().lower()
        return key in {"中文", "chinese", "english", "en", "earlier", "更早"}

    zh_sections = [(h, b) for h, b in published(zh_text, "# 更新日志") if not is_meta_heading(h)]
    en_map: dict[str, str] = {}
    en_order: list[str] = []
    for heading, body in published(en_text, "# Changelog"):
        if is_meta_heading(heading):
            continue
        bare = heading.strip().lstrip("vV")
        en_map[bare] = body.strip("\n")
        en_order.append(heading)

    parts = [
        "# 更新日志 / Changelog",
        "",
        "> English notes are under each version's Chinese block — scroll down a bit to find them.",
        "> English text is machine-translated (e.g. Google Translate) and may be awkward or imprecise.",
        "",
        "---",
        "",
    ]

    seen_en: set[str] = set()
    for heading, zh_body in zh_sections:
        bare = heading.strip().lstrip("vV")
        parts.append(f"## {heading}")
        parts.append("")
        parts.append("### 中文")
        parts.append("")
        cleaned_zh = zh_body.strip("\n")
        if cleaned_zh.strip():
            parts.append(cleaned_zh)
            parts.append("")
        en_body = en_map.get(bare, "").strip("\n")
        if en_body.strip():
            parts.append("### English")
            parts.append("")
            parts.append(en_body)
            parts.append("")
            seen_en.add(bare)

    # EN-only versions (rare): append after Chinese-ordered history
    for heading in en_order:
        bare = heading.strip().lstrip("vV")
        if bare in seen_en:
            continue
        en_body = en_map.get(bare, "").strip("\n")
        if not en_body.strip():
            continue
        parts.append(f"## {heading}")
        parts.append("")
        parts.append("### English")
        parts.append("")
        parts.append(en_body)
        parts.append("")

    return "\n".join(parts).rstrip() + "\n"


def main() -> int:
    if len(sys.argv) >= 2 and sys.argv[1] == "--export-bilingual":
        if len(sys.argv) < 5:
            print(
                "usage: promote-changelog.py --export-bilingual <zh.md> <en.md> <dst.md>",
                file=sys.stderr,
            )
            return 2
        zh_path = pathlib.Path(sys.argv[2])
        en_path = pathlib.Path(sys.argv[3])
        dst = pathlib.Path(sys.argv[4])
        zh_text = zh_path.read_text(encoding="utf-8") if zh_path.is_file() else "# 更新日志\n"
        en_text = en_path.read_text(encoding="utf-8") if en_path.is_file() else "# Changelog\n"
        out = export_bilingual(zh_text, en_text)
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(out, encoding="utf-8")
        print(f"exported bilingual Magisk changelog -> {dst}")
        return 0

    if len(sys.argv) >= 2 and sys.argv[1] == "--export-docs":
        if len(sys.argv) < 4:
            print(
                "usage: promote-changelog.py --export-docs <src.md> <dst.md> [dst2.md ...]",
                file=sys.stderr,
            )
            return 2
        src = pathlib.Path(sys.argv[2])
        text = src.read_text(encoding="utf-8") if src.is_file() else "# 更新日志\n"
        out = export_docs(text)
        for dst_arg in sys.argv[3:]:
            dst = pathlib.Path(dst_arg)
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(out, encoding="utf-8")
            print(f"exported docs changelog (no Unreleased) -> {dst}")
        return 0

    version = sys.argv[1] if len(sys.argv) > 1 else ""
    path = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "changelog.md")
    if not path.is_file():
        path.write_text("# 更新日志\n\n## Unreleased\n\n", encoding="utf-8")
    original = path.read_text(encoding="utf-8")
    updated, status = promote(original, version)
    path.write_text(updated, encoding="utf-8")
    print(status)
    print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
