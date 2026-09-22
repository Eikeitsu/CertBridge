#!/system/bin/sh
# Hide assist: probes
# 挂载隐藏协助（可选组件）
# try_umount 登记与注入后回调

hide_assist_available() {
  return 0
}

# conf hide_allow=1 时才真正注册 try_umount / 写状态文件
# 默认安装写入 hide_allow=0；自定义安装勾选隐藏时写入 hide_allow=1

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

hide_module_enabled() {
  moddir="$1"
  [ -d "$moddir" ] || return 1
  [ ! -f "$moddir/disable" ] && [ ! -f "$moddir/remove" ]
}

# 解析 ksu_susfs：优先环境变量，再常见安装路径与 PATH

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

# 结果按 boot 缓存；失败不缓存，避免 post-fs 过早探测失败后整轮开机不再登记

# 结果按 boot 缓存；失败不缓存，避免 post-fs 过早探测失败后整轮开机不再登记
hide_susfs_available() {
  cached=$(hide_probe_cache_get susfs 2>/dev/null) || cached=
  if [ "$cached" = "1" ]; then
    return 0
  fi
  ok=0
  if SUSFS_BIN=$(hide_resolve_susfs_bin); then
    export SUSFS_BIN
    if "$SUSFS_BIN" show enabled_features 2>/dev/null | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
      ok=1
    fi
  fi
  [ "$ok" = "1" ] && hide_probe_cache_set susfs 1
  [ "$ok" = "1" ]
}

# ksu_susfs 二进制是否存在（登记时用；不要求 feature 标志，兼容 SuSFS v2→ksud 路径）

# ksu_susfs 二进制是否存在（登记时用；不要求 feature 标志，兼容 SuSFS v2→ksud 路径）
hide_susfs_bin_present() {
  if SUSFS_BIN=$(hide_resolve_susfs_bin); then
    export SUSFS_BIN
    return 0
  fi
  return 1
}

# susfs4ksu 用户态模块是否已装（用于写入 try_umount.txt，供其 post-mount / boot-completed 重登记）

# susfs4ksu 用户态模块是否已装（用于写入 try_umount.txt，供其 post-mount / boot-completed 重登记）
hide_susfs4ksu_module_present() {
  hide_module_enabled /data/adb/modules/susfs4ksu || [ -d /data/adb/susfs4ksu ]
}

# 结果按 boot 缓存；失败不缓存

# 结果按 boot 缓存；失败不缓存
hide_ksud_kernel_umount_available() {
  cached=$(hide_probe_cache_get ksud 2>/dev/null) || cached=
  if [ "$cached" = "1" ]; then
    return 0
  fi
  ok=0
  if [ -x /data/adb/ksu/bin/ksud ]; then
    if /data/adb/ksu/bin/ksud kernel 2>&1 | grep -q "umount"; then
      ok=1
    elif /data/adb/ksu/bin/ksud kernel umount 2>&1 | grep -qiE "add|umount|usage|flags"; then
      # 部分版本 `ksud kernel` 无摘要，但子命令可用
      ok=1
    fi
  fi
  [ "$ok" = "1" ] && hide_probe_cache_set ksud 1
  [ "$ok" = "1" ]
}

# 直接尝试 ksud 登记（探测失败时仍试一次，避免漏登）
# KernelSU-Next 等需先打开 kernel_umount 特性，否则列表有路径也不会执行 umount

# 直接尝试 ksud 登记（探测失败时仍试一次，避免漏登）
# KernelSU-Next 等需先打开 kernel_umount 特性，否则列表有路径也不会执行 umount
hide_ensure_ksud_umount_feature() {
  [ -x /data/adb/ksu/bin/ksud ] || return 1
  # 已开启则跳过
  if /data/adb/ksu/bin/ksud feature get kernel_umount 2>/dev/null | grep -qE 'value[=:][[:space:]]*1|enabled|true'; then
    return 0
  fi
  if /data/adb/ksu/bin/ksud feature get 1 2>/dev/null | grep -qE 'value[=:][[:space:]]*1|enabled|true'; then
    return 0
  fi
  /data/adb/ksu/bin/ksud feature set kernel_umount 1 >/dev/null 2>&1 && {
    log_info "hide: enabled ksud feature kernel_umount"
    return 0
  }
  /data/adb/ksu/bin/ksud feature set 1 1 >/dev/null 2>&1 && {
    log_info "hide: enabled ksud feature id=1 (kernel_umount)"
    return 0
  }
  return 1
}

# 从 mountinfo 收集 cacerts 上实际存在的挂载点（比 list_target_stores 更贴近内核所见）
hide_collect_live_cacert_mounts() {
  mi="${1:-/proc/1/mountinfo}"
  [ -f "$mi" ] || return 0
  awk '
    $5 ~ /\/cacerts$/ {
      print $5
    }
  ' "$mi" 2>/dev/null | sort -u
}

# NoHello 已安装且启用（Magisk / APatch：登记 point 规则，由排除列表触发 umount）

# NoHello 已安装且启用（Magisk / APatch：登记 point 规则，由排除列表触发 umount）
hide_nohello_available() {
  cached=$(hide_probe_cache_get nohello 2>/dev/null) || cached=
  if [ "$cached" = "1" ]; then
    return 0
  fi
  ok=0
  if hide_module_enabled /data/adb/modules/zygisk_nohello || \
      hide_module_enabled /data/adb/modules/NoHello || \
      hide_module_enabled /data/adb/modules/zygisk-nohello; then
    ok=1
  fi
  [ "$ok" = "1" ] && hide_probe_cache_set nohello 1
  [ "$ok" = "1" ]
}

# 生成 NoHello 单条 point 规则（整行精确匹配，便于增删）
