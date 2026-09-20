#!/usr/bin/env bash
# Plan packaging: whether this commit should wait for Build Web.
#
# Env:
#   EXPECTED_SHA (required)
#   BEFORE_SHA (optional)
#   EVENT_NAME (push|workflow_run|…)
#   GITHUB_REPOSITORY, GITHUB_TOKEN (workflow_run readiness)
#
# Prints for eval:
#   need_web=0|1
#   siblings_ready=0|1
#   run_package=0|1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

EXPECTED_SHA="${EXPECTED_SHA:?EXPECTED_SHA required}"
BEFORE_SHA="${BEFORE_SHA:-}"
EVENT_NAME="${EVENT_NAME:-push}"
OWNER_REPO="${GITHUB_REPOSITORY:-}"
TOKEN="${GITHUB_TOKEN:-}"

WEB_GLOBS=(
  'webui/'
  'module/webroot/'
  'tooling/scripts/build-web.mjs'
  'package.json'
  'package-lock.json'
  '.github/workflows/build-web.yml'
  '.github/actions/setup-node-npm/'
)

changed_files() {
  if [ -n "$BEFORE_SHA" ] && [ "$BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
    git diff --name-only "${BEFORE_SHA}...${EXPECTED_SHA}" 2>/dev/null || true
    return
  fi
  if git rev-parse --verify "${EXPECTED_SHA}^" >/dev/null 2>&1; then
    git diff --name-only "${EXPECTED_SHA}^...${EXPECTED_SHA}" 2>/dev/null || true
    return
  fi
  echo "__all__"
}

path_hit() {
  local file="$1"
  shift
  local p
  for p in "$@"; do
    case "$file" in
      "$p" | ${p}*) return 0 ;;
    esac
  done
  return 1
}

NEED_WEB=0
mapfile -t FILES < <(changed_files)
if [ "${FILES[*]}" = "__all__" ]; then
  NEED_WEB=1
else
  for f in "${FILES[@]}"; do
    [ -z "$f" ] && continue
    path_hit "$f" "${WEB_GLOBS[@]}" && NEED_WEB=1
  done
fi

echo "need_web=$NEED_WEB"

have_gh() {
  command -v gh >/dev/null 2>&1 && [ -n "$TOKEN" ] && [ -n "$OWNER_REPO" ]
}

workflow_ok() {
  local workflow="$1"
  have_gh || return 1
  local id
  id="$(
    gh run list --repo "$OWNER_REPO" --commit "$EXPECTED_SHA" \
      --workflow "$workflow" --status success --limit 1 \
      --json databaseId -q '.[0].databaseId' 2>/dev/null || true
  )"
  [ -n "$id" ] && [ "$id" != "null" ]
}

SIBLINGS_READY=1
if [ "$NEED_WEB" = "1" ]; then
  if workflow_ok "build-web.yml"; then
    echo "ready: web" >&2
  else
    # workflow_run from Build Web already implies success for that run
    if [ "$EVENT_NAME" = "workflow_run" ]; then
      echo "ready: web (triggering workflow_run)" >&2
    else
      echo "pending: web" >&2
      SIBLINGS_READY=0
    fi
  fi
fi

echo "siblings_ready=$SIBLINGS_READY"

RUN=1
case "$EVENT_NAME" in
  push)
    # 同提交改了 Web → 留给 Build Web 成功后的 workflow_run，避免双次 stamp
    if [ "$NEED_WEB" = "1" ]; then
      RUN=0
    fi
    ;;
  workflow_run)
    if [ "$SIBLINGS_READY" != "1" ]; then
      RUN=0
    fi
    ;;
  *)
    RUN=1
    ;;
esac

echo "run_package=$RUN"
