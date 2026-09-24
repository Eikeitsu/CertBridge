#!/usr/bin/env python3
"""Sync English changelog from Chinese for a given version.

Usage:
  sync-changelog-en.py <version> [zh.md] [en.md]

Reads the ## <version> body from the Chinese changelog, machine-translates it
to English (preserving markdown structure / `code` / URLs / **bold** markers),
and upserts that section into the English changelog.

Translation rules (protect → single MT pass → restore):
  DO NOT translate (stash as-is):
    - fenced ``` blocks (skipped at line level)
    - inline `code` (incl. backticks)
    - bare URLs https?://…
    - link/image destinations (url part only)
  DO translate (markers wrapped, inner text stays in the MT blob):
    - **bold** / __bold__ inner text
    - [link text](url) label / ![alt](url) alt
    - plain prose, list/quote bodies
  Structure never sent to MT as free text:
    - list markers (-/*/1.), blockquote >

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
from collections.abc import Callable

_HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("promote_changelog", _HERE / "promote-changelog.py")
assert _spec and _spec.loader
_pc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_pc)

parse = _pc.parse
render = _pc.render
version_keys = _pc.version_keys
is_unreleased = _pc.is_unreleased

# --- Markdown segment patterns ------------------------------------------------
# Order in _protect: code → images → links → URLs → bold wraps
CODE_SPAN_RE = re.compile(r"`[^`]+`")
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
URL_RE = re.compile(r"https?://[^\s)>\]]+")
BOLD_SPAN_RE = re.compile(r"\*\*([^*]+?)\*\*")
BOLD_UNDER_RE = re.compile(r"__([^_]+?)__")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")

# Opaque tokens (ASCII); restore regexes tolerate MT-inserted spaces.
PH_FMT = "XXCBPH{0}XX"
PH_RESTORE_RE = re.compile(r"XX\s*CB\s*PH\s*(\d+)\s*XX", re.IGNORECASE)
# Bold wrap: XXCBBO{n}XX <inner> XXCBBC{n}XX  →  **inner** / __inner__
BOLD_OPEN_FMT = "XXCBBO{0}XX"
BOLD_CLOSE_FMT = "XXCBBC{0}XX"
BOLD_WRAP_RE = re.compile(
    r"XX\s*CB\s*BO\s*(\d+)\s*XX(.*?)XX\s*CB\s*BC\s*\1\s*XX",
    re.IGNORECASE | re.DOTALL,
)
# Link wrap: XXCBLO{n}XX <label> XXCBLC{n}XX  →  [label](url)
LINK_OPEN_FMT = "XXCBLO{0}XX"
LINK_CLOSE_FMT = "XXCBLC{0}XX"
LINK_WRAP_RE = re.compile(
    r"XX\s*CB\s*LO\s*(\d+)\s*XX(.*?)XX\s*CB\s*LC\s*\1\s*XX",
    re.IGNORECASE | re.DOTALL,
)
# Image wrap: XXCBIO{n}XX <alt> XXCBIC{n}XX  →  ![alt](url)
IMAGE_OPEN_FMT = "XXCBIO{0}XX"
IMAGE_CLOSE_FMT = "XXCBIC{0}XX"
IMAGE_WRAP_RE = re.compile(
    r"XX\s*CB\s*IO\s*(\d+)\s*XX(.*?)XX\s*CB\s*IC\s*\1\s*XX",
    re.IGNORECASE | re.DOTALL,
)
SPACED_BOLD_RE = re.compile(r"\*\s+\*\s*([^*\n]+?)\s*\*\s+\*")
# MT often yields ** padded ** around emphasis
PADDED_BOLD_RE = re.compile(r"\*\*\s+([^*]+?)\s+\*\*")
PADDED_BOLD_LEFT_RE = re.compile(r"\*\*\s+([^*]+?)\*\*")
PADDED_BOLD_RIGHT_RE = re.compile(r"\*\*([^*]+?)\s+\*\*")
LINE_PREFIX_RE = re.compile(r"^(\s*(?:[-*]|\d+\.|>)\s+)")


class Held:
    """Stashed markdown metadata (raw blob or wrap destination/wrapper)."""

    __slots__ = ("kind", "payload")

    def __init__(self, kind: str, payload: str) -> None:
        self.kind = kind  # raw | bold_wrap | link_url | image_url
        self.payload = payload


def _protect(text: str) -> tuple[str, list[Held]]:
    """Replace fragile spans; leave translatable inners in the stream."""
    held: list[Held] = []

    def stash_raw(m: re.Match[str]) -> str:
        held.append(Held("raw", m.group(0)))
        return PH_FMT.format(len(held) - 1)

    def stash_image(m: re.Match[str]) -> str:
        idx = len(held)
        held.append(Held("image_url", m.group(2)))
        return f"{IMAGE_OPEN_FMT.format(idx)}{m.group(1)}{IMAGE_CLOSE_FMT.format(idx)}"

    def stash_link(m: re.Match[str]) -> str:
        idx = len(held)
        held.append(Held("link_url", m.group(2)))
        return f"{LINK_OPEN_FMT.format(idx)}{m.group(1)}{LINK_CLOSE_FMT.format(idx)}"

    def stash_bold(wrapper: str) -> Callable[[re.Match[str]], str]:
        def _stash(m: re.Match[str]) -> str:
            idx = len(held)
            held.append(Held("bold_wrap", wrapper))
            return f"{BOLD_OPEN_FMT.format(idx)}{m.group(1)}{BOLD_CLOSE_FMT.format(idx)}"

        return _stash

    # code first (may sit inside bold/links), then images/links, URLs, bold wraps
    out = CODE_SPAN_RE.sub(stash_raw, text)
    out = IMAGE_RE.sub(stash_image, out)
    out = LINK_RE.sub(stash_link, out)
    out = URL_RE.sub(stash_raw, out)
    out = BOLD_SPAN_RE.sub(stash_bold("**"), out)
    out = BOLD_UNDER_RE.sub(stash_bold("__"), out)
    return out, held


def _mt_plain(text: str) -> str:
    """Machine-translate one blob (placeholders already applied)."""
    if not text.strip() or not CJK_RE.search(text):
        return text
    if os.environ.get("CHANGELOG_TRANSLATE", "1").strip().lower() in (
        "0",
        "false",
        "no",
    ):
        return text

    deepl_key = (os.environ.get("DEEPL_AUTH_KEY") or "").strip()
    if deepl_key:
        try:
            import deepl  # type: ignore

            return str(
                deepl.Translator(deepl_key)
                .translate_text(text, source_lang="ZH", target_lang="EN-US")
                .text
            )
        except Exception as exc:  # noqa: BLE001
            print(f"warn: DeepL failed ({exc}); trying Google", file=sys.stderr)

    last_err: Exception | None = None
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
                out = translator.translate(text)  # type: ignore[attr-defined]
                print(f"translate ok via {name}")
                return str(out)
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                wait = 2.0 * (attempt + 1)
                print(
                    f"warn: {name} attempt {attempt + 1} failed ({exc}); retry in {wait:.1f}s",
                    file=sys.stderr,
                )
                time.sleep(wait)

    print(
        f"warn: translate failed ({last_err}); keeping Chinese for this chunk",
        file=sys.stderr,
    )
    return text


def _restore(text: str, held: list[Held]) -> str:
    """Reassemble markdown from wrap markers + raw placeholders."""

    def bold_sub(m: re.Match[str]) -> str:
        idx = int(m.group(1))
        inner = m.group(2).strip()
        wrapper = held[idx].payload if 0 <= idx < len(held) else "**"
        return f"{wrapper}{inner}{wrapper}"

    def link_sub(m: re.Match[str]) -> str:
        idx = int(m.group(1))
        label = m.group(2).strip()
        url = held[idx].payload if 0 <= idx < len(held) else ""
        return f"[{label}]({url})"

    def image_sub(m: re.Match[str]) -> str:
        idx = int(m.group(1))
        alt = m.group(2).strip()
        url = held[idx].payload if 0 <= idx < len(held) else ""
        return f"![{alt}]({url})"

    def raw_sub(m: re.Match[str]) -> str:
        idx = int(m.group(1))
        if 0 <= idx < len(held) and held[idx].kind == "raw":
            return held[idx].payload
        return m.group(0)

    restored = text
    # Wraps first (inners already translated); raw code/URL last (may nest in wraps).
    for _ in range(3):
        prev = restored
        restored = BOLD_WRAP_RE.sub(bold_sub, restored)
        restored = LINK_WRAP_RE.sub(link_sub, restored)
        restored = IMAGE_WRAP_RE.sub(image_sub, restored)
        restored = PH_RESTORE_RE.sub(raw_sub, restored)
        for i, item in enumerate(held):
            if item.kind == "raw":
                token = PH_FMT.format(i)
                if token in restored:
                    restored = restored.replace(token, item.payload)
        if restored == prev:
            break
    return restored


def _fix_md_artifacts(text: str) -> str:
    """Repair leftover MT damage on markdown emphasis."""
    text = SPACED_BOLD_RE.sub(r"**\1**", text)
    text = PADDED_BOLD_RE.sub(r"**\1**", text)
    text = PADDED_BOLD_LEFT_RE.sub(r"**\1**", text)
    text = PADDED_BOLD_RIGHT_RE.sub(r"**\1**", text)
    return text


def _translate_text(text: str) -> str:
    """Protect → one MT call (inners included) → restore markers."""
    if not text.strip():
        return text
    if not CJK_RE.search(text):
        return text

    protected, held = _protect(text)
    outer = _mt_plain(protected) if CJK_RE.search(protected) else protected
    restored = _restore(str(outer), held)
    if PH_RESTORE_RE.search(restored) or BOLD_WRAP_RE.search(restored):
        print("warn: placeholder(s) still present after restore", file=sys.stderr)
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

        prefix_m = LINE_PREFIX_RE.match(line)
        if prefix_m:
            prefix = prefix_m.group(1)
            core = line[len(prefix) :]
            translated = _translate_text(core)
            t_lines = [t for t in translated.splitlines() if t.strip() or not core.strip()]
            if not t_lines:
                out_lines.append(line)
            elif len(t_lines) == 1:
                out_lines.append(
                    prefix + t_lines[0].lstrip() if t_lines[0].strip() else prefix.rstrip()
                )
            else:
                out_lines.append(prefix + t_lines[0].lstrip())
                out_lines.extend(t_lines[1:])
        else:
            translated = _translate_text(line)
            t_lines = [t for t in translated.splitlines() if t.strip() or not stripped]
            if len(t_lines) == 1:
                out_lines.append(t_lines[0])
            elif not t_lines:
                out_lines.append(line)
            else:
                out_lines.extend(t_lines)
        time.sleep(0.4)

    return "\n".join(out_lines).rstrip() + "\n"


def find_section(sections: list[tuple[str, str]], version: str) -> tuple[str, str] | None:
    keys = version_keys(version)
    for heading, body in sections:
        if version_keys(heading) & keys:
            return heading, body
    return None


def _cjk_ratio(text: str) -> float:
    return len(CJK_RE.findall(text)) / max(len(text), 1)


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

    en_text = (
        en_path.read_text(encoding="utf-8")
        if en_path.is_file()
        else "# Changelog\n\n## Unreleased\n\n"
    )
    _, en_sections = parse(en_text if en_text.strip() else "# Changelog\n")
    existing = find_section(en_sections, version)

    new_ratio = _cjk_ratio(en_body)
    if new_ratio > 0.08 and existing and existing[1].strip():
        old_ratio = _cjk_ratio(existing[1])
        if old_ratio < new_ratio:
            print(
                "warn: translation looks more untranslated than existing; keeping EN section",
                file=sys.stderr,
            )
            return 0
    if new_ratio > 0.08 and (not existing or not existing[1].strip()):
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
