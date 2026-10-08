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

  # 助手含 Shamiko / ZygiskNext 等可随时启停模块：每次实扫，不读 boot 整表缓存

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

  # 助手只看 L1 大类（分支在 root_flavor）
  root_impl=$(detect_root_impl 2>/dev/null)
  case "$root_impl" in
    Magisk) _add magisk_denylist ;;
    KernelSU) _add ksu_umount ;;
    APatch) _add apatch_exclude ;;
  esac

  out=
  [ -n "$list" ] && out=$list || out=none
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

# 收集本模块相关 cacerts 卸载路径：状态文件 + ksud + 可选 try_umount.txt
hide_collect_registered_umount_paths() {
  {
    # 0) 本模块登记时记下的路径（不依赖管理器 UI / susfs4ksu 目录）
    hide_read_recorded_paths 2>/dev/null
    # 1) ksud kernel umount list（BakaSU 多为 JSON；其它可能是纯路径行）
    _ksud=$(hide_resolve_ksud 2>/dev/null) || _ksud=
    if [ -n "$_ksud" ]; then
      _list=$("$_ksud" kernel umount list 2>/dev/null) || _list=
      printf '%s\n' "$_list" | grep -oE '/[^[:space:]",{}]+/cacerts' 2>/dev/null
    fi
    # 2) 仅当真正装了 susfs4ksu/resusfs 等时读其 try_umount.txt
    _tumount=$(hide_resolve_susfs_try_umount_file 2>/dev/null) || _tumount=
    if [ -n "$_tumount" ] && [ -f "$_tumount" ]; then
      grep -E '/cacerts$' "$_tumount" 2>/dev/null
    fi
    # 3) 旧状态无 hide_paths 时：已 applied 则回落当前目标列表（展示用）
    if hide_read_applied 2>/dev/null; then
      list_target_stores 2>/dev/null
    fi
  } | awk 'NF && !seen[$0]++'
}

hide_status_cache_boot_ok() {
  [ -f "$HIDE_STATUS_CACHE" ] || return 1
  _cb=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$HIDE_STATUS_CACHE" 2>/dev/null | tr -d '\r')
  _ce=$(awk -F= '$1 == "boot_epoch" { sub(/^[^=]*=/, ""); print; exit }' "$HIDE_STATUS_CACHE" 2>/dev/null | tr -d '\r')
  [ -n "$_cb" ] && [ "$_cb" = "$(current_boot_id 2>/dev/null)" ] || return 1
  [ "$_ce" = "$(current_boot_epoch 2>/dev/null)" ]
}

# 首屏：优先读本 boot 缓存；否则标 pending，避免「无助手」假阴性
emit_hide_status_quick() {
  if hide_status_cache_boot_ok; then
    grep -vE '^(boot_id|boot_epoch)=' "$HIDE_STATUS_CACHE" 2>/dev/null
    echo "hide_probe_pending=0"
    return 0
  fi
  echo "hide_supported=1"
  echo "hide_allow=$(read_conf hide_allow 0)"
  echo "stage_root=${RUNTIME_MOUNT_ROOT:-}"
  echo "hide_probe_pending=1"
  echo "hide_susfs="
  echo "hide_ksud_umount="
  echo "hide_nohello="
  echo "hide_kernel_umount_feature="
  echo "hide_kernel_umount_feature_known="
  echo "hide_try_umount_paths="
  echo "hide_assistants="
  echo "hide_assistants_label="
  echo "hide_provider="
  echo "hide_provider_label="
  # 登记态可读本地状态，不必等慢探测
  if hide_assist_enabled && hide_read_applied; then
    echo "hide_applied=1"
    _rp=$(hide_read_recorded_paths 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    echo "hide_try_umount_paths=${_rp:-}"
  else
    echo "hide_applied="
  fi
  echo "hide_summary="
}

emit_hide_status() {
  echo "hide_supported=1"
  echo "hide_allow=$(read_conf hide_allow 0)"
  echo "stage_root=$RUNTIME_MOUNT_ROOT"
  echo "hide_probe_pending=0"

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
  hide_ku_known=0
  if [ "$_hk" = "1" ] || hide_resolve_ksud >/dev/null 2>&1; then
    _ku_st=$(hide_ksud_umount_feature_probe 2>/dev/null) || _ku_st=n
    case "$_ku_st" in
      1)
        hide_ku=1
        hide_ku_known=1
        ;;
      0)
        hide_ku=0
        hide_ku_known=1
        ;;
      *)
        # na：本机构建无 kernel_umount feature 时不展示该项
        hide_ku=0
        hide_ku_known=0
        ;;
    esac
  fi
  echo "hide_kernel_umount_feature=$hide_ku"
  echo "hide_kernel_umount_feature_known=$hide_ku_known"

  assistants=$(detect_hide_assistants "$_hs" "$_hk" "$_hn")
  echo "hide_assistants=$assistants"
  echo "hide_assistants_label=$(hide_assistants_label "$assistants")"
  provider=$(detect_hide_provider "$assistants")
  echo "hide_provider=$provider"
  echo "hide_provider_label=$(hide_provider_label "$provider")"

  if hide_assist_enabled; then
    hide_paths=$(hide_collect_registered_umount_paths 2>/dev/null | tr '\n' ',' | sed 's/,$//')
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

  # 写入本 boot 缓存，供下次 --quick 立刻展示真值
  mkdir -p "$STATEDIR" 2>/dev/null
  {
    echo "boot_id=$(current_boot_id 2>/dev/null)"
    echo "boot_epoch=$(current_boot_epoch 2>/dev/null)"
    echo "hide_supported=1"
    echo "hide_allow=$(read_conf hide_allow 0)"
    echo "stage_root=$RUNTIME_MOUNT_ROOT"
    echo "hide_susfs=$_hs"
    echo "hide_ksud_umount=$_hk"
    echo "hide_nohello=$_hn"
    echo "hide_kernel_umount_feature=$hide_ku"
    echo "hide_kernel_umount_feature_known=$hide_ku_known"
    echo "hide_assistants=$assistants"
    echo "hide_assistants_label=$(hide_assistants_label "$assistants")"
    echo "hide_provider=$provider"
    echo "hide_provider_label=$(hide_provider_label "$provider")"
    if hide_assist_enabled; then
      echo "hide_try_umount_paths=${hide_paths:-}"
      if hide_read_applied; then echo "hide_applied=1"; else echo "hide_applied=0"; fi
      echo "hide_summary=$(compose_hide_summary "$assistants" "$_hs" "$_hk" "$_hn")"
    else
      echo "hide_try_umount_paths="
      echo "hide_applied=0"
      echo "hide_summary=隐藏协助已关闭，不会注册 try_umount · 可用助手：$(hide_assistants_label "$assistants")"
    fi
  } >"$HIDE_STATUS_CACHE.tmp.$$" 2>/dev/null && \
    mv -f "$HIDE_STATUS_CACHE.tmp.$$" "$HIDE_STATUS_CACHE" 2>/dev/null
}

HIDE_ASSIST_LOADED=1
