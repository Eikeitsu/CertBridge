# 挂载隐藏协助（可选组件）
# 隐藏栈探测与 WebUI 状态输出
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
  echo "hide_supported=1"
  echo "hide_allow=$(read_conf hide_allow 0)"
  echo "stage_root=$RUNTIME_MOUNT_ROOT"
  if hide_assist_enabled; then
    provider=$(detect_hide_provider)
    echo "hide_provider=$provider"
    echo "hide_provider_label=$(hide_provider_label "$provider")"
    if hide_read_applied; then
      echo "hide_applied=1"
    else
      echo "hide_applied=0"
    fi
    echo "hide_summary=$(compose_hide_summary)"
  else
    echo "hide_provider=none"
    echo "hide_provider_label=已关闭（开关未开）"
    echo "hide_applied=0"
    echo "hide_summary=隐藏协助已关闭，不会注册 try_umount"
  fi
}

HIDE_ASSIST_LOADED=1
