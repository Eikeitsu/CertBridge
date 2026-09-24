#!/usr/bin/env bash
# Compute CertBridge packaging input digest (sources that affect the zip).
# Prints DIGEST=<hex> then the bare hex on the last line (for GITHUB_OUTPUT).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TMP="$(mktemp)"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

hash_tree() {
  local dir="$1"
  if [ -d "$dir" ]; then
    find "$dir" -type f | sort | xargs -r sha256sum
  else
    echo "MISSING $dir"
  fi
}

{
  echo "lock:"
  if [ -f package-lock.json ]; then
    sha256sum package-lock.json
  else
    echo "MISSING package-lock.json"
  fi

  echo "webui:"
  hash_tree webui/src
  hash_tree webui/public
  for f in webui/vite.config.ts webui/tsconfig.json webui/index.html; do
    if [ -f "$f" ]; then sha256sum "$f"; else echo "MISSING $f"; fi
  done

  echo "cbx509:"
  hash_tree tools/cbx509/src
  for f in scripts/build-cbx509.mjs scripts/build-web.mjs scripts/package-module.mjs; do
    if [ -f "$f" ]; then sha256sum "$f"; else echo "MISSING $f"; fi
  done

  echo "locales:"
  hash_tree locales

  echo "module:"
  find module \
    \( -path 'module/webroot' -o -path 'module/webroot/*' \
    -o -path 'module/bin/openssl' -o -path 'module/bin/openssl/*' \
    -o -path 'module/zygisk' -o -path 'module/zygisk/*' \
    -o -name 'libcb_zn_hide.so' -o -name 'zn_modules.txt' \) -prune -o \
    -type f -print | sort | xargs -r sha256sum

  if [ -d native/zygisk_hide ]; then
    echo "native:"
    hash_tree native/zygisk_hide
    if [ -f scripts/build-zygisk-hide.mjs ]; then
      sha256sum scripts/build-zygisk-hide.mjs
    fi
  fi
} >"$TMP"

DIGEST="$(sha256sum "$TMP" | awk '{print $1}')"
echo "DIGEST=$DIGEST"
echo "$DIGEST"
