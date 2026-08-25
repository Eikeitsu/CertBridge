#!/system/bin/sh
# 挂载隐藏协助：SuSFS try_umount / 内核 umount + 隐藏栈探测

SUSFS_BIN="${SUSFS_BIN:-/data/adb/ksu/bin/ksu_susfs}"
HIDE_STATE_FILE="${HIDE_STATE_FILE:-$STATEDIR/hide-assist.conf}"

hide_module_enabled() {
  moddir="$1"
  [ -d "$moddir" ] || return 1
  [ ! -f "$moddir/disable" ] && [ ! -f "$moddir/remove" ]
}

hide_susfs_available() {
  [ -x "$SUSFS_BIN" ] || return 1
  "$SUSFS_BIN" show enabled_features 2>/dev/null | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"
}

hide_ksud_kernel_umount_available() {
  [ -x /data/adb/ksu/bin/ksud ] || return 1
  /data/adb/ksud kernel 2>&1 | grep -q "umount"
}

hide_record_applied() {
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "hide_applied=1" >"$HIDE_STATE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$HIDE_STATE_FILE.tmp.$$" "$HIDE_STATE_FILE" 2>/dev/null
}

hide_read_applied() {
  [ -f "$HIDE_STATE_FILE" ] && grep -q '^hide_applied=1' "$HIDE_STATE_FILE" 2>/dev/null
}

# 对单个 cacerts 目标注册 try_umount（bind 成功后调用）
hide_assist_for_target() {
  target="$1"
  [ -n "$target" ] || return 0
  applied=0

  if hide_susfs_available; then
    if "$SUSFS_BIN" add_try_umount "$target" 1 2>/dev/null; then
      log_debug "hide: susfs try_umount registered ($target)"
      applied=1
    elif "$SUSFS_BIN" add_try_umount "$target" >/dev/null 2>&1; then
      log_debug "hide: susfs try_umount registered legacy ($target)"
      applied=1
    fi
  fi

  if hide_ksud_kernel_umount_available; then
    /data/adb/ksu/bin/ksud kernel umount add "$target" --flags 2 >/dev/null 2>&1 && \
      log_debug "hide: ksud kernel umount registered ($target)" && applied=1
  fi

  [ "$applied" = "1" ] && hide_record_applied
  return 0
}

# 注入完成后对所有目标路径注册隐藏协助
hide_assist_after_inject() {
  for target in $(list_target_stores); do
    hide_assist_for_target "$target"
  done
}

# 探测已启用的隐藏助手模块（优先级：susfs > zygisk 栈 > magisk_denylist）
detect_hide_provider() {
  if hide_susfs_available; then
    echo susfs
    return 0
  fi

  if hide_module_enabled /data/adb/modules/rezygisk; then
    echo rezygisk
    return 0
  fi

  zyg_dir=/data/adb/modules/zygisksu
  if hide_module_enabled "$zyg_dir"; then
    if grep -q "NeoZygisk" "$zyg_dir/module.prop" 2>/dev/null; then
      echo neozygisk
      return 0
    fi
    echo zygisknext
    return 0
  fi

  if hide_module_enabled /data/adb/modules/shamiko; then
    echo shamiko
    return 0
  fi

  if hide_module_enabled /data/adb/modules/zygisk-assistant; then
    echo zygisk_assistant
    return 0
  fi

  if hide_module_enabled /data/adb/modules/zygisk_nohello; then
    echo nohello
    return 0
  fi

  if hide_module_enabled /data/adb/modules/NoHello; then
    echo nohello
    return 0
  fi

  root_impl=$(detect_root_impl 2>/dev/null)
  case "$root_impl" in
    Magisk) echo magisk_denylist ;;
    KernelSU|SukiSU) echo ksu_umount ;;
    APatch) echo apatch_exclude ;;
    *) echo none ;;
  esac
}

hide_provider_label() {
  case "$1" in
    susfs) echo "SuSFS try_umount" ;;
    rezygisk) echo "ReZygisk" ;;
    neozygisk) echo "NeoZygisk" ;;
    zygisknext) echo "ZygiskNext" ;;
    shamiko) echo "Shamiko" ;;
    zygisk_assistant) echo "Zygisk Assistant" ;;
    nohello) echo "NoHello" ;;
    magisk_denylist) echo "Magisk 排除列表（需配合 Zygisk 助手）" ;;
    ksu_umount) echo "KernelSU 卸载模块" ;;
    apatch_exclude) echo "APatch 排除修改" ;;
    none) echo "未检测到隐藏助手" ;;
    *) echo "$1" ;;
  esac
}

hide_mount_mode_label() {
  case "$(get_mount_mode)" in
    magic) echo "轻量 Magic" ;;
    *) echo "完整兼容" ;;
  esac
}

hide_tmpfs_label() {
  case "$(get_tmpfs_style)" in
    dev) echo "/dev/.cb*" ;;
    short) echo "local/tmp .fs*" ;;
    legacy) echo "sys-ca-merge*" ;;
    *) echo "$(get_tmpfs_style)" ;;
  esac
}

compose_hide_summary() {
  provider=$(detect_hide_provider)
  provider_label=$(hide_provider_label "$provider")
  mount_label=$(hide_mount_mode_label)
  tmpfs_label=$(hide_tmpfs_label)
  applied=0
  hide_read_applied && applied=1

  summary="${mount_label} · 临时层 ${tmpfs_label}"
  if [ "$applied" = "1" ]; then
    summary="${summary} · 已注册 SuSFS/内核 umount"
  fi
  summary="${summary} · 助手：${provider_label}"
  echo "$summary"
}

emit_hide_status() {
  provider=$(detect_hide_provider)
  echo "stage_root=$RUNTIME_MOUNT_ROOT"
  echo "hide_provider=$provider"
  echo "hide_provider_label=$(hide_provider_label "$provider")"
  if hide_read_applied; then
    echo "hide_applied=1"
  else
    echo "hide_applied=0"
  fi
  echo "hide_summary=$(compose_hide_summary)"
}
