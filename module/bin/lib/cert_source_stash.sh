# 由 common / cert_domain 加载
# addon 快照、可启用判断与批量同步
stash_addon_source() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  src=$(find_addon_cert "$kind" 0 2>/dev/null) || src=$(find_applied_gen_cert "$kind" 2>/dev/null) || return 1
  [ -f "$src" ] || return 1
  dest_dir="$STASH_DIR/$kind"
  mkdir -p "$dest_dir" 2>/dev/null || return 1
  # 清空旧快照，只留一份
  rm -f "$dest_dir"/* 2>/dev/null
  name=$(basename "$src" | tr -d '\r')
  cp -f "$src" "$dest_dir/$name" 2>/dev/null || return 1
  chmod 0644 "$dest_dir/$name" 2>/dev/null
  if [ -f "$src.meta" ]; then
    cp -f "$src.meta" "$dest_dir/$name.meta" 2>/dev/null || true
  fi
  return 0
}

restore_addon_source_from_stash() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  find_source_cert "$kind" >/dev/null 2>&1 && return 0
  stash="$STASH_DIR/$kind"
  [ -d "$stash" ] || return 1
  src=""
  for cert in "$stash"/*.*; do
    [ -f "$cert" ] || continue
    case "$cert" in *.meta) continue ;; esac
    is_cert_filename "$(basename "$cert")" || continue
    src="$cert"
    break
  done
  [ -n "$src" ] || return 1
  dest_dir="$SOURCES_DIR/$kind"
  mkdir -p "$dest_dir" 2>/dev/null || return 1
  name=$(basename "$src")
  cp -f "$src" "$dest_dir/$name" 2>/dev/null || return 1
  chmod 0644 "$dest_dir/$name" 2>/dev/null
  if [ -f "$src.meta" ]; then
    cp -f "$src.meta" "$dest_dir/$name.meta" 2>/dev/null || true
  fi
  echo "$dest_dir/$name"
}

# 是否允许开启：sources / builtin / 仍在生效 / generation 残留 / 关断前快照
addon_can_enable() {
  kind="$1"
  find_addon_cert "$kind" 0 >/dev/null 2>&1 && return 0
  is_addon_applied "$kind" && return 0
  find_applied_gen_cert "$kind" >/dev/null 2>&1 && return 0
  [ -d "$STASH_DIR/$kind" ] || return 1
  for cert in "$STASH_DIR/$kind"/*.*; do
    [ -f "$cert" ] || continue
    case "$cert" in *.meta) continue ;; esac
    is_cert_filename "$(basename "$cert")" && return 0
  done
  return 1
}

resolve_addon_file_for_label() {
  label="$1"
  case "$label" in
    reqable|proxypin)
      find_addon_cert "$label" 0
      ;;
    custom:*)
      name=${label#custom:}
      [ -f "$CUSTOM_DIR/$name" ] && echo "$CUSTOM_DIR/$name" && return 0
      return 1
      ;;
    *)
      return 1
      ;;
  esac
}

# 同步已启用的抓包 App 证书源；供 WebUI 刷新
# 输出：ok / updated / kept / miss 计数与各 kind 结果
sync_enabled_app_sources() {
  updated=0
  kept=0
  miss=0
  for kind in reqable proxypin; do
    if ! is_enabled "$kind"; then
      echo "${kind}=off"
      continue
    fi
    old=""
    old_fp=""
    if old=$(find_source_cert "$kind" 2>/dev/null); then
      old_fp=$(cert_fingerprint_sha256 "$old" 2>/dev/null || true)
    fi
    if ! path=$(sync_source_from_app "$kind" 2>/dev/null); then
      if [ -n "$old" ]; then
        echo "${kind}=keep"
        kept=$((kept + 1))
      else
        echo "${kind}=miss"
        miss=$((miss + 1))
      fi
      continue
    fi
    new_fp=$(cert_fingerprint_sha256 "$path" 2>/dev/null || true)
    if [ -n "$old_fp" ] && [ -n "$new_fp" ] && [ "$old_fp" = "$new_fp" ]; then
      echo "${kind}=unchanged"
      kept=$((kept + 1))
    else
      echo "${kind}=updated"
      updated=$((updated + 1))
    fi
  done
  echo "ok=1"
  echo "updated=$updated"
  echo "kept=$kept"
  echo "miss=$miss"
}

# 自定义区：若检测到可选抓包 App / 导出路径的现场 CA，指纹未见则导入
# 供 WebUI 刷新；与 Reqable/ProxyPin 源同步独立
