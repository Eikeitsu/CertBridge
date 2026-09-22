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

# Dual sources: changelog/zh-CN.md (canonical CN) + changelog/en.md; root changelog.md mirrors zh
mkdir -p changelog
if [ ! -f changelog/zh-CN.md ] && [ -f changelog.md ]; then
  cp changelog.md changelog/zh-CN.md
fi
if [ ! -f changelog/en.md ]; then
  printf '%s\n' '# Changelog' '' '## Unreleased' '' >changelog/en.md
fi

python3 scripts/promote-changelog.py "$RAW" changelog/zh-CN.md
python3 scripts/promote-changelog.py "$RAW" changelog/en.md
cp changelog/zh-CN.md changelog.md

if grep -Fxq "## ${RAW}" changelog/zh-CN.md 2>/dev/null; then
  echo "changelog/zh-CN.md 已有 ${RAW}（含手写 Unreleased 提升），不再用 git log 覆盖"
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
    # Magisk updateJson keeps Chinese changelog URL for existing clients
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

if notes:
    section = f"## {raw}\n\n{notes}"
    inject_notes(pathlib.Path("changelog/zh-CN.md"), section)
    # English fallback notes stay short if only Chinese git subjects
    inject_notes(pathlib.Path("changelog/en.md"), section)
    pathlib.Path("changelog.md").write_text(
        pathlib.Path("changelog/zh-CN.md").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
print(text)
PY
rm -f .release-notes.md

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
# Pages 只保留本次 zip，避免历史包堆在仓库里
find docs/public/releases -maxdepth 1 -type f -name '*.zip' ! -name "${ZIP}" -print -delete || true
cp "${RELEASE_DIR}/${ZIP}" "docs/public/releases/${ZIP}"

python3 scripts/promote-changelog.py --export-docs changelog/zh-CN.md \
  docs/public/changelog.md docs/guide/changelog.md
python3 scripts/promote-changelog.py --export-docs changelog/en.md \
  docs/en/guide/changelog.md

git add update.json docs/public/update.json docs/public/changelog.md \
  docs/guide/changelog.md docs/en/guide/changelog.md \
  module/module.prop package.json package-lock.json \
  changelog.md changelog/zh-CN.md changelog/en.md
git add -A -- docs/public/releases
if git diff --cached --quiet; then
  echo "No changes to commit"
  exit 0
fi
git commit -m "chore: bump update.json to ${TAG} (versionCode ${CODE})"
# Bot 回写元数据，不跑本地 husky（CI=true 时 lint:py 会强制要 ruff，post 任务未装全量 lint 工具链）
HUSKY=0 git push origin "HEAD:${DEFAULT_BRANCH}"
# GITHUB_TOKEN 推送不会触发其它工作流，需显式拉起文档构建
gh workflow run build-docs.yml --ref "$DEFAULT_BRANCH"
