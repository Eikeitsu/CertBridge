#!/system/bin/sh
# Reqable/ProxyPin 源同步、查找、快照
#
# 工作副本固定在 STATEDIR/addon-sources（随 data 热更新保留，可写），
# 不再依赖模块目录 certs/sources（易被热更新清空 / 写回失败）。

MODULE_SOURCES_DIR="${MODULE_SOURCES_DIR:-$CERT_POOL/sources}"
SOURCES_DIR="${SOURCES_DIR:-$STATEDIR/addon-sources}"

# 一次性把旧模块目录 sources / stash 迁到 state
certbridge_ensure_state_sources() {
  STATEDIR="${STATEDIR:-$DATADIR/state}"
  MODULE_SOURCES_DIR="${MODULE_SOURCES_DIR:-$CERT_POOL/sources}"
  SOURCES_DIR="$STATEDIR/addon-sources"
  STASH_DIR="${STASH_DIR:-$STATEDIR/source-stash}"
  mkdir -p "$SOURCES_DIR/reqable" "$SOURCES_DIR/proxypin" 2>/dev/null || true
  [ -f "$STATEDIR/addon-sources.migrated" ] && return 0
  for kind in reqable proxypin; do
    if [ -d "$MODULE_SOURCES_DIR/$kind" ]; then
      mkdir -p "$SOURCES_DIR/$kind" 2>/dev/null || true
      for f in "$MODULE_SOURCES_DIR/$kind"/*; do
        [ -e "$f" ] || continue
        base=$(basename "$f")
        [ -e "$SOURCES_DIR/$kind/$base" ] && continue
        cp -f "$f" "$SOURCES_DIR/$kind/$base" 2>/dev/null || true
      done
    fi
    # stash → sources（sources 仍空时）
    _has=0
    for _f in "$SOURCES_DIR/$kind"/*.*; do
      [ -f "$_f" ] || continue
      case "$_f" in *.meta) continue ;; esac
      _has=1
      break
    done
    if [ "$_has" = "0" ] && [ -d "$STASH_DIR/$kind" ]; then
      mkdir -p "$SOURCES_DIR/$kind" 2>/dev/null || true
      for f in "$STASH_DIR/$kind"/*; do
        [ -e "$f" ] || continue
        case "$f" in *.meta) continue ;; esac
        base=$(basename "$f")
        cp -f "$f" "$SOURCES_DIR/$kind/$base" 2>/dev/null || true
        [ -f "$f.meta" ] && cp -f "$f.meta" "$SOURCES_DIR/$kind/$base.meta" 2>/dev/null || true
      done
    fi
  done
  : >"$STATEDIR/addon-sources.migrated" 2>/dev/null || true
}

certbridge_ensure_state_sources

# shellcheck disable=SC1090
. "$LIBDIR/cert_source_sync.sh"
# shellcheck disable=SC1090
. "$LIBDIR/cert_source_stash.sh"
