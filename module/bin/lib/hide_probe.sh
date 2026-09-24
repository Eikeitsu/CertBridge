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

# 解析 ksu_susfs：不限官方 susfs4ksu；SukiSU / KSU-Next / ReSuFS 等也可能自带
hide_resolve_susfs_bin() {
  if [ -n "${SUSFS_BIN:-}" ] && [ -x "$SUSFS_BIN" ]; then
    echo "$SUSFS_BIN"
    return 0
  fi
  for cand in \
    /data/adb/ksu/bin/ksu_susfs \
    /data/adb/ksud/bin/ksu_susfs \
    /data/adb/modules/susfs4ksu/tools/ksu_susfs \
    /data/adb/modules/susfs4ksu/bin/ksu_susfs \
    /data/adb/modules/resusfs/tools/ksu_susfs \
    /data/adb/modules/resusfs/bin/ksu_susfs \
    /data/adb/modules/ReSuFS/tools/ksu_susfs \
    /data/adb/modules/ReSuFS/bin/ksu_susfs; do
    if [ -x "$cand" ]; then
      echo "$cand"
      return 0
    fi
  done
  # 任意已启用模块里的 tools/bin
  for cand in /data/adb/modules/*/tools/ksu_susfs /data/adb/modules/*/bin/ksu_susfs; do
    [ -x "$cand" ] || continue
    moddir=$(dirname "$(dirname "$cand")")
    hide_module_enabled "$moddir" || continue
    echo "$cand"
    return 0
  done
  cand=$(command -v ksu_susfs 2>/dev/null) || cand=
  [ -n "$cand" ] && [ -x "$cand" ] && echo "$cand" && return 0
  return 1
}

# CLI 能否与内核 SuSFS 通信（证明内核侧有 SuSFS，不代表依赖某管理器模块）
hide_susfs_cli_talks() {
  bin="$1"
  [ -n "$bin" ] && [ -x "$bin" ] || return 1
  if "$bin" show version >/dev/null 2>&1; then
    return 0
  fi
  feats=$("$bin" show enabled_features 2>/dev/null) || feats=
  [ -n "$feats" ] || return 1
  echo "$feats" | grep -q "CONFIG_KSU_SUSFS"
}

# 内核是否编入 SuSFS（优先读配置；不依赖管理器/模块是否安装）
hide_kernel_has_susfs() {
  # 1) /proc/config.gz（内核开启 IKCONFIG_PROC 时可用）
  if [ -f /proc/config.gz ]; then
    if zcat /proc/config.gz 2>/dev/null | grep -qE '^CONFIG_KSU_SUSFS(=y|_TRY_UMOUNT=y)'; then
      return 0
    fi
    if zcat /proc/config.gz 2>/dev/null | grep -q '^CONFIG_KSU_SUSFS=y'; then
      return 0
    fi
  fi
  if [ -f /proc/config ]; then
    grep -qE '^CONFIG_KSU_SUSFS(=y|_TRY_UMOUNT=y)' /proc/config 2>/dev/null && return 0
    grep -q '^CONFIG_KSU_SUSFS=y' /proc/config 2>/dev/null && return 0
  fi
  # 2) 任意 ksu_susfs 能 show version → 内核已响应 SuSFS ioctl/prctl
  if SUSFS_BIN=$(hide_resolve_susfs_bin); then
    export SUSFS_BIN
    hide_susfs_cli_talks "$SUSFS_BIN" && return 0
  fi
  # 3) 部分管理器把版本写在固定文件（可选痕迹，仍指向内核能力）
  for f in \
    /data/adb/ksu/susfs_version \
    /data/adb/susfs4ksu/susfs_version \
    /data/adb/resusfs/susfs_version; do
    [ -f "$f" ] && [ -s "$f" ] && return 0
  done
  return 1
}

# 可选：管理器配置目录（仅用于 try_umount.txt 持久化，不作为「有无 SuSFS」判据）
hide_susfs_persist_dir_hint() {
  for d in /data/adb/susfs4ksu /data/adb/resusfs /data/adb/ReSuFS; do
    [ -d "$d" ] && return 0
  done
  for prop in /data/adb/modules/*/module.prop; do
    [ -f "$prop" ] || continue
    moddir=$(dirname "$prop")
    hide_module_enabled "$moddir" || continue
    id=$(awk -F= '$1=="id"{sub(/^[^=]*=/,""); print; exit}' "$prop" 2>/dev/null | tr -d '\r')
    name=$(awk -F= '$1=="name"{sub(/^[^=]*=/,""); print; exit}' "$prop" 2>/dev/null | tr -d '\r')
    blob=$(printf '%s %s %s' "$id" "$name" "$(basename "$moddir")" | tr 'A-Z' 'a-z')
    case "$blob" in
      *susfs*|*resusfs*) return 0 ;;
    esac
  done
  return 1
}

# 解析 try_umount 持久化文件：有管理器目录才写；没有则只靠本模块当场 ksud/ksu_susfs 登记
hide_resolve_susfs_try_umount_file() {
  if [ -n "${SUSFS_TRY_UMOUNT_FILE:-}" ]; then
    echo "$SUSFS_TRY_UMOUNT_FILE"
    return 0
  fi
  for d in /data/adb/susfs4ksu /data/adb/resusfs /data/adb/ReSuFS; do
    if [ -d "$d" ]; then
      echo "$d/try_umount.txt"
      return 0
    fi
  done
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

# SuSFS 可用 = 内核具备 SuSFS（不是「装了某个管理器模块」）。
# 用户态管理器只是配置 UI / 附带 CLI；本模块自己用 ksud / ksu_susfs 登记 try_umount。
hide_susfs_available() {
  cached=$(hide_probe_cache_get susfs 2>/dev/null) || cached=
  if [ "$cached" = "1" ]; then
    return 0
  fi
  if hide_kernel_has_susfs; then
    hide_probe_cache_set susfs 1
    return 0
  fi
  return 1
}

# ksu_susfs 二进制是否存在（登记时可选通道；无则走 ksud）
hide_susfs_bin_present() {
  if SUSFS_BIN=$(hide_resolve_susfs_bin); then
    export SUSFS_BIN
    return 0
  fi
  return 1
}

# 兼容旧名：是否有可写的管理器配置目录（仅持久化用）
hide_susfs4ksu_module_present() {
  hide_susfs_persist_dir_hint
}

# 旧名兼容（若其它脚本仍调用）
hide_susfs_manager_hint() {
  hide_susfs_persist_dir_hint
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
