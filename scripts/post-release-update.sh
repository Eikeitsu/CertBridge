#!/usr/bin/env bash
# 发版后回写主分支：changelog / update.json / module.prop / package.json / Pages zip
# 环境变量：RAW CODE TAG DEFAULT_BRANCH PAGES_BASE ZIP（可选，默认按 RAW 推导）
set -euo pipefail

RAW="${RAW:?}"
CODE="${CODE:?}"
TAG="${TAG:?}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:?}"
PAGES_BASE="${PAGES_BASE:-https://eikeitsu.github.io/CertBridge}"
ZIP="${ZIP:-CertBridge_${RAW}_arm64.zip}"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch origin "$DEFAULT_BRANCH"
git checkout -B "$DEFAULT_BRANCH" "origin/$DEFAULT_BRANCH"
git fetch --tags --force

# 唯一手写源：根目录 changelog.md（中文）。英文由发版机翻同步到 changelog/en.md
mkdir -p changelog
if [ ! -f changelog.md ]; then
  printf '%s\n' '# 更新日志' '' '## Unreleased' '' >changelog.md
fi
if [ ! -f changelog/en.md ]; then
  printf '%s\n' '# Changelog' '' '## Unreleased' '' >changelog/en.md
fi

python3 scripts/promote-changelog.py "$RAW" changelog.md
cp changelog.md changelog/zh-CN.md

# 机翻本版中文条目 → 英文 changelog（可选 DEEPL_AUTH_KEY；默认 Google 免 key）
python3 scripts/sync-changelog-en.py "$RAW" changelog.md changelog/en.md

if grep -Fxq "## ${RAW}" changelog.md 2>/dev/null; then
  echo "changelog.md 已有 ${RAW}（含手写 Unreleased 提升），不再用 git log 覆盖"
  : >.release-notes.md
else
  PREV_TAG="$(git tag --sort=-v:refname | grep -Fxv "$TAG" | head -n 1 || true)"
  if [ -n "$PREV_TAG" ]; then
    RANGE="${PREV_TAG}..${TAG}"
  else
    RANGE="${TAG}"
  fi
  git log --pretty=format:'- %s' --no-merges "$RANGE" >.release-notes.md
  if [ ! -s .release-notes.md ]; then
    echo "- 发布 ${TAG}" >.release-notes.md
  fi
fi

RAW="$RAW" CODE="$CODE" ZIP="$ZIP" PAGES_BASE="$PAGES_BASE" python3 - <<'PY'
import json, os, pathlib

notes = pathlib.Path(".release-notes.md").read_text(encoding="utf-8").strip()
raw = os.environ["RAW"]
code = int(os.environ["CODE"])
zip_name = os.environ["ZIP"]
pages = os.environ["PAGES_BASE"]
data = {
    "version": raw,
    "versionCode": code,
    "zipUrl": f"{pages}/releases/{zip_name}",
    # Magisk 单 URL → docs/public/changelog.md（中英并列）
    "changelog": f"{pages}/changelog.md",
}
text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
pathlib.Path("update.json").write_text(text, encoding="utf-8")
pathlib.Path("docs/public").mkdir(parents=True, exist_ok=True)
pathlib.Path("docs/public/update.json").write_text(text, encoding="utf-8")

def inject_notes(path: pathlib.Path, section: str) -> None:
    changelog = path.read_text(encoding="utf-8") if path.exists() else ""
    if changelog.startswith("# Changelog") or changelog.startswith("# 更新日志"):
        header, _, rest = changelog.partition("\n")
        rest = rest.lstrip("\n").rstrip() + ("\n" if rest.strip() else "")
        changelog = header + "\n\n" + section + ("\n\n" + rest if rest.strip() else "\n")
    else:
        changelog = section + ("\n\n" + changelog.rstrip() + "\n" if changelog.strip() else "\n")
    path.write_text(changelog.rstrip() + "\n", encoding="utf-8")

# 仅当中文侧仍缺本版（Unreleased 空、靠 git log 补）时才注入；英文再机翻一次
if notes:
    section = f"## {raw}\n\n{notes}"
    inject_notes(pathlib.Path("changelog.md"), section)
    pathlib.Path("changelog/zh-CN.md").write_text(
        pathlib.Path("changelog.md").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
print(text)
PY
rm -f .release-notes.md

# git-log 补丁只进了中文时，再同步英文
python3 scripts/sync-changelog-en.py "$RAW" changelog.md changelog/en.md
cp changelog.md changelog/zh-CN.md

PROP="module/module.prop"
sed -i "s/^version=.*/version=${RAW}/" "$PROP"
sed -i "s/^versionCode=.*/versionCode=${CODE}/" "$PROP"
if ! grep -q '^updateJson=' "$PROP"; then
  echo "updateJson=${PAGES_BASE}/update.json" >>"$PROP"
else
  sed -i "s|^updateJson=.*|updateJson=${PAGES_BASE}/update.json|" "$PROP"
fi

NPM_VERSION="${RAW#v}"
npm version "$NPM_VERSION" --no-git-tag-version --allow-same-version

mkdir -p docs/public/releases docs/guide docs/en/guide
RELEASE_DIR="${RELEASE_DIR:-.build/release}"
if [ ! -f "${RELEASE_DIR}/${ZIP}" ] && [ -f "release/${ZIP}" ]; then
  RELEASE_DIR=release
fi
if [ ! -f "${RELEASE_DIR}/${ZIP}" ]; then
  echo "missing ${RELEASE_DIR}/${ZIP}" >&2
  ls -la "${RELEASE_DIR}" >&2 || ls -la release/ >&2 || ls -la .build/release/ >&2 || true
  exit 1
fi
find docs/public/releases -maxdepth 1 -type f -name '*.zip' ! -name "${ZIP}" -print -delete || true
cp "${RELEASE_DIR}/${ZIP}" "docs/public/releases/${ZIP}"

python3 scripts/promote-changelog.py --export-docs changelog.md \
  docs/guide/changelog.md
python3 scripts/promote-changelog.py --export-docs changelog/en.md \
  docs/en/guide/changelog.md
python3 scripts/promote-changelog.py --export-bilingual changelog.md changelog/en.md \
  docs/public/changelog.md
cp changelog.md changelog/zh-CN.md

# 机翻/导出的 md 先 format，避免后续 Lint 工作流因空行/列表规则失败
# （生成文件已在 markdownlint/prettier ignore 中；根 changelog.md 仍需干净）
if command -v npx >/dev/null 2>&1; then
  npx prettier --write \
    changelog.md changelog/en.md changelog/zh-CN.md \
    docs/guide/changelog.md docs/en/guide/changelog.md docs/public/changelog.md \
    >/dev/null || true
  npx markdownlint-cli2 --fix \
    changelog.md \
    >/dev/null || true
fi

git add update.json docs/public/update.json docs/public/changelog.md \
  docs/guide/changelog.md docs/en/guide/changelog.md \
  module/module.prop package.json package-lock.json \
  changelog.md changelog/zh-CN.md changelog/en.md
git add -A -- docs/public/releases
if git diff --cached --quiet; then
  echo "No changes to commit"
  exit 0
fi
# CI 里 husky 通常会跳过；显式关闭以免 pre-commit 再跑 lint:py 等
HUSKY=0 git commit -m "chore: bump update.json to ${TAG} (versionCode ${CODE})"
HUSKY=0 git push origin "HEAD:${DEFAULT_BRANCH}"
gh workflow run build-docs.yml --ref "$DEFAULT_BRANCH"
