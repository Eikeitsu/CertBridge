#!/system/bin/sh
# Hide assist: register / assist
# 挂载隐藏协助（可选组件）
# try_umount 登记与注入后回调

# 退出码：0=新登记成功；2=已存在（视为成功）；1=失败（原因在 HIDE_UMOUNT_ERR）
HIDE_UMOUNT_ERR=

_hide_umount_err_is_exists() {
  printf '%s' "$1" | grep -qiE \
    'already|exist|exists|duplicate|duplicated|has been added|in (the )?list|registered'
}

hide_try_ksud_umount_add() {
  target="$1"
  HIDE_UMOUNT_ERR=
  [ -n "$target" ] || return 1
  _ksud=$(hide_resolve_ksud) || return 1
  hide_ensure_ksud_umount_feature 2>/dev/null || true
  _out=$("$_ksud" kernel umount add "$target" --flags 2 2>&1)
  _rc=$?
  HIDE_UMOUNT_ERR=$(printf '%s' "$_out" | tr '\n' ' ' | sed 's/[[:space:]]*$//')
  if [ "$_rc" = "0" ]; then
    # BakaSU：再写入 umount-config，管理器「卸载路径」页会标为持久并开机重载
    hide_try_ksud_umount_config_add "$target" 2>/dev/null || true
    return 0
  fi
  # 无退出码时仍可能 stderr 表示已在列表
  if _hide_umount_err_is_exists "$HIDE_UMOUNT_ERR"; then
    hide_try_ksud_umount_config_add "$target" 2>/dev/null || true
    return 2
  fi
  # 部分构建：已存在也返回非 0 且无文案；用 list 确认
  if "$_ksud" kernel umount list 2>/dev/null | grep -qxF "$target"; then
    HIDE_UMOUNT_ERR="${HIDE_UMOUNT_ERR:-already in kernel umount list}"
    hide_try_ksud_umount_config_add "$target" 2>/dev/null || true
    return 2
  fi
  return 1
}

# BakaSU / 部分分支：ksud umount-config → /data/adb/ksu/.umount（管理器持久列表）
# 无此子命令时静默跳过（官方 KSU / SukiSU 等）
hide_try_ksud_umount_config_add() {
  target="$1"
  [ -n "$target" ] || return 1
  _ksud=$(hide_resolve_ksud) || return 1
  "$_ksud" umount-config add "$target" --flags 2 >/dev/null 2>&1 || \
    "$_ksud" umount-config add "$target" >/dev/null 2>&1
}

hide_try_susfs_umount_add() {
  target="$1"
  HIDE_UMOUNT_ERR=
  SUSFS_BIN=$(hide_resolve_susfs_bin) || return 1
  _out=$("$SUSFS_BIN" add_try_umount "$target" 1 2>&1)
  _rc=$?
  if [ "$_rc" != "0" ]; then
    _out2=$("$SUSFS_BIN" add_try_umount "$target" 2>&1)
    _rc2=$?
    if [ "$_rc2" = "0" ]; then
      HIDE_UMOUNT_ERR=
      return 0
    fi
    [ -n "$_out2" ] && _out="$_out2"
    _rc=$_rc2
  fi
  HIDE_UMOUNT_ERR=$(printf '%s' "$_out" | tr '\n' ' ' | sed 's/[[:space:]]*$//')
  [ "$_rc" = "0" ] && return 0
  if _hide_umount_err_is_exists "$HIDE_UMOUNT_ERR"; then
    return 2
  fi
  return 1
}

# 从内核 try_umount 列表删除单路径（KSU-Next：ksud kernel umount del）

# 生成 NoHello 单条 point 规则（整行精确匹配，便于增删）
hide_nohello_rule_line() {
  target="$1"
  [ -n "$target" ] || return 1
  case "$target" in
    */) target=${target%/} ;;
  esac
  printf 'point { "%s" }\n' "$target"
}

# 从 umount 文件去掉本模块托管块，保留用户其它规则

# 读取托管块内已有 point 路径
hide_nohello_managed_paths() {
  [ -f "$NOHELLO_UMOUNT_FILE" ] || return 0
  awk -v begin="$NOHELLO_BEGIN_MARK" -v end="$NOHELLO_END_MARK" '
    $0 == begin { inblock=1; next }
    $0 == end { inblock=0; next }
    inblock {
      if ($0 ~ /^[[:space:]]*point[[:space:]]*\{[[:space:]]*"/) {
        line=$0
        sub(/^[[:space:]]*point[[:space:]]*\{[[:space:]]*"/, "", line)
        sub(/".*/, "", line)
        if (length(line) > 0) print line
      }
    }
  ' "$NOHELLO_UMOUNT_FILE" 2>/dev/null
}

# 重写托管块：paths 为换行分隔的目标路径列表

# 重写托管块：paths 为换行分隔的目标路径列表
hide_nohello_rewrite_managed() {
  paths="$1"
  mkdir -p "$NOHELLO_DIR" 2>/dev/null || return 1
  tmp_all="$NOHELLO_UMOUNT_FILE.tmp.$$"
  tmp_rest="$NOHELLO_UMOUNT_FILE.rest.$$"
  hide_nohello_strip_managed "$NOHELLO_UMOUNT_FILE" "$tmp_rest"
  {
    if [ -s "$tmp_rest" ]; then
      awk 'NF{p=1} p{print}' "$tmp_rest" | awk '
        { lines[NR]=$0 }
        END {
          end=NR
          while (end>0 && lines[end] ~ /^[[:space:]]*$/) end--
          for (i=1;i<=end;i++) print lines[i]
          if (end>0) print ""
        }
      '
    fi
    if [ -n "$paths" ]; then
      echo "$NOHELLO_BEGIN_MARK"
      printf '%s\n' "$paths" | while IFS= read -r p; do
        [ -n "$p" ] || continue
        hide_nohello_rule_line "$p"
      done
      echo "$NOHELLO_END_MARK"
    fi
  } >"$tmp_all" 2>/dev/null || {
    rm -f "$tmp_all" "$tmp_rest"
    return 1
  }
  mv -f "$tmp_all" "$NOHELLO_UMOUNT_FILE" 2>/dev/null || {
    rm -f "$tmp_all" "$tmp_rest"
    return 1
  }
  rm -f "$tmp_rest" 2>/dev/null
  return 0
}

hide_nohello_persist() {
  target="$1"
  [ -n "$target" ] || return 0
  hide_nohello_available || return 0
  case "$target" in
    */) target=${target%/} ;;
  esac
  paths=
  seen=0
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    if [ -z "$paths" ]; then
      paths="$p"
    else
      paths="$paths
$p"
    fi
    [ "$p" = "$target" ] && seen=1
  done <<EOF
$(hide_nohello_managed_paths)
EOF
  if [ "$seen" != "1" ]; then
    if [ -z "$paths" ]; then
      paths="$target"
    else
      paths="$paths
$target"
    fi
  fi
  hide_nohello_rewrite_managed "$paths" || {
    log_warn "hide: NoHello umount rule write failed ($target)"
    return 1
  }
  log_debug "hide: NoHello umount rule registered ($target)"
  return 0
}

hide_record_applied() {
  _add_path="${1:-}"
  case "$_add_path" in
    */) _add_path=${_add_path%/} ;;
  esac
  mkdir -p "$STATEDIR" 2>/dev/null
  _paths=
  if [ -f "$HIDE_STATE_FILE" ]; then
    _paths=$(awk -F= '$1 == "hide_paths" { sub(/^[^=]*=/, ""); print; exit }' "$HIDE_STATE_FILE" 2>/dev/null | tr -d '\r')
  fi
  if [ -n "$_add_path" ]; then
    case ",${_paths}," in
      *",${_add_path},"*) ;;
      *)
        if [ -n "$_paths" ]; then
          _paths="${_paths},${_add_path}"
        else
          _paths="$_add_path"
        fi
        ;;
    esac
  fi
  {
    echo "hide_applied=1"
    [ -n "$_paths" ] && echo "hide_paths=$_paths"
  } >"$HIDE_STATE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$HIDE_STATE_FILE.tmp.$$" "$HIDE_STATE_FILE" 2>/dev/null
}

hide_read_applied() {
  [ -f "$HIDE_STATE_FILE" ] && grep -q '^hide_applied=1' "$HIDE_STATE_FILE" 2>/dev/null
}

hide_read_recorded_paths() {
  [ -f "$HIDE_STATE_FILE" ] || return 0
  awk -F= '$1 == "hide_paths" { sub(/^[^=]*=/, ""); gsub(/,/, "\n"); print; exit }' \
    "$HIDE_STATE_FILE" 2>/dev/null | tr -d '\r'
}

# 写入 SuSFS 管理器持久列表（susfs4ksu / resusfs 等已有目录时），供其开机重登记
hide_persist_try_umount() {
  target="$1"
  [ -n "$target" ] || return 1
  persist=$(hide_resolve_susfs_try_umount_file 2>/dev/null) || persist=
  [ -n "$persist" ] || return 1
  # 目录须已由 susfs4ksu 等模块创建；不主动 mkdir 以免留下无人消费的空配置
  pdir=$(dirname "$persist")
  [ -d "$pdir" ] || return 1
  if [ ! -f "$persist" ]; then
    printf '%s\n' "# CertBridge cacerts try_umount paths" >"$persist" 2>/dev/null || return 1
  fi
  case "$target" in
    */) target=${target%/} ;;
  esac
  grep -qxF "$target" "$persist" 2>/dev/null && return 0
  printf '%s\n' "$target" >>"$persist" 2>/dev/null || return 1
  SUSFS_TRY_UMOUNT_FILE="$persist"
  export SUSFS_TRY_UMOUNT_FILE
  log_info "hide: persisted try_umount ($target → $persist)"
  return 0
}

# 对单个 cacerts 目标注册 try_umount（bind 成功后调用；需开启 hide_allow）
hide_assist_for_target() {
  target="$1"
  [ -n "$target" ] || return 0
  hide_assist_enabled || return 0
  case "$target" in
    */) target=${target%/} ;;
  esac
  live=0
  file_ok=0

  # 1) 先持久化：susfs4ksu post-mount / boot-completed 会读 try_umount.txt
  if hide_persist_try_umount "$target"; then
    file_ok=1
  fi

  # 2) 当场登记：有 ksu_susfs 就试（不因 feature 探测失败而跳过）
  if hide_susfs_bin_present; then
    hide_try_susfs_umount_add "$target"
    _s_rc=$?
    if [ "$_s_rc" = "0" ]; then
      log_info "hide: susfs try_umount registered ($target)"
      hide_probe_cache_set susfs_kernel 1
      live=1
    elif [ "$_s_rc" = "2" ]; then
      log_debug "hide: susfs try_umount already present ($target)"
      hide_probe_cache_set susfs_kernel 1
      live=1
    else
      log_warn "hide: susfs add_try_umount failed ($target)${HIDE_UMOUNT_ERR:+: $HIDE_UMOUNT_ERR}"
    fi
  fi

  # 3) ksud kernel umount（先确保 feature 开启；SuSFS v2 / KSU-Next / BakaSU 主路径）
  if hide_resolve_ksud >/dev/null 2>&1; then
    hide_try_ksud_umount_add "$target"
    _k_rc=$?
    if [ "$_k_rc" = "0" ]; then
      log_info "hide: ksud kernel umount registered ($target)"
      hide_probe_cache_set ksud_umount 1
      live=1
    elif [ "$_k_rc" = "2" ]; then
      log_debug "hide: ksud kernel umount already present ($target)"
      hide_probe_cache_set ksud_umount 1
      live=1
    else
      log_warn "hide: ksud kernel umount add failed ($target)${HIDE_UMOUNT_ERR:+: $HIDE_UMOUNT_ERR}"
    fi
  fi

  # 4) NoHello point 规则（Magisk / APatch）
  if hide_nohello_available; then
    if hide_nohello_persist "$target"; then
      live=1
    fi
  fi

  # 仅当场登记成功才标 hide_applied；只写文件不够；路径写入状态供 WebUI 展示
  if [ "$live" = "1" ]; then
    hide_record_applied "$target"
  elif [ "$file_ok" = "1" ]; then
    log_info "hide: path only in try_umount.txt ($target); need susfs4ksu module to re-apply at boot"
  elif ! hide_susfs_bin_present && ! hide_susfs4ksu_module_present && \
      ! hide_resolve_ksud >/dev/null 2>&1 && ! hide_nohello_available; then
    log_warn "hide: hide_allow=1 but no SuSFS/ksud/NoHello; Magisk/APatch 请装 NoHello 或 ZygiskNext umount"
  fi
  return 0
}

# 注入完成后对所有目标路径注册隐藏协助

# 注入完成后对所有目标路径注册隐藏协助
hide_assist_after_inject() {
  # 先清误建的 susfs4ksu 配置目录（无对应模块时）
  hide_cleanup_orphan_susfs_persist_dirs 2>/dev/null || true

  hide_assist_enabled || {
    # 仅当本模块曾写过隐藏状态 / 托管规则时才清理，避免「装了但关着」每次开机无谓调 ksud
    if hide_read_applied 2>/dev/null || \
        { [ -f "$NOHELLO_UMOUNT_FILE" ] && grep -qF "$NOHELLO_BEGIN_MARK" "$NOHELLO_UMOUNT_FILE" 2>/dev/null; } || \
        { [ -f "$SUSFS_TRY_UMOUNT_FILE" ] && grep -qE '/cacerts$' "$SUSFS_TRY_UMOUNT_FILE" 2>/dev/null; }; then
      hide_clear_applied
    fi
    return 0
  }
  hide_probe_cache_clear 2>/dev/null || true
  hide_ensure_ksud_umount_feature 2>/dev/null || true

  seen="|"
  for target in $(list_target_stores); do
    case "$seen" in *"|$target|"*) continue ;; esac
    seen="$seen$target|"
    hide_assist_for_target "$target"
  done

  # 按 init/zygote mountinfo 实况补登记
  mi=/proc/1/mountinfo
  if [ -f "$mi" ]; then
    for target in $(hide_collect_live_cacert_mounts "$mi"); do
      if is_certbridge_runtime_bind "$target" "$mi" 2>/dev/null || \
          is_tmpfs_cacert_overlay "$target" "$mi" 2>/dev/null; then
        case "$seen" in *"|$target|"*) continue ;; esac
        seen="$seen$target|"
        log_info "hide: register live mountinfo path ($target)"
        hide_assist_for_target "$target"
      fi
    done
  fi
  for process in zygote zygote64; do
    for pid in $(pidof "$process" 2>/dev/null); do
      [ -f "/proc/$pid/mountinfo" ] || continue
      for target in $(hide_collect_live_cacert_mounts "/proc/$pid/mountinfo"); do
        if is_certbridge_runtime_bind "$target" "/proc/$pid/mountinfo" 2>/dev/null || \
            is_tmpfs_cacert_overlay "$target" "/proc/$pid/mountinfo" 2>/dev/null; then
          case "$seen" in *"|$target|"*) continue ;; esac
          seen="$seen$target|"
          log_info "hide: register zygote mountinfo path ($target)"
          hide_assist_for_target "$target"
        fi
      done
    done
  done
}
