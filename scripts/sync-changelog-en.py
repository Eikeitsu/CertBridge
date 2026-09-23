#!/usr/bin/env python3
"""Sync English changelog from Chinese for a given version.

Usage:
  sync-changelog-en.py <version> [zh.md] [en.md]

Reads the ## <version> body from the Chinese changelog, machine-translates it
to English (preserving markdown structure / `code` / URLs / **bold**), and
upserts that section into the English changelog.

Env (optional):
  DEEPL_AUTH_KEY       — prefer DeepL when set
  CHANGELOG_TRANSLATE=0 — skip network; keep Chinese body
"""

from __future__ import annotations

import importlib.util
import os
import pathlib
import re
import sys
import time

_HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("promote_changelog", _HERE / "promote-changelog.py")
assert _spec and _spec.loader
_pc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_pc)

parse = _pc.parse
render = _pc.render
version_keys = _pc.version_keys
is_unreleased = _pc.is_unreleased

# Inline spans that MT engines routinely break (** → * *, `code` → mangled).
CODE_SPAN_RE = re.compile(r"`[^`]+`")
BOLD_SPAN_RE = re.compile(r"\*\*[^*]+?\*\*")
URL_RE = re.compile(r"https?://[^\s)>\]]+")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
# ASCII-only tokens; Google/DeepL almost never insert spaces inside these.
PH_FMT = "XXCBPH{0}XX"
PH_RESTORE_RE = re.compile(r"XX\s*CB\s*PH\s*(\d+)\s*XX", re.IGNORECASE)
# Common MT damage if a bold span was not protected
SPACED_BOLD_RE = re.compile(r"\*\s+\*\s*([^*\n]+?)\s*\*\s+\*")


def _protect(text: str) -> tuple[str, list[str]]:
    """Replace fragile markdown spans with opaque placeholders before MT."""
    held: list[str] = []

    def stash(m: re.Match[str]) -> str:
        held.append(m.group(0))
        return PH_FMT.format(len(held) - 1)

    # Order matters: code first (may sit inside bold), then bold, then URLs.
    out = CODE_SPAN_RE.sub(stash, text)
    out = BOLD_SPAN_RE.sub(stash, out)
    out = URL_RE.sub(stash, out)
    return out, held


def _restore(text: str, held: list[str]) -> str:
    def unstash(m: re.Match[str]) -> str:
        idx = int(m.group(1))
        return held[idx] if 0 <= idx < len(held) else m.group(0)

    return PH_RESTORE_RE.sub(unstash, text)


def _fix_md_artifacts(text: str) -> str:
    """Repair leftover MT damage on markdown emphasis."""
    return SPACED_BOLD_RE.sub(r"**\1**", text)


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

    restored = _restore(str(out), held)
    # Drop any placeholders the MT engine mangled beyond recognition
    leftover = PH_RESTORE_RE.findall(restored)
    if leftover:
        print(
            f"warn: {len(leftover)} placeholder(s) still present after restore",
            file=sys.stderr,
        )
    # Orphan tokens like XXCBPH0XX that failed the spaced regex entirely
    for i, original in enumerate(held):
        token = PH_FMT.format(i)
        if token in restored:
            restored = restored.replace(token, original)
    return _fix_md_artifacts(restored)


def translate_markdown_body(body: str) -> str:
    """Translate line-by-line for list items to keep bullet structure intact."""
    lines = body.splitlines()
    out_lines: list[str] = []
    in_fence = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            out_lines.append(line)
            continue
        if in_fence or not CJK_RE.search(line):
            out_lines.append(line)
            continue

        translated = _translate_text(line)
        # Prefer single-line output for list / quote rows
        t_lines = [t for t in translated.splitlines() if t.strip() or not stripped]
        if len(t_lines) == 1:
            out_lines.append(t_lines[0])
        elif not t_lines:
            out_lines.append(line)
        else:
            # Keep leading list/quote marker from the source when MT wraps
            prefix_m = re.match(r"^(\s*(?:[-*]|\d+\.|>)\s+)", line)
            if prefix_m and not any(
                t.lstrip().startswith(("-", "*", ">")) or re.match(r"\d+\.", t.lstrip())
                for t in t_lines
            ):
                out_lines.append(prefix_m.group(1) + t_lines[0].lstrip())
                out_lines.extend(t_lines[1:])
            else:
                out_lines.extend(t_lines)
        time.sleep(0.25)

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
    if preamble.strip().startswith("# 更新日志") or not preamble.strip().startswith("#"):
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
