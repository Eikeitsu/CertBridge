#!/system/bin/sh
# 挂载隐藏协助（可选组件）
# 隐藏栈探测与 WebUI 状态输出
# 收集全部隐藏助手（可并存，无互斥优先级）。SuSFS 与 ZygiskNext 等可同时生效。
detect_hide_assistants() {
  list=
  _add() {
    case ",$list," in
      *",$1,"*) ;;
      *) list="${list}${list:+,}$1" ;;
    esac
  }

  if hide_susfs_available; then
    _add susfs
  fi
  if hide_ksud_kernel_umount_available; then
    _add ksud
  fi
  if hide_nohello_available; then
    _add nohello
  fi

  if hide_module_enabled /data/adb/modules/rezygisk; then
    _add rezygisk
  fi

  zyg_dir=/data/adb/modules/zygisksu
  if hide_module_enabled "$zyg_dir"; then
    if grep -qi "NeoZygisk" "$zyg_dir/module.prop" 2>/dev/null; then
      _add neozygisk
    else
      _add zygisknext
    fi
  fi

  if hide_module_enabled /data/adb/modules/shamiko; then
    _add shamiko
  fi
  if hide_module_enabled /data/adb/modules/zygisk-assistant; then
    _add zygisk_assistant
  fi

  # Root 侧每 App 隐藏机制（与 try_umount 助手并存展示）
  root_impl=$(detect_root_impl 2>/dev/null)
  case "$root_impl" in
    Magisk) _add magisk_denylist ;;
    KernelSU|SukiSU) _add ksu_umount ;;
    APatch) _add apatch_exclude ;;
  esac

  [ -n "$list" ] && echo "$list" || echo none
}

# 兼容旧字段：取列表首项（不再因 SuSFS 挡住后续助手）
detect_hide_provider() {
  list=$(detect_hide_assistants 2>/dev/null) || list=none
  case "$list" in
    ""|none) echo none ;;
    *,*) echo "${list%%,*}" ;;
    *) echo "$list" ;;
  esac
}

hide_provider_label() {
  case "$1" in
    susfs) echo "SuSFS" ;;
    ksud) echo "ksud kernel umount" ;;
    rezygisk) echo "ReZygisk" ;;
    neozygisk) echo "NeoZygisk" ;;
    zygisknext) echo "ZygiskNext" ;;
    shamiko) echo "Shamiko" ;;
    zygisk_assistant) echo "Zygisk Assistant" ;;
    nohello) echo "NoHello" ;;
    magisk_denylist) echo "Magisk 排除列表" ;;
    ksu_umount) echo "KernelSU 卸载模块" ;;
    apatch_exclude) echo "APatch 排除修改" ;;
    none) echo "未检测到" ;;
    *) echo "$1" ;;
  esac
}

hide_assistants_label() {
  list="$1"
  [ -n "$list" ] || list=none
  if [ "$list" = "none" ]; then
    hide_provider_label none
    return 0
  fi
  out=
  old_ifs=$IFS
  IFS=,
  # shellcheck disable=SC2086
  set -- $list
  IFS=$old_ifs
  for id in "$@"; do
    [ -n "$id" ] || continue
    lab=$(hide_provider_label "$id")
    out="${out}${out:+ · }$lab"
  done
  echo "$out"
}

hide_mount_mode_label() {
  case "$(get_mount_mode)" in
    magic) echo "轻量 Magic" ;;
    *) echo "完整兼容" ;;
  esac
}

hide_tmpfs_label() {
  case "$(get_tmpfs_style)" in
    dev) echo "/dev/.fs*" ;;
    mnt) echo "/mnt/.ca*" ;;
    short) echo "local/tmp .fs*" ;;
    legacy) echo "sys-ca-merge*" ;;
    *) echo "$(get_tmpfs_style)" ;;
  esac
}

compose_hide_summary() {
  assistants=$(detect_hide_assistants)
  assistants_label=$(hide_assistants_label "$assistants")
  mount_label=$(hide_mount_mode_label)
  tmpfs_label=$(hide_tmpfs_label)
  applied=0
  hide_read_applied && applied=1

  summary="${mount_label} · 临时层 ${tmpfs_label}"
  if [ "$applied" = "1" ]; then
    summary="${summary} · 已注册 SuSFS/内核/NoHello umount"
  elif hide_susfs_available || hide_ksud_kernel_umount_available || hide_nohello_available || \
      hide_susfs4ksu_module_present || hide_susfs_bin_present; then
    summary="${summary} · 未登记（需重新注入或热挂载）"
  else
    summary="${summary} · 无法登记（无 SuSFS/ksud/NoHello）"
  fi
  summary="${summary} · 助手：${assistants_label}"
  echo "$summary"
}

emit_hide_status() {
  echo "hide_supported=1"
  echo "hide_allow=$(read_conf hide_allow 0)"
  echo "stage_root=$RUNTIME_MOUNT_ROOT"

  # 始终探测「有哪些助手」（实况展示），与 hide_allow 开关无关。
  # 以前开关关闭时整段清零，只剩 emit_zygisk_loader_status 的 ZygiskNext，看起来像列表被砍光。
  if hide_susfs_available; then
    echo "hide_susfs=1"
  else
    echo "hide_susfs=0"
  fi
  if hide_ksud_kernel_umount_available; then
    echo "hide_ksud_umount=1"
  else
    echo "hide_ksud_umount=0"
  fi
  if hide_nohello_available; then
    echo "hide_nohello=1"
  else
    echo "hide_nohello=0"
  fi

  # kernel_umount 特性（KSU-Next：关着则登记了也不会卸）
  hide_ku=0
  if [ -x /data/adb/ksu/bin/ksud ]; then
    if /data/adb/ksu/bin/ksud feature get kernel_umount 2>/dev/null | grep -qE 'value[=:][[:space:]]*1|enabled|true'; then
      hide_ku=1
    elif /data/adb/ksu/bin/ksud feature get 1 2>/dev/null | grep -qE 'value[=:][[:space:]]*1|enabled|true'; then
      hide_ku=1
    fi
  fi
  echo "hide_kernel_umount_feature=$hide_ku"

  assistants=$(detect_hide_assistants)
  echo "hide_assistants=$assistants"
  echo "hide_assistants_label=$(hide_assistants_label "$assistants")"
  provider=$(detect_hide_provider)
  echo "hide_provider=$provider"
  echo "hide_provider_label=$(hide_provider_label "$provider")"

  if hide_assist_enabled; then
    # 仅开关开启时读登记路径 / 是否已 applied（涉及本模块写入状态）
    hide_paths=
    _tumount=$(hide_resolve_susfs_try_umount_file 2>/dev/null) || _tumount=
    [ -n "$_tumount" ] || _tumount="$SUSFS_TRY_UMOUNT_FILE"
    if [ -f "$_tumount" ]; then
      hide_paths=$(grep -E '/cacerts$' "$_tumount" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    fi
    echo "hide_try_umount_paths=${hide_paths:-}"
    if hide_read_applied; then
      echo "hide_applied=1"
    else
      echo "hide_applied=0"
    fi
    echo "hide_summary=$(compose_hide_summary)"
  else
    echo "hide_try_umount_paths="
    echo "hide_applied=0"
    echo "hide_summary=隐藏协助已关闭，不会注册 try_umount · 已检测到：$(hide_assistants_label "$assistants")"
  fi
}

HIDE_ASSIST_LOADED=1
