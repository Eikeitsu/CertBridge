#!/system/bin/sh
# Reqable/ProxyPin 源同步、查找、快照
#
# 工作副本与关断快照放在模块外 /data/adb/certbridge/：
# Magisk 模块树在部分机上会出现「写成功但读回空/旧」，关后再开就会「未找到证书」。
# 热更新后开关可能仍是「开」，但字节还在旧模块树 / generation —— 必须播种到外置目录。

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

# 单文件写入外置 sources（已有则跳过）
_sources_store_one() {
  kind="$1"
  src="$2"
  display="$3"
  [ -f "$src" ] || return 1
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  SOURCES_DIR="${SOURCES_DIR:-$CB_EXT_DIR/addon-sources}"
  dest_dir="$SOURCES_DIR/$kind"
  mkdir -p "$dest_dir" 2>/dev/null || return 1
  name=$(basename "$src" | tr -d '\r')
  is_cert_filename "$name" || return 1
  [ -f "$dest_dir/$name" ] && return 0
  cp -f "$src" "$dest_dir/$name" 2>/dev/null || return 1
  chmod 0644 "$dest_dir/$name" 2>/dev/null
  if [ -n "$display" ]; then
    printf 'display_name=%s\n' "$display" >"$dest_dir/$name.meta"
  elif [ -f "$src.meta" ]; then
    cp -f "$src.meta" "$dest_dir/$name.meta" 2>/dev/null || true
  fi
  chmod 0644 "$dest_dir/$name.meta" 2>/dev/null || true
  return 0
}

# 从某模块树把 addon 证书播种到 /data/adb/certbridge（热更新关键）
certbridge_seed_ext_from_module() {
  mod="$1"
  [ -n "$mod" ] && [ -d "$mod" ] || return 1
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  SOURCES_DIR="$CB_EXT_DIR/addon-sources"
  STASH_DIR="$CB_EXT_DIR/source-stash"
  mkdir -p "$SOURCES_DIR/reqable" "$SOURCES_DIR/proxypin" \
    "$STASH_DIR/reqable" "$STASH_DIR/proxypin" 2>/dev/null || true

  for kind in reqable proxypin; do
    _sources_copy_certs "$mod/data/state/addon-sources/$kind" "$SOURCES_DIR/$kind" 2>/dev/null || true
    _sources_copy_certs "$mod/data/state/source-stash/$kind" "$STASH_DIR/$kind" 2>/dev/null || true
    _sources_copy_certs "$mod/data/state/source-stash/$kind" "$SOURCES_DIR/$kind" 2>/dev/null || true
    _sources_copy_certs "$mod/certs/sources/$kind" "$SOURCES_DIR/$kind" 2>/dev/null || true
  done

  map="$mod/data/state/applied-certs.list"
  gen="$mod/certs/generation/current/cacerts"
  [ -s "$map" ] || return 0
  while IFS='|' read -r label name _checksum display || [ -n "$label" ]; do
    label=$(printf '%s' "$label" | tr -d '\r')
    name=$(printf '%s' "$name" | tr -d '\r')
    display=$(printf '%s' "$display" | tr -d '\r')
    case "$label" in reqable|proxypin) ;; *) continue ;; esac
    [ -n "$name" ] || continue
    if [ -f "$gen/$name" ]; then
      _sources_store_one "$label" "$gen/$name" "${display:-$label}" 2>/dev/null || true
    fi
  done <"$map"
  return 0
}

# 从当前 applied / 仍挂着的系统证书库回填外置 sources（关开关前调用，不扫 App）
certbridge_seed_ext_from_live() {
  # install 配置文件阶段可能尚未加载 generation_meta
  type get_applied_name >/dev/null 2>&1 || return 1
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  SOURCES_DIR="${SOURCES_DIR:-$CB_EXT_DIR/addon-sources}"
  [ -s "${APPLIED_MAP:-}" ] || return 1
  seeded=0
  for kind in reqable proxypin; do
    _sources_dir_has_cert "$SOURCES_DIR/$kind" && continue
    name=$(get_applied_name "$kind" 2>/dev/null) || continue
    [ -n "$name" ] || continue
    display=$(get_applied_display "$kind" "$kind" 2>/dev/null)
    for dir in \
      "${GEN_CERTS:-}" \
      "${APEX_CACERTS:-/apex/com.android.conscrypt/cacerts}" \
      "${SYSTEM_CACERTS:-/system/etc/security/cacerts}" \
      "${RUNTIME_MOUNT_ROOT:-/dev/.fs0}" \
      "${RUNTIME_MOUNT_ROOT:-/dev/.fs0}/cacerts"
    do
      [ -n "$dir" ] && [ -f "$dir/$name" ] || continue
      if _sources_store_one "$kind" "$dir/$name" "$display" 2>/dev/null; then
        seeded=1
        break
      fi
    done
  done
  [ "$seeded" = "1" ]
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

  # 当前模块 + 仍在跑的旧模块（热更新交替期）
  [ -n "${MODDIR:-}" ] && certbridge_seed_ext_from_module "$MODDIR" 2>/dev/null || true
  [ -d /data/adb/modules/CertBridge ] && \
    certbridge_seed_ext_from_module /data/adb/modules/CertBridge 2>/dev/null || true
  [ -d /data/adb/modules_update/CertBridge ] && \
    certbridge_seed_ext_from_module /data/adb/modules_update/CertBridge 2>/dev/null || true

  for kind in reqable proxypin; do
    if ! _sources_dir_has_cert "$STASH_DIR/$kind"; then
      _sources_copy_certs "$STASH_LEGACY/$kind" "$STASH_DIR/$kind" 2>/dev/null || true
    fi
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

  certbridge_seed_ext_from_live 2>/dev/null || true

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
