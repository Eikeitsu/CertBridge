#!/system/bin/sh
# Hide assist: clear / unpersist
# 挂载隐藏协助（可选组件）
# try_umount 登记与注入后回调

hide_clear_applied() {
  # 尽量当场从内核 umount 列表删掉本模块路径（ksud del）；失败则仍清文件侧
  hide_unregister_kernel_try_umount_all 2>/dev/null || true
  hide_unpersist_all_try_umount
  hide_nohello_unpersist_all
  rm -f "$HIDE_STATE_FILE" 2>/dev/null
}

hide_probe_cache_clear() {
  rm -f "$HIDE_PROBE_CACHE" 2>/dev/null
}

# 结果按 boot 缓存；失败不缓存，避免 post-fs 过早探测失败后整轮开机不再登记

# 从内核 try_umount 列表删除单路径（KSU-Next：ksud kernel umount del）
hide_try_ksud_umount_del() {
  target="$1"
  [ -n "$target" ] || return 1
  case "$target" in
    */) target=${target%/} ;;
  esac
  [ -x /data/adb/ksu/bin/ksud ] || return 1
  /data/adb/ksu/bin/ksud kernel umount del "$target" >/dev/null 2>&1
}

# 关闭 hide_allow 时：对已知 cacerts 路径做内核 del（不 wipe 全表，避免误伤其它模块）

# 关闭 hide_allow 时：对已知 cacerts 路径做内核 del（不 wipe 全表，避免误伤其它模块）
hide_unregister_kernel_try_umount_all() {
  seen="|"
  for target in $(list_target_stores 2>/dev/null); do
    [ -n "$target" ] || continue
    case "$seen" in *"|$target|"*) continue ;; esac
    seen="$seen$target|"
    if hide_try_ksud_umount_del "$target"; then
      log_info "hide: ksud umount del ($target)"
    fi
    # 旧 SuSFS CLI（若仍支持）；无则忽略
    if hide_susfs_bin_present 2>/dev/null; then
      "$SUSFS_BIN" del_try_umount "$target" >/dev/null 2>&1 || \
        "$SUSFS_BIN" remove_try_umount "$target" >/dev/null 2>&1 || true
    fi
  done
  # try_umount.txt 里可能还有历史路径
  if [ -f "$SUSFS_TRY_UMOUNT_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
      case "$line" in
        ''|'#'*) continue ;;
      esac
      case "$line" in
        */cacerts|*/cacerts/) ;;
        *) continue ;;
      esac
      case "$seen" in *"|$line|"*) continue ;; esac
      seen="$seen$line|"
      hide_try_ksud_umount_del "$line" 2>/dev/null || true
    done <"$SUSFS_TRY_UMOUNT_FILE"
  fi
}

# 从 mountinfo 收集 cacerts 上实际存在的挂载点（比 list_target_stores 更贴近内核所见）

# 从 umount 文件去掉本模块托管块，保留用户其它规则
hide_nohello_strip_managed() {
  src="$1"
  dest="$2"
  [ -f "$src" ] || {
    : >"$dest"
    return 0
  }
  awk -v begin="$NOHELLO_BEGIN_MARK" -v end="$NOHELLO_END_MARK" '
    $0 == begin { skip=1; next }
    $0 == end { skip=0; next }
    !skip { print }
  ' "$src" >"$dest" 2>/dev/null || cp -f "$src" "$dest" 2>/dev/null
}

# 读取托管块内已有 point 路径

hide_nohello_unpersist() {
  target="$1"
  [ -n "$target" ] || return 0
  [ -f "$NOHELLO_UMOUNT_FILE" ] || return 0
  case "$target" in
    */) target=${target%/} ;;
  esac
  paths=
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    [ "$p" = "$target" ] && continue
    if [ -z "$paths" ]; then
      paths="$p"
    else
      paths="$paths
$p"
    fi
  done <<EOF
$(hide_nohello_managed_paths)
EOF
  hide_nohello_rewrite_managed "$paths"
}

hide_nohello_unpersist_all() {
  [ -f "$NOHELLO_UMOUNT_FILE" ] || return 0
  hide_nohello_rewrite_managed ""
}

hide_unpersist_try_umount() {
  target="$1"
  [ -n "$target" ] || return 0
  [ -f "$SUSFS_TRY_UMOUNT_FILE" ] || return 0
  case "$target" in
    */) target=${target%/} ;;
  esac
  tmp="$SUSFS_TRY_UMOUNT_FILE.tmp.$$"
  # 精确删行，保留用户其它条目与注释
  grep -vxF "$target" "$SUSFS_TRY_UMOUNT_FILE" >"$tmp" 2>/dev/null && \
    mv -f "$tmp" "$SUSFS_TRY_UMOUNT_FILE" 2>/dev/null
  rm -f "$tmp" 2>/dev/null
}

hide_unpersist_all_try_umount() {
  [ -f "$SUSFS_TRY_UMOUNT_FILE" ] || return 0
  for target in $(list_target_stores 2>/dev/null); do
    hide_unpersist_try_umount "$target"
  done
}

# 对单个 cacerts 目标注册 try_umount（bind 成功后调用；需开启 hide_allow）
