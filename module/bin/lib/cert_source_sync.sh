# 由 common / cert_domain 加载
# App 源同步与 addon 查找
diagnose_app_cert_import() {
  kind="$1"
  if ! find_openssl >/dev/null 2>&1; then
    echo "reason=openssl_unavailable"
    return 1
  fi
  echo "openssl=$(find_openssl)"
  live=$(find_live_app_cert "$kind") || {
    echo "reason=live_not_found"
    return 2
  }
  echo "live=$live"
  errf="$DATADIR/diag_import.$$.err"
  mkdir -p "$DATADIR" 2>/dev/null
  if ! import_ca_into_dir "$live" "$DATADIR/diag_import.$$" "$(app_cert_label "$kind")" \
    >/dev/null 2>"$errf"; then
    rm -rf "$DATADIR/diag_import.$$"
    echo "reason=import_failed"
    if [ -s "$errf" ]; then
      echo "import_err=$(tr '\n' ' ' <"$errf" | tr -d '\r')"
    fi
    rm -f "$errf"
    return 3
  fi
  rm -rf "$DATADIR/diag_import.$$"
  rm -f "$errf"
  echo "reason=ok"
  return 0
}

# 比较两份证书 SHA256 指纹是否相同（任一失败视为不同）
cert_same_fingerprint() {
  a="$1"
  b="$2"
  [ -f "$a" ] && [ -f "$b" ] || return 1
  fa=$(cert_fingerprint_sha256 "$a") || return 1
  fb=$(cert_fingerprint_sha256 "$b") || return 1
  [ -n "$fa" ] && [ "$fa" = "$fb" ]
}

# 从 App 同步到 sources/<kind>/，成功打印文件路径
# - 先写入临时目录，校验成功后再替换，失败保留旧源
# - 指纹未变则不覆盖（避免无意义改写）
sync_source_from_app() {
  kind="$1"
  live=$(find_live_app_cert "$kind") || return 1
  label=$(app_cert_label "$kind")
  dest="$SOURCES_DIR/$kind"
  mkdir -p "$SOURCES_DIR" "$DATADIR" || return 1

  stage="$DATADIR/sync_stage.$$.$kind"
  rm -rf "$stage"
  mkdir -p "$stage" || return 1
  name=$(import_ca_into_dir "$live" "$stage" "$label") || {
    rm -rf "$stage"
    return 1
  }
  new_cert="$stage/$name"

  if old=$(find_source_cert "$kind" 2>/dev/null); then
    if cert_same_fingerprint "$old" "$new_cert"; then
      # 刷新显示名（App 侧可能改了 subject 展示，但指纹相同极少见；仍以旧文件为准）
      rm -rf "$stage"
      log_debug "sources: $kind unchanged fingerprint, keep $(basename "$old")"
      echo "$old"
      return 0
    fi
  fi

  new_dest="$dest.new.$$"
  rm -rf "$new_dest"
  if ! mv "$stage" "$new_dest"; then
    rm -rf "$stage" "$new_dest"
    log_warn "sources: $kind stage promote failed"
    return 1
  fi
  rm -rf "$dest"
  if ! mv "$new_dest" "$dest"; then
    # 极端情况：尽量把新目录挪回，避免空源
    mv "$new_dest" "$dest" 2>/dev/null || true
    log_error "sources: $kind dest swap failed"
    return 1
  fi
  log_info "sources: $kind updated from app ($name)"
  echo "$dest/$name"
}

find_source_cert() {
  kind="$1"
  dir="$SOURCES_DIR/$kind"
  [ -d "$dir" ] || return 1
  for cert in "$dir"/*.*; do
    [ -f "$cert" ] || continue
    case "$cert" in *.meta) continue ;; esac
    is_cert_filename "$(basename "$cert")" || continue
    echo "$cert"
    return 0
  done
  return 1
}

# addon 查找：sources →（仅 proxypin）builtin；可先尝试从 App 刷新
find_addon_cert() {
  kind="$1"
  try_live="${2:-0}"
  if [ "$try_live" = "1" ]; then
    sync_source_from_app "$kind" >/dev/null 2>&1 || true
  fi
  if path=$(find_source_cert "$kind"); then
    echo "$path"
    return 0
  fi
  if [ "$kind" = "proxypin" ]; then
    find_builtin_cert proxypin
    return $?
  fi
  return 1
}

# 生效快照里该 label 的证书文件是否仍在 generation
find_applied_gen_cert() {
  kind="$1"
  [ -s "$APPLIED_MAP" ] || return 1
  name=$(get_applied_name "$kind" 2>/dev/null)
  [ -n "$name" ] || return 1
  [ -f "$GEN_CERTS/$name" ] || return 1
  echo "$GEN_CERTS/$name"
}

# 关断后 sources 被清空时，把仍在生效的证书拷回 sources，保证可立即重开
ensure_source_from_applied() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  find_source_cert "$kind" >/dev/null 2>&1 && return 0
  src=$(find_applied_gen_cert "$kind") || return 1
  dest_dir="$SOURCES_DIR/$kind"
  mkdir -p "$dest_dir" 2>/dev/null || return 1
  name=$(basename "$src" | tr -d '\r')
  cp -f "$src" "$dest_dir/$name" 2>/dev/null || return 1
  chmod 0644 "$dest_dir/$name" 2>/dev/null
  display=$(get_applied_display "$kind" "$kind")
  printf 'display_name=%s\n' "$display" >"$dest_dir/$name.meta"
  chmod 0644 "$dest_dir/$name.meta" 2>/dev/null
  echo "$dest_dir/$name"
}

# 将当前可用 addon 证书快照到 data/state，供关后再开时恢复（App 临时不可读也不丢）
STASH_DIR="${STASH_DIR:-$STATEDIR/source-stash}"
