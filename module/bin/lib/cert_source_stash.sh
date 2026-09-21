#!/system/bin/sh
# 由 common / cert_domain 加载
# addon 快照、可启用判断与批量同步
#
# 不变量（关/开不能互斥）：
# - conf 开关与证书字节分离；关断绝不删除 sources / stash
# - stash 是 STATEDIR 持久备份；sources 是工作副本
# - 开启：有 sources / stash / applied / builtin 即可；App 同步只是可选刷新

STASH_DIR="${STASH_DIR:-$STATEDIR/source-stash}"

stash_has_cert() {
  kind="$1"
  [ -d "$STASH_DIR/$kind" ] || return 1
  for cert in "$STASH_DIR/$kind"/*.*; do
    [ -f "$cert" ] || continue
    case "$cert" in *.meta) continue ;; esac
    is_cert_filename "$(basename "$cert")" && return 0
  done
  return 1
}

# 把单个证书文件原子写入 stash/<kind>/（保留旧快照直到新文件就位）
_stash_store_file() {
  kind="$1"
  src="$2"
  [ -f "$src" ] || return 1
  dest_dir="$STASH_DIR/$kind"
  mkdir -p "$dest_dir" 2>/dev/null || return 1
  name=$(basename "$src" | tr -d '\r')
  is_cert_filename "$name" || return 1
  stage="$dest_dir/.stage.$$"
  rm -rf "$stage"
  mkdir -p "$stage" 2>/dev/null || return 1
  cp -f "$src" "$stage/$name" 2>/dev/null || {
    rm -rf "$stage"
    return 1
  }
  chmod 0644 "$stage/$name" 2>/dev/null
  if [ -f "$src.meta" ]; then
    cp -f "$src.meta" "$stage/$name.meta" 2>/dev/null || true
  elif [ -f "${src}.meta" ]; then
    cp -f "${src}.meta" "$stage/$name.meta" 2>/dev/null || true
  fi
  # 新文件就位后再删其它旧证；失败则丢弃 stage，旧快照原样保留
  if ! mv -f "$stage/$name" "$dest_dir/$name" 2>/dev/null; then
    if ! cp -f "$stage/$name" "$dest_dir/$name" 2>/dev/null; then
      rm -rf "$stage"
      return 1
    fi
  fi
  if [ -f "$stage/$name.meta" ]; then
    mv -f "$stage/$name.meta" "$dest_dir/$name.meta" 2>/dev/null || \
      cp -f "$stage/$name.meta" "$dest_dir/$name.meta" 2>/dev/null || true
  fi
  rm -rf "$stage"
  for old in "$dest_dir"/*.*; do
    [ -f "$old" ] || continue
    case "$old" in
      */"$name"|*/"$name".meta) continue ;;
      *.meta) continue ;;
    esac
    # 只清其它证书文件，保留刚写入的
    is_cert_filename "$(basename "$old")" || continue
    rm -f "$old" "$old.meta" 2>/dev/null
  done
  return 0
}

# 仅从 sources 快照（纯本地 cp，供关断热路径，绝不扫 App）
stash_addon_from_sources() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  src=$(find_source_cert "$kind" 2>/dev/null) || return 1
  _stash_store_file "$kind" "$src"
}

# 完整快照：sources → addon/builtin → 生效集
stash_addon_source() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  src=$(find_source_cert "$kind" 2>/dev/null) || \
    src=$(find_addon_cert "$kind" 0 2>/dev/null) || \
    src=$(find_applied_gen_cert "$kind" 2>/dev/null) || return 1
  _stash_store_file "$kind" "$src"
}

restore_addon_source_from_stash() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  find_source_cert "$kind" >/dev/null 2>&1 && return 0
  stash_has_cert "$kind" || return 1
  stash="$STASH_DIR/$kind"
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

# 开启前凑齐本地工作副本（不碰 App）
prepare_addon_local() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  find_source_cert "$kind" >/dev/null 2>&1 && return 0
  restore_addon_source_from_stash "$kind" >/dev/null 2>&1 && return 0
  ensure_source_from_applied "$kind" >/dev/null 2>&1 && return 0
  # proxypin 可走 builtin；reqable 无 builtin
  find_addon_cert "$kind" 0 >/dev/null 2>&1 && return 0
  return 1
}

# 是否允许开启：sources / builtin / 仍在生效 / generation 残留 / 关断前快照
addon_can_enable() {
  kind="$1"
  find_addon_cert "$kind" 0 >/dev/null 2>&1 && return 0
  is_addon_applied "$kind" && return 0
  find_applied_gen_cert "$kind" >/dev/null 2>&1 && return 0
  stash_has_cert "$kind" && return 0
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
