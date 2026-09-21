#!/system/bin/sh
# Reqable/ProxyPin 源同步、查找、快照
#
# 工作副本与关断快照放在模块外 /data/adb/certbridge/：
# Magisk 模块树在部分机上会出现「写成功但读回空/旧」，关后再开就会「未找到证书」。

CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
MODULE_SOURCES_DIR="${MODULE_SOURCES_DIR:-$CERT_POOL/sources}"
SOURCES_DIR="${SOURCES_DIR:-$CB_EXT_DIR/addon-sources}"
STASH_DIR="${STASH_DIR:-$CB_EXT_DIR/source-stash}"
SOURCES_LEGACY="${SOURCES_LEGACY:-$STATEDIR/addon-sources}"
STASH_LEGACY="${STASH_LEGACY:-$STATEDIR/source-stash}"

# 目录内是否已有合法证书文件
_sources_dir_has_cert() {
  dir="$1"
  [ -d "$dir" ] || return 1
  for cert in "$dir"/*.*; do
    [ -f "$cert" ] || continue
    case "$cert" in *.meta) continue ;; esac
    is_cert_filename "$(basename "$cert")" && return 0
  done
  return 1
}

# 把 from_dir 里的证书拷到 to_dir（不覆盖已有同名）
_sources_copy_certs() {
  from_dir="$1"
  to_dir="$2"
  [ -d "$from_dir" ] || return 1
  mkdir -p "$to_dir" 2>/dev/null || return 1
  copied=0
  for f in "$from_dir"/*; do
    [ -e "$f" ] || continue
    case "$f" in *.meta) continue ;; esac
    [ -f "$f" ] || continue
    base=$(basename "$f")
    is_cert_filename "$base" || continue
    if [ ! -e "$to_dir/$base" ]; then
      cp -f "$f" "$to_dir/$base" 2>/dev/null || continue
      copied=1
    fi
    [ -f "$f.meta" ] && [ ! -e "$to_dir/$base.meta" ] && \
      cp -f "$f.meta" "$to_dir/$base.meta" 2>/dev/null || true
  done
  [ "$copied" = "1" ]
}

# 迁到模块外；空目录时允许重复从旧路径回填（不因 marker 短路）
certbridge_ensure_state_sources() {
  STATEDIR="${STATEDIR:-$DATADIR/state}"
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  MODULE_SOURCES_DIR="${MODULE_SOURCES_DIR:-$CERT_POOL/sources}"
  SOURCES_DIR="$CB_EXT_DIR/addon-sources"
  STASH_DIR="$CB_EXT_DIR/source-stash"
  SOURCES_LEGACY="$STATEDIR/addon-sources"
  STASH_LEGACY="$STATEDIR/source-stash"

  # 安装早期 modules_update 可能还没有 data/state；必须先建目录再写 marker
  mkdir -p "$CB_EXT_DIR" \
    "$SOURCES_DIR/reqable" "$SOURCES_DIR/proxypin" \
    "$STASH_DIR/reqable" "$STASH_DIR/proxypin" 2>/dev/null || true
  mkdir -p "$STATEDIR" 2>/dev/null || true

  for kind in reqable proxypin; do
    # stash：旧 state / 模块旁 → 外置
    if ! _sources_dir_has_cert "$STASH_DIR/$kind"; then
      _sources_copy_certs "$STASH_LEGACY/$kind" "$STASH_DIR/$kind" 2>/dev/null || true
    fi
    # sources：外置空则依次旧 state → 外置 stash → 模块 certs/sources
    if ! _sources_dir_has_cert "$SOURCES_DIR/$kind"; then
      _sources_copy_certs "$SOURCES_LEGACY/$kind" "$SOURCES_DIR/$kind" 2>/dev/null || true
    fi
    if ! _sources_dir_has_cert "$SOURCES_DIR/$kind"; then
      _sources_copy_certs "$STASH_DIR/$kind" "$SOURCES_DIR/$kind" 2>/dev/null || true
    fi
    if ! _sources_dir_has_cert "$SOURCES_DIR/$kind"; then
      _sources_copy_certs "$MODULE_SOURCES_DIR/$kind" "$SOURCES_DIR/$kind" 2>/dev/null || true
    fi
  done

  # set -e 下重定向失败会直接退出；先确认目录存在再 touch
  if [ -d "$CB_EXT_DIR" ]; then
    touch "$CB_EXT_DIR/sources.migrated" 2>/dev/null || true
  fi
  if [ -d "$STATEDIR" ]; then
    touch "$STATEDIR/addon-sources.migrated" 2>/dev/null || true
  fi
}

certbridge_ensure_state_sources

# shellcheck disable=SC1090
. "$LIBDIR/cert_source_sync.sh"
# shellcheck disable=SC1090
. "$LIBDIR/cert_source_stash.sh"
