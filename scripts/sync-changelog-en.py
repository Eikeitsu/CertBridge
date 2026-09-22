#!/usr/bin/env python3
"""Sync English changelog from Chinese for a given version.

Usage:
  sync-changelog-en.py <version> [zh.md] [en.md]

Reads the ## <version> body from the Chinese changelog, machine-translates it
to English (preserving markdown structure / `code` / URLs), and upserts that
section into the English changelog.

Env (optional):
  DEEPL_AUTH_KEY       — prefer DeepL when set
  CHANGELOG_TRANSLATE=0 — skip network; keep Chinese body
"""

from __future__ import annotations

import os
import pathlib
import re
import sys
import time
import importlib.util

_HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("promote_changelog", _HERE / "promote-changelog.py")
assert _spec and _spec.loader
_pc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_pc)

parse = _pc.parse
render = _pc.render
version_keys = _pc.version_keys
is_unreleased = _pc.is_unreleased

CODE_SPAN_RE = re.compile(r"`[^`]+`")
URL_RE = re.compile(r"https?://[^\s)>\]]+")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def _protect(text: str) -> tuple[str, list[str]]:
    held: list[str] = []

    def stash(m: re.Match[str]) -> str:
        held.append(m.group(0))
        return f"⟦{len(held) - 1}⟧"

    out = CODE_SPAN_RE.sub(stash, text)
    out = URL_RE.sub(stash, out)
    return out, held


def _restore(text: str, held: list[str]) -> str:
    def unstash(m: re.Match[str]) -> str:
        idx = int(m.group(1))
        return held[idx] if 0 <= idx < len(held) else m.group(0)

    return re.sub(r"⟦(\d+)⟧", unstash, text)


def _translate_text(text: str) -> str:
    """Translate one blob with retries."""
    if not text.strip() or not CJK_RE.search(text):
        return text
    if os.environ.get("CHANGELOG_TRANSLATE", "1").strip().lower() in (
        "0",
        "false",
        "no",
    ):
        return text

    protected, held = _protect(text)
    out = None

    deepl_key = (os.environ.get("DEEPL_AUTH_KEY") or "").strip()
    if deepl_key:
        try:
            import deepl  # type: ignore

            out = str(
                deepl.Translator(deepl_key)
                .translate_text(protected, source_lang="ZH", target_lang="EN-US")
                .text
            )
        except Exception as exc:  # noqa: BLE001
            print(f"warn: DeepL failed ({exc}); trying Google", file=sys.stderr)

    if out is None:
        last_err: Exception | None = None
        # Try Google, then MyMemory as a second free backend
        backends: list[tuple[str, object]] = []
        try:
            from deep_translator import GoogleTranslator, MyMemoryTranslator  # type: ignore

            backends.append(("Google", GoogleTranslator(source="zh-CN", target="en")))
            backends.append(("MyMemory", MyMemoryTranslator(source="zh-CN", target="en-US")))
        except Exception as exc:  # noqa: BLE001
            print(f"warn: deep-translator import failed ({exc})", file=sys.stderr)

        for name, translator in backends:
            for attempt in range(3):
                try:
                    out = translator.translate(protected)  # type: ignore[attr-defined]
                    print(f"translate ok via {name}")
                    break
                except Exception as exc:  # noqa: BLE001
                    last_err = exc
                    wait = 2.0 * (attempt + 1)
                    print(
                        f"warn: {name} attempt {attempt + 1} failed ({exc}); retry in {wait:.1f}s",
                        file=sys.stderr,
                    )
                    time.sleep(wait)
            if out is not None:
                break
        if out is None:
            print(
                f"warn: translate failed ({last_err}); keeping Chinese for this chunk",
                file=sys.stderr,
            )
            out = protected

    return _restore(out, held)


def translate_markdown_body(body: str) -> str:
    """Translate in larger chunks (paragraph groups) to avoid per-line rate limits."""
    lines = body.splitlines()
    chunks: list[list[str]] = []
    cur: list[str] = []

    def flush() -> None:
        nonlocal cur
        if cur:
            chunks.append(cur)
            cur = []

    for line in lines:
        # Keep code fences as their own chunks (do not translate)
        if line.strip().startswith("```"):
            flush()
            chunks.append([line])
            continue
        cur.append(line)
        # Split on blank lines into paragraph-sized batches
        if not line.strip() and len(cur) >= 6:
            flush()
    flush()

    out_lines: list[str] = []
    for group in chunks:
        joined = "\n".join(group)
        if not CJK_RE.search(joined):
            out_lines.extend(group)
            continue
        if all(g.strip().startswith("```") for g in group):
            out_lines.extend(group)
            continue
        # Translate whole paragraph block once
        translated = _translate_text(joined)
        # Preserve line count when possible; otherwise take translator output as-is
        t_lines = translated.splitlines()
        if len(t_lines) == len(group):
            out_lines.extend(t_lines)
        else:
            out_lines.extend(t_lines if t_lines else group)
        time.sleep(0.4)

    result = "\n".join(out_lines).rstrip() + "\n"
    return result


def find_section(sections: list[tuple[str, str]], version: str) -> tuple[str, str] | None:
    keys = version_keys(version)
    for heading, body in sections:
        if version_keys(heading) & keys:
            return heading, body
    return None


def upsert_en(en_text: str, version: str, en_body: str) -> str:
    preamble, sections = parse(en_text if en_text.strip() else "# Changelog\n")
    if preamble.strip().startswith("# 更新日志"):
        preamble = "# Changelog\n"
    elif not preamble.strip().startswith("#"):
        preamble = "# Changelog\n"

    other: list[tuple[str, str]] = []
    for heading, body in sections:
        if is_unreleased(heading):
            continue
        other.append((heading, body))

    keys = version_keys(version)
    replaced = False
    for idx, (heading, _) in enumerate(other):
        if version_keys(heading) & keys:
            other[idx] = (heading, en_body.strip("\n"))
            replaced = True
            break
    if not replaced:
        other.insert(0, (version.strip(), en_body.strip("\n")))

    return render(preamble, [("Unreleased", ""), *other])


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "usage: sync-changelog-en.py <version> [zh.md=changelog.md] [en.md=changelog/en.md]",
            file=sys.stderr,
        )
        return 2

    version = sys.argv[1].strip()
    zh_path = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "changelog.md")
    en_path = pathlib.Path(sys.argv[3] if len(sys.argv) > 3 else "changelog/en.md")

    zh_text = zh_path.read_text(encoding="utf-8") if zh_path.is_file() else ""
    _, zh_sections = parse(zh_text if zh_text.strip() else "# 更新日志\n")
    found = find_section(zh_sections, version)
    if not found:
        print(f"no Chinese section for {version}; skip EN sync")
        return 0

    heading, zh_body = found
    if not zh_body.strip():
        print(f"Chinese section {heading} empty; skip EN sync")
        return 0

    print(f"translating {heading} ({len(zh_body)} chars) → English…")
    en_body = translate_markdown_body(zh_body.strip("\n") + "\n")

    # If translation largely failed (still mostly CJK), keep existing EN section
    cjk_ratio = len(CJK_RE.findall(en_body)) / max(len(en_body), 1)
    en_text = (
        en_path.read_text(encoding="utf-8")
        if en_path.is_file()
        else "# Changelog\n\n## Unreleased\n\n"
    )
    _, en_sections = parse(en_text if en_text.strip() else "# Changelog\n")
    existing = find_section(en_sections, version)
    if cjk_ratio > 0.08 and existing and existing[1].strip() and not CJK_RE.search(existing[1]):
        print(
            "warn: translation looks untranslated; keeping existing English section",
            file=sys.stderr,
        )
        return 0
    if cjk_ratio > 0.08 and (not existing or not existing[1].strip()):
        print(
            "warn: translation failed and no prior EN section; writing Chinese as placeholder",
            file=sys.stderr,
        )

    updated = upsert_en(en_text, heading, en_body)
    en_path.parent.mkdir(parents=True, exist_ok=True)
    en_path.write_text(updated, encoding="utf-8")
    print(f"wrote {en_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
