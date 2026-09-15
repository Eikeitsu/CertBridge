#!/usr/bin/env bash
# Publish CertBridge CI artifacts + update.json onto the ci-dist branch.
#
# Early-CI layout (json and zips on the same branch tip):
#   update.json
#   CertBridge.zip
#   CertBridge_lite.zip
#   changelog.md          (optional short notes)
#   SOURCE_SHA
#   INPUT_DIGEST          (optional)
#   README.md
#
# Env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA
# Optional: INPUT_DIGEST, CI_ZIP_URL_BASE (default: raw.githubusercontent.com/.../ci-dist)
#
# Inputs: release/CertBridge_*.zip (after stamp + package), module/module.prop
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

OWNER_REPO="${GITHUB_REPOSITORY:-Eikeitsu/CertBridge}"
SHA="${GITHUB_SHA:-unknown}"
TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN required}"
LABEL="${1:-ci}"

ZIP_BASE="${CI_ZIP_URL_BASE:-https://raw.githubusercontent.com/${OWNER_REPO}/ci-dist}"
CHANGELOG_URL="${CI_CHANGELOG_URL:-https://raw.githubusercontent.com/${OWNER_REPO}/ci-dist/changelog.md}"

STAGE="$(mktemp -d)"
OLD="$(mktemp -d)"
cleanup() { rm -rf "$STAGE" "$OLD"; }
trap cleanup EXIT

chmod +x tooling/scripts/git-push-tree.sh

if git clone --depth 1 --branch ci-dist \
  "https://x-access-token:${TOKEN}@github.com/${OWNER_REPO}.git" "$OLD" 2>/dev/null; then
  cp -a "$OLD"/. "$STAGE"/ 2>/dev/null || true
  rm -rf "$STAGE/.git"
fi

pick_zip() {
  local pattern="$1" dest="$2"
  local src=""
  shopt -s nullglob
  for z in release/$pattern; do
    src="$z"
  done
  shopt -u nullglob
  if [ -z "$src" ] || [ ! -f "$src" ]; then
    echo "missing zip matching release/$pattern" >&2
    exit 1
  fi
  cp "$src" "$STAGE/$dest"
  echo "ci-dist: $dest ← $src"
}

# Prefer stamped names; fall back to any CertBridge_*.zip / *_lite.zip
if ls release/CertBridge_*_lite.zip >/dev/null 2>&1; then
  pick_zip "CertBridge_*_lite.zip" CertBridge_lite.zip
else
  echo "warn: no lite zip; skipping CertBridge_lite.zip" >&2
fi

# Full zip: any CertBridge_*.zip that is not lite
FULL_SRC=""
shopt -s nullglob
for z in release/CertBridge_*.zip; do
  case "$z" in
    *_lite.zip) continue ;;
    *) FULL_SRC="$z" ;;
  esac
done
shopt -u nullglob
if [ -z "$FULL_SRC" ] || [ ! -f "$FULL_SRC" ]; then
  echo "missing full release/CertBridge_*.zip" >&2
  exit 1
fi
cp "$FULL_SRC" "$STAGE/CertBridge.zip"
echo "ci-dist: CertBridge.zip ← $FULL_SRC"

PROP="module/module.prop"
VERSION="$(sed -n 's/^version=//p' "$PROP" | head -n1 | tr -d '\r')"
CODE="$(sed -n 's/^versionCode=//p' "$PROP" | head -n1 | tr -d '\r')"
if [ -z "$VERSION" ] || [ -z "$CODE" ]; then
  echo "module.prop missing version/versionCode" >&2
  exit 1
fi

python3 - "$STAGE/update.json" "$VERSION" "$CODE" "$ZIP_BASE" "$CHANGELOG_URL" <<'PY'
import json, sys
path, version, code, zip_base, changelog = sys.argv[1:6]
data = {
    "version": version if version.startswith("v") or ".ci." in version else f"v{version}",
    "versionCode": int(code),
    "zipUrl": f"{zip_base.rstrip('/')}/CertBridge.zip",
    "changelog": changelog,
}
# Keep display version as stamped (may be 2.3.0.ci.N without leading v)
data["version"] = version
pathlib_write = path
with open(pathlib_write, "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("ci-dist: update.json", data["version"], data["versionCode"])
PY

printf '%s\n' "$SHA" >"$STAGE/SOURCE_SHA"
if [ -n "${INPUT_DIGEST:-}" ]; then
  printf '%s\n' "$INPUT_DIGEST" >"$STAGE/INPUT_DIGEST"
fi

# Short changelog excerpt for the channel (Unreleased bullets if present)
if [ -f changelog.md ]; then
  python3 - "$STAGE/changelog.md" <<'PY'
from pathlib import Path
import sys
src = Path("changelog.md").read_text(encoding="utf-8")
out = Path(sys.argv[1])
lines = src.splitlines()
chunk = []
in_un = False
for line in lines:
    if line.startswith("## Unreleased"):
        in_un = True
        chunk.append("# CertBridge CI")
        chunk.append("")
        continue
    if in_un and line.startswith("## "):
        break
    if in_un:
        chunk.append(line)
if len(chunk) <= 2:
    chunk = ["# CertBridge CI", "", "See repository changelog for details.", ""]
out.write_text("\n".join(chunk).rstrip() + "\n", encoding="utf-8")
print("ci-dist: changelog.md")
PY
fi

cat >"$STAGE/README.md" <<EOF
# ci-dist

CertBridge **CI channel**: update manifest and module zips on the **same** branch tip.

| Path | Contents |
|------|----------|
| \`update.json\` | Magisk-compatible update check |
| \`CertBridge.zip\` | Full module (latest CI) |
| \`CertBridge_lite.zip\` | Lite module (when built) |
| \`changelog.md\` | Short CI notes |

Stable / release channel remains GitHub Pages (\`update.json\` + \`releases/\`).

Last: ${LABEL} @ ${SHA}
EOF

tooling/scripts/git-push-tree.sh ci-dist "$STAGE" \
  "ci-dist: ${LABEL} ${VERSION} (${SHA:0:7})"
echo "published ci-dist ${VERSION} code=${CODE}"
