#!/usr/bin/env bash
# Promote CI zips from ci-dist: download, rewrite module.prop version, re-zip.
#
# Env:
#   GITHUB_REPOSITORY (or OWNER_REPO)
#   PROMOTE_SHA (optional; logged only)
#   RAW / CODE — target version + versionCode (required)
#   UPDATE_JSON (optional; default Pages update.json)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

OWNER_REPO="${GITHUB_REPOSITORY:-${OWNER_REPO:-Eikeitsu/CertBridge}}"
RAW="${RAW:?RAW required}"
CODE="${CODE:?CODE required}"
UPDATE_JSON="${UPDATE_JSON:-https://eikeitsu.github.io/CertBridge/update.json}"
CI_BASE="${CI_ZIP_URL_BASE:-https://raw.githubusercontent.com/${OWNER_REPO}/ci-dist}"

mkdir -p release
STAGE="$(mktemp -d)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

restamp_zip_file() {
  local src_zip="$1" out_name="$2"
  local unpack="$STAGE/unpack-$(basename "$out_name" .zip)"
  rm -rf "$unpack"
  mkdir -p "$unpack"
  python3 - "$src_zip" "$unpack" <<'PY'
import sys, zipfile
zf = zipfile.ZipFile(sys.argv[1])
zf.extractall(sys.argv[2])
PY
  local prop="$unpack/module.prop"
  [ -f "$prop" ] || {
    echo "missing module.prop in $src_zip" >&2
    exit 1
  }
  sed -i "s/^version=.*/version=${RAW}/" "$prop"
  sed -i "s/^versionCode=.*/versionCode=${CODE}/" "$prop"
  if grep -q '^updateJson=' "$prop"; then
    sed -i "s|^updateJson=.*|updateJson=${UPDATE_JSON}|" "$prop"
  else
    echo "updateJson=${UPDATE_JSON}" >>"$prop"
  fi
  python3 - "$unpack" "release/${out_name}" <<'PY'
import sys, zipfile
from pathlib import Path
root = Path(sys.argv[1])
out = Path(sys.argv[2])
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for p in sorted(root.rglob("*")):
        if p.is_file():
            zf.write(p, p.relative_to(root).as_posix())
print("wrote", out)
PY
}

echo "promote: fetch arm64 from ci-dist → CertBridge_${RAW}_arm64.zip"
# 优先带架构名；兼容历史 tip 上的无后缀 CertBridge.zip
if curl -fsSL -o "$STAGE/CertBridge_arm64.zip" "${CI_BASE}/CertBridge_arm64.zip"; then
  restamp_zip_file "$STAGE/CertBridge_arm64.zip" "CertBridge_${RAW}_arm64.zip"
elif curl -fsSL -o "$STAGE/CertBridge.zip" "${CI_BASE}/CertBridge.zip"; then
  echo "promote: fallback legacy CertBridge.zip"
  restamp_zip_file "$STAGE/CertBridge.zip" "CertBridge_${RAW}_arm64.zip"
else
  echo "promote: missing CertBridge_arm64.zip (and legacy CertBridge.zip) on ci-dist" >&2
  exit 1
fi

promote_optional() {
  local remote="$1" out="$2"
  if curl -fsSL -o "$STAGE/$remote" "${CI_BASE}/$remote"; then
    restamp_zip_file "$STAGE/$remote" "$out"
  else
    echo "warn: no $remote on ci-dist tip — skip" >&2
  fi
}

promote_optional CertBridge_arm32.zip "CertBridge_${RAW}_arm32.zip"
# 晋升时兼容旧 tip 上的 CertBridge_arm.zip
if [ ! -f "release/CertBridge_${RAW}_arm32.zip" ]; then
  promote_optional CertBridge_arm.zip "CertBridge_${RAW}_arm32.zip"
fi
promote_optional CertBridge_x86.zip "CertBridge_${RAW}_x86.zip"
promote_optional CertBridge_x64.zip "CertBridge_${RAW}_x64.zip"
promote_optional CertBridge_lite.zip "CertBridge_${RAW}_lite.zip"

ls -la release/CertBridge_*.zip
echo "promote done RAW=$RAW CODE=$CODE SHA=${PROMOTE_SHA:-tip}"
