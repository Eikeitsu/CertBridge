#!/system/bin/sh
# 由 common 加载
# API、目标信任库、运行时 bind 探测与拆除
get_api() {
  api=$(getprop ro.build.version.sdk)
  [ -n "$api" ] || api=24
  echo "$api"
}

get_target_store() {
  if [ "$(get_api)" -ge 34 ] && [ -d "$APEX_CACERTS" ]; then
    echo "$APEX_CACERTS"
  else
    echo "$SYSTEM_CACERTS"
  fi
}

MODULE_SYSTEM_CACERTS="$MODDIR/system/etc/security/cacerts"

# 每个信任库目标对应的 runtime tmpfs 目录（注入与状态校验共用）
# 所有 conscrypt APEX 路径共用一层，避免多目标重复整库拷贝
target_stage_dir() {
  target="$1"
  case "$target" in
    "$SYSTEM_CACERTS") echo "$RUNTIME_MOUNT_ROOT/system" ;;
    "$APEX_CACERTS"|/apex/com.android.conscrypt/cacerts|/apex/com.android.conscrypt@*/cacerts)
      echo "$RUNTIME_MOUNT_ROOT/apex"
      ;;
    *)
      name=$(echo "$target" | tr '/@' '__' | sed 's/__*/_/g')
      echo "$RUNTIME_MOUNT_ROOT/$name"
      ;;
  esac
}

# mountinfo 是否仍暴露本模块 staging 路径（含历史 .cb* / sys-ca-merge）
mountinfo_has_stage_path() {
  target="$1"
  mountinfo="${2:-/proc/self/mountinfo}"
  [ -n "$target" ] && [ -f "$mountinfo" ] || return 1
  awk -v target="$target" -v root="${RUNTIME_MOUNT_ROOT:-/dev/.fs0}" '
    $5 == target && (
      index($0, root) > 0 ||
      index($0, "/dev/.fs0") > 0 ||
      index($0, "/dev/.fs1") > 0 ||
      index($0, "/dev/.cb0") > 0 ||
      index($0, "/dev/.cb1") > 0 ||
      index($0, "/data/local/tmp/.fs0") > 0 ||
      index($0, "/data/local/tmp/.fs1") > 0 ||
      index($0, "/data/local/tmp/sys-ca-merge") > 0 ||
      index($0, "/mnt/.ca0") > 0 ||
      index($0, "/mnt/.ca1") > 0
    ) { found=1 }
    END { exit found ? 0 : 1 }
  ' "$mountinfo" 2>/dev/null
}

# 注入成功后 stage 挂载点会被拆除；用「目标是挂载点 + tmpfs/overlay」识别残留
is_tmpfs_cacert_overlay() {
  target="$1"
  mountinfo="${2:-/proc/self/mountinfo}"
  [ -n "$target" ] && [ -d "$target" ] && [ -f "$mountinfo" ] || return 1
  awk -v target="$target" '
    $5 == target {
      # mountinfo: ... - fstype source ...
      for (i = 1; i <= NF; i++) if ($i == "-") {
        if ($(i + 1) == "tmpfs" || $(i + 1) == "overlay") found = 1
        break
      }
    }
    END { exit found ? 0 : 1 }
  ' "$mountinfo" 2>/dev/null
}

# init 卸掉 apex bind 之后，符号路径和 conscrypt@版本 都算证书层
apex_cert_overlay_in_mountinfo() {
  mountinfo="${1:-/proc/self/mountinfo}"
  [ -f "$mountinfo" ] || return 1
  awk '
    $5 ~ /^\/apex\/com\.android\.conscrypt(@[^/]+)?\/cacerts$/ {
      for (i = 1; i <= NF; i++) if ($i == "-") {
        if ($(i + 1) == "tmpfs" || $(i + 1) == "overlay") found = 1
        break
      }
    }
    END { exit found ? 0 : 1 }
  ' "$mountinfo" 2>/dev/null
}

# 当前命名空间里，target 是否仍绑着本模块 runtime 层（含已拆除挂载点后的 tmpfs）
is_certbridge_runtime_bind() {
  target="$1"
  mountinfo="${2:-/proc/self/mountinfo}"
  [ -n "$target" ] || return 1
  mountinfo_has_stage_path "$target" "$mountinfo" && return 0
  # APEX 上的 tmpfs overlay 几乎一定是 CA 模块注入（Magisk 无法 Magic Mount /apex）
  case "$target" in
    /apex/*/cacerts|/apex/*/cacerts/)
      is_tmpfs_cacert_overlay "$target" "$mountinfo" && return 0
      ;;
  esac
  # compatible：system 路径上的 tmpfs 也视为本模块（或其它脚本注入）残留
  if binds_system_cacerts 2>/dev/null; then
    case "$target" in
      "$SYSTEM_CACERTS"|"$SYSTEM_CACERTS"/)
        is_tmpfs_cacert_overlay "$target" "$mountinfo" && return 0
        ;;
    esac
  fi
  return 1
}

# bind 成功后卸掉 staging 挂载点，mountinfo 不再暴露临时路径。
# 目标上的 bind 仍保留（同一 tmpfs 引用）。
# 当前已是 init mount ns 时只本地 umount，避免多余 nsenter（Found KSU）。
# 禁止再 nsenter zygote。
orphan_tmpfs_stage() {
  stage="$1"
  [ -n "$stage" ] || return 0
  _orphan_nsenter=1
  if [ -d /proc/1/ns/mnt ]; then
    _cur_ns=$(readlink /proc/self/ns/mnt 2>/dev/null)
    _init_ns=$(readlink /proc/1/ns/mnt 2>/dev/null)
    if [ -n "$_cur_ns" ] && [ -n "$_init_ns" ] && [ "$_cur_ns" = "$_init_ns" ]; then
      _orphan_nsenter=0
    fi
  else
    _orphan_nsenter=0
  fi
  if [ "$_orphan_nsenter" = "1" ] && command -v nsenter >/dev/null 2>&1 && \
      [ -d /proc/1/ns/mnt ]; then
    nsenter --mount=/proc/1/ns/mnt -- umount "$stage" 2>/dev/null || \
      nsenter --mount=/proc/1/ns/mnt -- umount -l "$stage" 2>/dev/null || true
  fi
  umount "$stage" 2>/dev/null || umount -l "$stage" 2>/dev/null || true
  rmdir "$stage" 2>/dev/null || true
  return 0
}

# 卸掉信任库路径上残留的 runtime bind，露出真实系统 CA。
# 软重启不换 mount 时，若不先卸掉，build_boot_generation 会把旧 addon
#（如已关闭的 ProxyPin 243f0bfb.0）当成「系统基线」再次拷进 generation。
detach_runtime_cacert_binds() {
  # 冷启动常见：无残留则整段跳过（不改双模式语义）
  # 软重启不换内核 mount：上一轮 bind 常仍挂在 init ns；若只看符号路径
  # /apex/.../cacerts 而漏掉 conscrypt@版本，会跳过 detach 再叠一层 → 双 Mount。
  _detach_need=0
  if [ -n "${RUNTIME_MOUNT_ROOT:-}" ] && [ -d "$RUNTIME_MOUNT_ROOT" ]; then
    if mountpoint -q "$RUNTIME_MOUNT_ROOT" 2>/dev/null; then
      _detach_need=1
    else
      for _s in "$RUNTIME_MOUNT_ROOT"/*; do
        [ -d "$_s" ] || continue
        if mountpoint -q "$_s" 2>/dev/null; then
          _detach_need=1
          break
        fi
      done
    fi
  fi
  if [ "$_detach_need" = "0" ]; then
    for _t in "$APEX_CACERTS" "$SYSTEM_CACERTS"; do
      [ -d "$_t" ] || continue
      if is_certbridge_runtime_bind "$_t" 2>/dev/null; then
        _detach_need=1
        break
      fi
    done
  fi
  # 软重启：叠层可能只挂在 @版本 路径上，符号路径检查会漏
  if [ "$_detach_need" = "0" ]; then
    for _t in /apex/com.android.conscrypt@*/cacerts; do
      [ -d "$_t" ] || continue
      if is_certbridge_runtime_bind "$_t" 2>/dev/null; then
        _detach_need=1
        break
      fi
    done
  fi
  # 以 init mountinfo 为准：凡 cacerts 上仍是本模块 runtime 层即需卸
  if [ "$_detach_need" = "0" ] && [ -f /proc/1/mountinfo ]; then
    for _t in $(awk '$5 ~ /\/cacerts$/ { print $5 }' /proc/1/mountinfo 2>/dev/null | sort -u); do
      if is_certbridge_runtime_bind "$_t" /proc/1/mountinfo 2>/dev/null; then
        _detach_need=1
        break
      fi
    done
  fi
  if [ "$_detach_need" = "0" ]; then
    log_debug "store: detach skip (no leftover runtime binds)"
    return 0
  fi

  targets=""
  seen="|"
  for target in "$APEX_CACERTS" "$SYSTEM_CACERTS"; do
    [ -d "$target" ] || continue
    case "$seen" in *"|$target|"*) continue ;; esac
    targets="$targets $target"
    seen="$seen$target|"
  done
  for apex_dir in /apex/com.android.conscrypt@*/cacerts; do
    [ -d "$apex_dir" ] || continue
    case "$seen" in *"|$apex_dir|"*) continue ;; esac
    targets="$targets $apex_dir"
    seen="$seen$apex_dir|"
  done
  # mountinfo 实况路径（软重启残留可能落在目录枚举之外）
  if [ -f /proc/1/mountinfo ]; then
    for target in $(awk '$5 ~ /\/cacerts$/ { print $5 }' /proc/1/mountinfo 2>/dev/null | sort -u); do
      case "$seen" in *"|$target|"*) continue ;; esac
      if is_certbridge_runtime_bind "$target" /proc/1/mountinfo 2>/dev/null || \
          is_tmpfs_cacert_overlay "$target" /proc/1/mountinfo 2>/dev/null; then
        targets="$targets $target"
        seen="$seen$target|"
      fi
    done
  fi

  detached=0
  # 软重启可能叠多层；多剥几轮，优先非 lazy，失败再 -l
  _detach_max=8
  for target in $targets; do
    # magic：勿拆 Magisk/管理器对 system 的 Magic Mount 叠层
    if ! binds_system_cacerts; then
      case "$target" in
        "$SYSTEM_CACERTS"|"$SYSTEM_CACERTS"/) continue ;;
      esac
    fi
    tries=0
    while [ "$tries" -lt "$_detach_max" ] && is_certbridge_runtime_bind "$target"; do
      if umount "$target" 2>/dev/null; then
        :
      elif umount -l "$target" 2>/dev/null; then
        :
      else
        break
      fi
      detached=$((detached + 1))
      tries=$((tries + 1))
    done
    if command -v nsenter >/dev/null 2>&1 && [ -d /proc/1/ns/mnt ]; then
      tries=0
      mi_tmp="$STATEDIR/.detach-mi.$$"
      while [ "$tries" -lt "$_detach_max" ]; do
        nsenter --mount=/proc/1/ns/mnt -- cat /proc/self/mountinfo >"$mi_tmp" 2>/dev/null || break
        is_certbridge_runtime_bind "$target" "$mi_tmp" || break
        if nsenter --mount=/proc/1/ns/mnt -- umount "$target" 2>/dev/null; then
          :
        elif nsenter --mount=/proc/1/ns/mnt -- umount -l "$target" 2>/dev/null; then
          :
        else
          break
        fi
        detached=$((detached + 1))
        tries=$((tries + 1))
      done
      rm -f "$mi_tmp"
    fi
  done

  # 清理仍挂着的 staging：优先当前风格根，再扫历史路径（目录不存在则跳过）
  for root in \
    "$RUNTIME_MOUNT_ROOT" \
    /dev/.fs0 /dev/.fs1 /dev/.cb0 /dev/.cb1 \
    /data/local/tmp/.fs0 /data/local/tmp/.fs1 \
    /data/local/tmp/sys-ca-merge /data/local/tmp/sys-ca-merge-hot \
    /mnt/.ca0 /mnt/.ca1
  do
    [ -n "$root" ] && [ -d "$root" ] || continue
    if mountpoint -q "$root" 2>/dev/null; then
      orphan_tmpfs_stage "$root"
    fi
    for stage in "$root"/*; do
      [ -d "$stage" ] || continue
      if mountpoint -q "$stage" 2>/dev/null; then
        orphan_tmpfs_stage "$stage"
      fi
    done
  done
  [ "$detached" -gt 0 ] && \
    log_info "store: detached $detached leftover runtime cacert bind(s)"
  return 0
}

# 目标信任库（按 API 分两支 + 按挂载模式）：
# - API >= 34（Android 14+）：APEX 始终脚本 bind（管理器无法 Magic Mount /apex）
# - API < 34（Android 7–13）：无 APEX 信任库路径
# - compatible：再 bind /system/etc/security/cacerts（整库，不依赖元模块）
# - magic：system 不 bind，交给模块 system/ 的 Magic Mount 叠层
# - experimental_14_system=skip（仅 API>=34）：两种模式都跳过 system
list_target_stores() {
  seen="|"
  if [ "$(get_api)" -ge 34 ]; then
    if [ -d "$APEX_CACERTS" ]; then
      echo "$APEX_CACERTS"
      seen="$seen$APEX_CACERTS|"
    fi
    for apex_dir in /apex/com.android.conscrypt@*/cacerts; do
      [ -d "$apex_dir" ] || continue
      case "$seen" in *"|$apex_dir|"*) continue ;; esac
      echo "$apex_dir"
      seen="$seen$apex_dir|"
    done
  fi
  # magic：system 留给 Magic Mount，避免盖掉叠层
  if ! binds_system_cacerts; then
    return 0
  fi
  if [ -d "$SYSTEM_CACERTS" ]; then
    case "$seen" in *"|$SYSTEM_CACERTS|"*) ;; *)
      echo "$SYSTEM_CACERTS"
      ;;
    esac
  fi
}

# boot_multi_apex=0（默认）：14+ 仅主 APEX（跳过 @版本与 system）；7–13 仍绑 system
# boot_multi_apex=1：与 list_target_stores 相同，完整尊重双模式 / experimental_14_system
list_boot_inject_targets() {
  if [ "$(read_conf boot_multi_apex 0)" = "1" ]; then
    list_target_stores
    return 0
  fi
  if [ "$(get_api)" -ge 34 ]; then
    [ -d "$APEX_CACERTS" ] && echo "$APEX_CACERTS"
    return 0
  fi
  if binds_system_cacerts && [ -d "$SYSTEM_CACERTS" ]; then
    echo "$SYSTEM_CACERTS"
  fi
}

# 仅写入启用的 addon（绝不能塞整库，否则部分环境会整目录遮蔽系统 CA）。
