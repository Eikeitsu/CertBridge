#!/system/bin/sh
# 挂载隐藏协助（可选组件）
# try_umount 登记与注入后回调
hide_assist_available() {
  return 0
}

# conf hide_allow=1 时才真正注册 try_umount / 写状态文件
# 默认安装写入 hide_allow=0；自定义安装勾选隐藏时写入 hide_allow=1
hide_assist_enabled() {
  [ "$(read_conf hide_allow 0)" = "1" ]
}

# susfs4ksu 模块开机 post-mount 会按此文件重登记（仅在目录存在时写入）
SUSFS_TRY_UMOUNT_FILE="${SUSFS_TRY_UMOUNT_FILE:-/data/adb/susfs4ksu/try_umount.txt}"
# NoHello Mount Rule System（≥0.0.5）：按 App 排除列表 umount 时匹配这些 point
NOHELLO_DIR="${NOHELLO_DIR:-/data/adb/nohello}"
NOHELLO_UMOUNT_FILE="${NOHELLO_UMOUNT_FILE:-$NOHELLO_DIR/umount}"
NOHELLO_BEGIN_MARK="${NOHELLO_BEGIN_MARK:-# BEGIN CertBridge}"
NOHELLO_END_MARK="${NOHELLO_END_MARK:-# END CertBridge}"
HIDE_PROBE_CACHE="${HIDE_PROBE_CACHE:-$STATEDIR/hide-probe.cache}"

hide_clear_applied() {
  hide_unpersist_all_try_umount
  hide_nohello_unpersist_all
  rm -f "$HIDE_STATE_FILE" 2>/dev/null
}

hide_module_enabled() {
  moddir="$1"
  [ -d "$moddir" ] || return 1
  [ ! -f "$moddir/disable" ] && [ ! -f "$moddir/remove" ]
}

# 解析 ksu_susfs：优先环境变量，再常见安装路径与 PATH
hide_resolve_susfs_bin() {
  if [ -n "${SUSFS_BIN:-}" ] && [ -x "$SUSFS_BIN" ]; then
    echo "$SUSFS_BIN"
    return 0
  fi
  for cand in \
    /data/adb/ksu/bin/ksu_susfs \
    /data/adb/ksud/bin/ksu_susfs \
    /data/adb/modules/susfs4ksu/tools/ksu_susfs; do
    if [ -x "$cand" ]; then
      echo "$cand"
      return 0
    fi
  done
  cand=$(command -v ksu_susfs 2>/dev/null) || cand=
  [ -n "$cand" ] && [ -x "$cand" ] && echo "$cand" && return 0
  return 1
}

hide_probe_cache_boot_ok() {
  [ -f "$HIDE_PROBE_CACHE" ] || return 1
  cache_boot=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$HIDE_PROBE_CACHE" 2>/dev/null | tr -d '\r')
  cache_epoch=$(awk -F= '$1 == "boot_epoch" { sub(/^[^=]*=/, ""); print; exit }' "$HIDE_PROBE_CACHE" 2>/dev/null | tr -d '\r')
  cur_boot=$(current_boot_id 2>/dev/null)
  cur_epoch=$(current_boot_epoch 2>/dev/null)
  [ -n "$cache_boot" ] && [ "$cache_boot" = "$cur_boot" ] || return 1
  [ "$cache_epoch" = "$cur_epoch" ]
}

hide_probe_cache_get() {
  key="$1"
  hide_probe_cache_boot_ok || return 1
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$HIDE_PROBE_CACHE" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] || return 1
  echo "$val"
}

hide_probe_cache_set() {
  key="$1"
  value="$2"
  mkdir -p "$STATEDIR" 2>/dev/null || return 0
  cur_boot=$(current_boot_id 2>/dev/null)
  cur_epoch=$(current_boot_epoch 2>/dev/null)
  tmp="$HIDE_PROBE_CACHE.tmp.$$"
  if hide_probe_cache_boot_ok; then
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$HIDE_PROBE_CACHE" >"$tmp" 2>/dev/null || {
      rm -f "$tmp"
      return 0
    }
  else
    {
      echo "boot_id=$cur_boot"
      echo "boot_epoch=$cur_epoch"
      [ "$key" = "susfs" ] || echo "susfs=0"
      [ "$key" = "ksud" ] || echo "ksud=0"
      [ "$key" = "nohello" ] || echo "nohello=0"
      echo "$key=$value"
    } >"$tmp" 2>/dev/null || {
      rm -f "$tmp"
      return 0
    }
  fi
  mv -f "$tmp" "$HIDE_PROBE_CACHE" 2>/dev/null || rm -f "$tmp"
}

hide_probe_cache_clear() {
  rm -f "$HIDE_PROBE_CACHE" 2>/dev/null
}

# 先探测内核/用户态是否真正支持 TRY_UMOUNT，再登记（不盲目 add）
# 结果按 boot 缓存，避免每次 status 拉起 ksu_susfs
hide_susfs_available() {
  cached=$(hide_probe_cache_get susfs 2>/dev/null) || cached=
  if [ -n "$cached" ]; then
    [ "$cached" = "1" ]
    return $?
  fi
  ok=0
  if SUSFS_BIN=$(hide_resolve_susfs_bin); then
    export SUSFS_BIN
    if "$SUSFS_BIN" show enabled_features 2>/dev/null | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
      ok=1
    fi
  fi
  hide_probe_cache_set susfs "$ok"
  [ "$ok" = "1" ]
}

# 结果按 boot 缓存，避免每次 status 执行 ksud kernel
hide_ksud_kernel_umount_available() {
  cached=$(hide_probe_cache_get ksud 2>/dev/null) || cached=
  if [ -n "$cached" ]; then
    [ "$cached" = "1" ]
    return $?
  fi
  ok=0
  if [ -x /data/adb/ksu/bin/ksud ] && \
      /data/adb/ksu/bin/ksud kernel 2>&1 | grep -q "umount"; then
    ok=1
  fi
  hide_probe_cache_set ksud "$ok"
  [ "$ok" = "1" ]
}

# NoHello 已安装且启用（Magisk / APatch：登记 point 规则，由排除列表触发 umount）
hide_nohello_available() {
  cached=$(hide_probe_cache_get nohello 2>/dev/null) || cached=
  if [ -n "$cached" ]; then
    [ "$cached" = "1" ]
    return $?
  fi
  ok=0
  if hide_module_enabled /data/adb/modules/zygisk_nohello || \
      hide_module_enabled /data/adb/modules/NoHello || \
      hide_module_enabled /data/adb/modules/zygisk-nohello; then
    ok=1
  fi
  hide_probe_cache_set nohello "$ok"
  [ "$ok" = "1" ]
}

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

hide_record_applied() {
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "hide_applied=1" >"$HIDE_STATE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$HIDE_STATE_FILE.tmp.$$" "$HIDE_STATE_FILE" 2>/dev/null
}

hide_read_applied() {
  [ -f "$HIDE_STATE_FILE" ] && grep -q '^hide_applied=1' "$HIDE_STATE_FILE" 2>/dev/null
}

# 写入 susfs4ksu 持久列表，供其 post-mount 在开机时再次 add_try_umount
hide_persist_try_umount() {
  target="$1"
  [ -n "$target" ] || return 0
  [ -d /data/adb/susfs4ksu ] || return 0
  mkdir -p /data/adb/susfs4ksu 2>/dev/null
  if [ ! -f "$SUSFS_TRY_UMOUNT_FILE" ]; then
    printf '%s\n' "# CertBridge cacerts try_umount paths" >"$SUSFS_TRY_UMOUNT_FILE" 2>/dev/null || return 0
  fi
  grep -qxF "$target" "$SUSFS_TRY_UMOUNT_FILE" 2>/dev/null && return 0
  printf '%s\n' "$target" >>"$SUSFS_TRY_UMOUNT_FILE" 2>/dev/null || return 0
  log_debug "hide: persisted try_umount path ($target)"
}

hide_unpersist_try_umount() {
  target="$1"
  [ -n "$target" ] || return 0
  [ -f "$SUSFS_TRY_UMOUNT_FILE" ] || return 0
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
hide_assist_for_target() {
  target="$1"
  [ -n "$target" ] || return 0
  hide_assist_enabled || return 0
  applied=0

  if hide_susfs_available; then
    if "$SUSFS_BIN" add_try_umount "$target" 1 2>/dev/null; then
      log_debug "hide: susfs try_umount registered ($target)"
      hide_persist_try_umount "$target"
      applied=1
    elif "$SUSFS_BIN" add_try_umount "$target" >/dev/null 2>&1; then
      log_debug "hide: susfs try_umount registered legacy ($target)"
      hide_persist_try_umount "$target"
      applied=1
    else
      log_warn "hide: susfs add_try_umount failed ($target)"
    fi
  fi

  if hide_ksud_kernel_umount_available; then
    /data/adb/ksu/bin/ksud kernel umount add "$target" --flags 2 >/dev/null 2>&1 && \
      log_debug "hide: ksud kernel umount registered ($target)" && applied=1
  fi

  if hide_nohello_available; then
    if hide_nohello_persist "$target"; then
      applied=1
    fi
  fi

  if [ "$applied" = "1" ]; then
    hide_record_applied
  elif ! hide_susfs_available && ! hide_ksud_kernel_umount_available && ! hide_nohello_available; then
    log_warn "hide: hide_allow=1 but no SuSFS/ksud/NoHello; Magisk/APatch 请装 NoHello 或 ZygiskNext umount"
  fi
  return 0
}

# 注入完成后对所有目标路径注册隐藏协助
hide_assist_after_inject() {
  hide_assist_enabled || {
    hide_clear_applied
    return 0
  }
  for target in $(list_target_stores); do
    hide_assist_for_target "$target"
  done
}
