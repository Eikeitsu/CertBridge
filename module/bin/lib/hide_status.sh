#!/system/bin/sh
# 挂载隐藏协助（可选组件）
# 隐藏栈探测与 WebUI 状态输出
# 收集全部隐藏助手（可并存，无互斥优先级）。SuSFS 与 ZygiskNext 等可同时生效。
#
# detect_hide_assistants [susfs ksud nohello]
#   可传入已探测的 0/1，避免 status 路径上重复跑 ksud/SuSFS。

detect_hide_assistants() {
  _pre_s="${1-}"
  _pre_k="${2-}"
  _pre_n="${3-}"

  # 无预传参时：整表 boot 缓存（模块目录扫描 + Root 类型很便宜，贵的是 SuSFS/ksud）
  if [ -z "$_pre_s" ] && [ -z "$_pre_k" ] && [ -z "$_pre_n" ]; then
    cached=$(hide_probe_cache_get assistants 2>/dev/null) || cached=
    if [ -n "$cached" ]; then
      echo "$cached"
      return 0
    fi
  fi

  list=
  _add() {
    case ",$list," in
      *",$1,"*) ;;
      *) list="${list}${list:+,}$1" ;;
    esac
  }

  if [ -n "$_pre_s" ]; then
    [ "$_pre_s" = "1" ] && _add susfs
  elif hide_susfs_available; then
    _add susfs
  fi
  if [ -n "$_pre_k" ]; then
    [ "$_pre_k" = "1" ] && _add ksud
  elif hide_ksud_kernel_umount_available; then
    _add ksud
  fi
  if [ -n "$_pre_n" ]; then
    [ "$_pre_n" = "1" ] && _add nohello
  elif hide_nohello_available; then
    _add nohello
  fi

  # 以下仅看模块目录 / Root 类型（轻量）
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

  root_impl=$(detect_root_impl 2>/dev/null)
  case "$root_impl" in
    Magisk) _add magisk_denylist ;;
    KernelSU|SukiSU) _add ksu_umount ;;
    APatch) _add apatch_exclude ;;
  esac

  out=
  [ -n "$list" ] && out=$list || out=none
  if [ -z "$_pre_s" ] && [ -z "$_pre_k" ] && [ -z "$_pre_n" ]; then
    hide_probe_cache_set assistants "$out"
  fi
  echo "$out"
}

# 兼容旧字段：取列表首项（不再因 SuSFS 挡住后续助手）
detect_hide_provider() {
  list="${1-}"
  if [ -z "$list" ]; then
    list=$(detect_hide_assistants 2>/dev/null) || list=none
  fi
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
    none) echo "无可用助手" ;;
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

# compose_hide_summary [assistants] [susfs] [ksud] [nohello]
compose_hide_summary() {
  assistants="${1-}"
  _hs="${2-}"
  _hk="${3-}"
  _hn="${4-}"
  if [ -z "$assistants" ]; then
    assistants=$(detect_hide_assistants "${_hs}" "${_hk}" "${_hn}")
  fi
  assistants_label=$(hide_assistants_label "$assistants")
  mount_label=$(hide_mount_mode_label)
  tmpfs_label=$(hide_tmpfs_label)
  applied=0
  hide_read_applied && applied=1

  summary="${mount_label} · 临时层 ${tmpfs_label}"
  if [ "$applied" = "1" ]; then
    summary="${summary} · 已注册 SuSFS/内核/NoHello umount"
  elif [ "$_hs" = "1" ] || [ "$_hk" = "1" ] || [ "$_hn" = "1" ]; then
    summary="${summary} · 未登记（需重新注入或热挂载）"
  elif [ -z "$_hs" ] && [ -z "$_hk" ] && [ -z "$_hn" ] && \
      { hide_susfs_available || hide_ksud_kernel_umount_available || hide_nohello_available; }; then
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

  # 各贵重探测只跑一次，再拼 assistants / summary
  _hs=0
  hide_susfs_available && _hs=1
  _hk=0
  hide_ksud_kernel_umount_available && _hk=1
  _hn=0
  hide_nohello_available && _hn=1

  echo "hide_susfs=$_hs"
  echo "hide_ksud_umount=$_hk"
  echo "hide_nohello=$_hn"

  hide_ku=0
  if [ "$_hk" = "1" ] || [ -x /data/adb/ksu/bin/ksud ]; then
    hide_ksud_umount_feature_on && hide_ku=1
  fi
  echo "hide_kernel_umount_feature=$hide_ku"

  assistants=$(detect_hide_assistants "$_hs" "$_hk" "$_hn")
  # 带预传参时未写 assistants 缓存，这里补上供同 boot 后续 status
  hide_probe_cache_set assistants "$assistants" 2>/dev/null || true
  echo "hide_assistants=$assistants"
  echo "hide_assistants_label=$(hide_assistants_label "$assistants")"
  provider=$(detect_hide_provider "$assistants")
  echo "hide_provider=$provider"
  echo "hide_provider_label=$(hide_provider_label "$provider")"

  if hide_assist_enabled; then
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
    echo "hide_summary=$(compose_hide_summary "$assistants" "$_hs" "$_hk" "$_hn")"
  else
    echo "hide_try_umount_paths="
    echo "hide_applied=0"
    echo "hide_summary=隐藏协助已关闭，不会注册 try_umount · 可用助手：$(hide_assistants_label "$assistants")"
  fi
}

HIDE_ASSIST_LOADED=1
