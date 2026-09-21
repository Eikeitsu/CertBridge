#!/system/bin/sh
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
  live=$(ensure_readable_cert_file "$live") || {
    echo "reason=live_not_found"
    return 2
  }
  echo "live=$live"
  # 诊断暂存也放模块外，避免叠层写失败误判
  diag_root="${CB_EXT_DIR:-/data/adb/certbridge}/diag_import.$$"
  errf="$diag_root.err"
  mkdir -p "$(dirname "$diag_root")" 2>/dev/null || true
  if ! import_ca_into_dir "$live" "$diag_root" "$(app_cert_label "$kind")" \
    >/dev/null 2>"$errf"; then
    rm -rf "$diag_root"
    echo "reason=import_failed"
    if [ -s "$errf" ]; then
      echo "import_err=$(tr '\n' ' ' <"$errf" | tr -d '\r')"
    fi
    rm -f "$errf"
    return 3
  fi
  rm -rf "$diag_root"
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
# - 暂存目录必须在 CB_EXT（与 sources 同盘），避免模块叠层跨设备 mv 失败
# - 先写入临时目录，校验成功后再替换，失败保留旧源
# - 指纹未变则不覆盖（避免无意义改写）
sync_source_from_app() {
  kind="$1"
  live=$(find_live_app_cert "$kind") || return 1
  live=$(ensure_readable_cert_file "$live") || return 1
  label=$(app_cert_label "$kind")
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  SOURCES_DIR="${SOURCES_DIR:-$CB_EXT_DIR/addon-sources}"
  dest="$SOURCES_DIR/$kind"
  mkdir -p "$SOURCES_DIR" "$CB_EXT_DIR" || return 1

  stage="$CB_EXT_DIR/.sync_stage.$$.$kind"
  rm -rf "$stage"
  mkdir -p "$stage" || return 1
  name=$(import_ca_into_dir "$live" "$stage" "$label") || {
    rm -rf "$stage"
    return 1
  }
  new_cert="$stage/$name"
  is_cert_filename "$name" || {
    rm -rf "$stage"
    return 1
  }

  if old=$(find_source_cert "$kind" 2>/dev/null); then
    if cert_same_fingerprint "$old" "$new_cert"; then
      rm -rf "$stage"
      log_debug "sources: $kind unchanged fingerprint, keep $(basename "$old")"
      echo "$old"
      return 0
    fi
  fi

  new_dest="$dest.new.$$"
  bak="$dest.bak.$$"
  rm -rf "$new_dest" "$bak"
  # 同盘 rename；跨设备则 cp 回退
  if ! mv "$stage" "$new_dest" 2>/dev/null; then
    mkdir -p "$new_dest" 2>/dev/null || {
      rm -rf "$stage"
      log_warn "sources: $kind stage promote failed"
      return 1
    }
    if ! cp -a "$stage"/. "$new_dest"/ 2>/dev/null; then
      rm -rf "$stage" "$new_dest"
      log_warn "sources: $kind stage promote failed"
      return 1
    fi
    rm -rf "$stage"
  fi
  # 先挪走旧目录再换入：失败则回滚，避免留下空 sources
  if [ -d "$dest" ] || [ -e "$dest" ]; then
    rm -rf "$bak"
    if ! mv "$dest" "$bak" 2>/dev/null; then
      mkdir -p "$bak" 2>/dev/null || {
        rm -rf "$new_dest"
        log_warn "sources: $kind cannot park old dest"
        return 1
      }
      if ! cp -a "$dest"/. "$bak"/ 2>/dev/null; then
        rm -rf "$new_dest" "$bak"
        log_warn "sources: $kind cannot park old dest"
        return 1
      fi
      rm -rf "$dest"
    fi
  fi
  if ! mv "$new_dest" "$dest" 2>/dev/null; then
    mkdir -p "$dest" 2>/dev/null
    if ! cp -a "$new_dest"/. "$dest"/ 2>/dev/null; then
      rm -rf "$dest"
      if [ -d "$bak" ]; then
        mv "$bak" "$dest" 2>/dev/null || {
          mkdir -p "$dest" && cp -a "$bak"/. "$dest"/ 2>/dev/null || true
        }
      fi
      rm -rf "$new_dest"
      log_error "sources: $kind dest swap failed (restored old if any)"
      return 1
    fi
    rm -rf "$new_dest"
  fi
  rm -rf "$bak"
  # 换入后必须仍有合法证书；否则立刻从 stash 恢复
  if ! find_source_cert "$kind" >/dev/null 2>&1; then
    log_error "sources: $kind empty after swap; restoring stash"
    restore_addon_source_from_stash "$kind" >/dev/null 2>&1 || true
    find_source_cert "$kind" >/dev/null 2>&1 || return 1
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
# STASH_DIR 在 cert_source_stash.sh 中定义

