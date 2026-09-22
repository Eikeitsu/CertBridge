#!/system/bin/sh
# 由 cert_manager.sh 加载；WebUI / CLI 命令实现
# 挂载模式、隐藏与白名单配置
cmd_set_mount_mode() {
  mode="$1"
  case "$mode" in
    compatible|magic) ;;
    *) echo "error=invalid_mount_mode"; return 1 ;;
  esac
  write_conf mount_mode "$mode" || { echo "error=write_failed"; return 1; }
  # 立刻按新模式清理 / 同步 staged，避免下次开机前脏 overlay
  prepare_mount_mode_overlay "$MODDIR" 2>/dev/null || true
  pending_line=$(note_conf_dirty)
  log_info "config: mount_mode=$mode"
  echo "ok=1"
  echo "mount_mode=$mode"
  echo "$pending_line"
}

cmd_set_tmpfs_style() {
  style="$1"
  case "$style" in
    dev|short|legacy|mnt) ;;
    *) echo "error=invalid_tmpfs_style"; return 1 ;;
  esac
  write_conf tmpfs_style "$style" || { echo "error=write_failed"; return 1; }
  apply_tmpfs_style
  pending_line=$(note_conf_dirty)
  log_info "config: tmpfs_style=$style"
  echo "ok=1"
  echo "tmpfs_style=$style"
  echo "$pending_line"
}

cmd_set_experimental_14_system() {
  mode="$1"
  case "$mode" in
    auto|skip) ;;
    off|default|follow) mode=auto ;;
    none|apex_only) mode=skip ;;
    overlay|apex_overlay)
      echo "error=overlay_deprecated_use_magic_or_skip"
      echo "hint=需要 system 叠 addon 请设 mount_mode=magic；需要跳过 system 请设 skip"
      return 1
      ;;
    *) echo "error=invalid_experimental_14_system"; return 1 ;;
  esac
  write_conf experimental_14_system "$mode" || { echo "error=write_failed"; return 1; }
  prepare_mount_mode_overlay "$MODDIR" 2>/dev/null || true
  pending_line=$(note_conf_dirty)
  log_info "config: experimental_14_system=$mode (API34+ both mount modes)"
  echo "ok=1"
  echo "experimental_14_system=$mode"
  echo "$pending_line"
}

cmd_set_quiet_prop() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_quiet_prop"; return 1 ;;
  esac
  write_conf quiet_prop "$val" || { echo "error=write_failed"; return 1; }
  # 立刻刷新简介，无需重启
  update_module_description 2>/dev/null || true
  log_info "config: quiet_prop=$val"
  echo "ok=1"
  echo "quiet_prop=$val"
}

cmd_set_hot_allow() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_hot_allow"; return 1 ;;
  esac
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
  write_conf hot_allow "$val" || { echo "error=write_failed"; return 1; }
  if [ "$val" = "0" ]; then
    hot_status=$(sh "$BINDIR/hot_mount.sh" status light 2>/dev/null)
    hot_active=$(echo "$hot_status" | awk -F= '$1 == "hot_active" { print $2; exit }')
    if [ "$hot_active" = "1" ]; then
      cmd_hot_unmount
      return $?
    fi
  fi
  log_info "config: hot_allow=$val"
  echo "ok=1"
  echo "hot_allow=$val"
}

cmd_set_hide_allow() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_hide_allow"; return 1 ;;
  esac
  [ -f "$LIBDIR/hide_assist.sh" ] || { echo "error=hide_feature_not_installed"; return 1; }
  write_conf hide_allow "$val" || { echo "error=write_failed"; return 1; }
  hide_probe_cache_clear 2>/dev/null || true
  if [ "$val" = "0" ]; then
    hide_clear_applied 2>/dev/null || rm -f "$STATEDIR/hide-assist.conf" 2>/dev/null
    log_info "config: hide_allow=0 (cleared hide state + ksud umount del)"
    echo "ok=1"
    echo "hide_allow=0"
    echo "hide_applied=0"
    echo "hint=已关闭；已清 try_umount.txt / NoHello，并尝试 ksud del（有 ksud 时即时）"
    return 0
  fi

  log_info "config: hide_allow=1 (queue background register)"
  # 立刻返回，避免 WebUI 开关卡住；登记放后台
  (
    hide_assist_after_inject 2>/dev/null || true
  ) >>"$LOG_FILE" 2>&1 &
  echo "ok=1"
  echo "hide_allow=1"
  echo "hide_applied=0"
  echo "hint=已开启，后台登记中；稍后刷新实况。验证卸载请强停 App，无需重启"
}

# 仅重跑 try_umount / NoHello 登记（不重绑证书）；后台执行以免卡住
cmd_hide_reregister() {
  [ -f "$LIBDIR/hide_assist.sh" ] || { echo "error=hide_feature_not_installed"; return 1; }
  hide_assist_enabled || { echo "error=hide_allow_off"; echo "hint=请先开启 hide_allow"; return 1; }
  hide_probe_cache_clear 2>/dev/null || true
  (
    hide_assist_after_inject 2>/dev/null || true
  ) >>"$LOG_FILE" 2>&1 &
  echo "ok=1"
  echo "hint=已在后台重新登记；数秒后刷新隐藏实况"
}

cmd_set_zn_hide_allow() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_zn_hide_allow"; return 1 ;;
  esac
  zn_hide_component_present || { echo "error=zn_hide_feature_not_installed"; return 1; }
  write_conf zn_hide_allow "$val" || { echo "error=write_failed"; return 1; }
  log_info "config: zn_hide_allow=$val (Zygisk mount filter; reboot apps / device to apply)"
  echo "ok=1"
  echo "zn_hide_allow=$val"
  echo "hint=已保存；强停相关 App 后生效（不必整机重启）"
}

cmd_set_force_bind_capture() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_force_bind_capture"; return 1 ;;
  esac
  write_conf force_bind_capture "$val" || { echo "error=write_failed"; return 1; }
  log_info "config: force_bind_capture=$val"
  echo "ok=1"
  echo "force_bind_capture=$val"
  if [ "$val" = "1" ]; then
    # 后台补绑正在运行的抓包 App（不重建 stage，不阻塞 WebUI）
    (
      # shellcheck disable=SC1090
      . "$LIBDIR/inject/inject_bind.sh"
      force_bind_capture_now 2>/dev/null || true
    ) >>"$LOG_FILE" 2>&1 &
    echo "hint=已开启；若抓包 App 在运行将后台补绑，否则打开即可。可能盖掉「卸载模块」"
  else
    echo "hint=已关闭；请强停抓包 App 再开，以去掉已绑挂载（不必整机重启）"
  fi
}

cmd_set_late_inject() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_late_inject"; return 1 ;;
  esac
  write_conf late_inject "$val" || { echo "error=write_failed"; return 1; }
  log_info "config: late_inject=$val"
  echo "ok=1"
  echo "late_inject=$val"
  if [ "$val" = "1" ]; then
    (
      sh "$BINDIR/apex_inject.sh" namespaces 2>/dev/null || true
    ) >>"$LOG_FILE" 2>&1 &
    echo "hint=已开启晚注入；后台尝试补一次应用命名空间，之后每次开机 service 都会注入"
  else
    echo "hint=已关闭；下次开机 service 不再 namespaces 注入（当前挂载仍在，重启后仅靠 boot 注入）"
  fi
}

cmd_set_boot_bind_zygote() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_boot_bind_zygote"; return 1 ;;
  esac
  write_conf boot_bind_zygote "$val" || { echo "error=write_failed"; return 1; }
  pending_line=$(note_conf_dirty)
  log_info "config: boot_bind_zygote=$val"
  echo "ok=1"
  echo "boot_bind_zygote=$val"
  echo "$pending_line"
  if [ "$val" = "0" ]; then
    echo "hint=已关闭开机 Zygote 注入；重启后仅 bind init，部分机可能缺证"
  else
    echo "hint=已开启开机 Zygote 注入；重启后生效"
  fi
}

cmd_set_boot_multi_apex() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_boot_multi_apex"; return 1 ;;
  esac
  write_conf boot_multi_apex "$val" || { echo "error=write_failed"; return 1; }
  pending_line=$(note_conf_dirty)
  log_info "config: boot_multi_apex=$val"
  echo "ok=1"
  echo "boot_multi_apex=$val"
  echo "$pending_line"
  if [ "$val" = "0" ]; then
    echo "hint=已改为精简 boot：14+ 仅主 APEX（跳过 @版本与 system）；重启后生效"
  else
    echo "hint=已开启完整目标列表（尊重双模式）；重启后生效"
  fi
}

cmd_set_service_probe() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_service_probe"; return 1 ;;
  esac
  write_conf service_probe "$val" || { echo "error=write_failed"; return 1; }
  log_info "config: service_probe=$val"
  echo "ok=1"
  echo "service_probe=$val"
  if [ "$val" = "0" ]; then
    echo "hint=probe off"
  else
    echo "hint=probe on (needs late_inject=1)"
  fi
}

cmd_set_ui_lang() {
  val="$1"
  case "$val" in
    system|zh-CN|en) ;;
    zh|zh_CN) val=zh-CN ;;
    en-US|en_US) val=en ;;
    auto) val=system ;;
    *) echo "error=invalid_ui_lang"; return 1 ;;
  esac
  write_conf ui_lang "$val" || { echo "error=write_failed"; return 1; }
  i18n_load >/dev/null 2>&1 || true
  update_module_description 2>/dev/null || true
  log_info "config: ui_lang=$val resolved=$(resolve_ui_lang)"
  echo "ok=1"
  echo "ui_lang=$val"
  echo "ui_lang_resolved=$(resolve_ui_lang)"
}

ZN_WHITELIST_FILE="$CONFDIR/zn_whitelist.txt"

cmd_get_zn_whitelist() {
  zn_hide_component_present || { echo "error=zn_hide_feature_not_installed"; return 1; }
  echo "ok=1"
  if [ -f "$ZN_WHITELIST_FILE" ]; then
    # 正文用 marker 包起，便于 WebUI 原样还原
    echo "begin_whitelist"
    cat "$ZN_WHITELIST_FILE" 2>/dev/null
    echo "end_whitelist"
  else
    echo "begin_whitelist"
    echo "end_whitelist"
  fi
}

cmd_set_zn_whitelist() {
  b64="$1"
  zn_hide_component_present || { echo "error=zn_hide_feature_not_installed"; return 1; }
  mkdir -p "$CONFDIR" 2>/dev/null || { echo "error=write_failed"; return 1; }
  raw="$DATADIR/zn_wl.$$.txt"
  mkdir -p "$DATADIR" 2>/dev/null
  if [ -z "$b64" ]; then
    : >"$raw"
  else
    echo "$b64" | base64 -d >"$raw" 2>/dev/null || {
      rm -f "$raw"
      echo "error=decode_failed"
      return 1
    }
  fi
  size=$(wc -c <"$raw" 2>/dev/null)
  if [ "${size:-0}" -gt 65536 ]; then
    rm -f "$raw"
    echo "error=invalid_size"
    return 1
  fi
  # 只保留包名行与注释，去掉空行过多噪音
  filtered="$DATADIR/zn_wl.$$.f"
  awk '
    {
      line=$0
      gsub(/\r/, "", line)
      if (line ~ /^[ \t]*$/) next
      print line
    }
  ' "$raw" >"$filtered" 2>/dev/null || cp -f "$raw" "$filtered"
  chmod 0600 "$filtered" 2>/dev/null
  if cat "$filtered" >"$ZN_WHITELIST_FILE" 2>/dev/null; then
    rm -f "$raw" "$filtered"
  elif mv -f "$filtered" "$ZN_WHITELIST_FILE" 2>/dev/null; then
    rm -f "$raw"
  else
    rm -f "$raw" "$filtered"
    echo "error=write_failed"
    return 1
  fi
  chmod 0600 "$ZN_WHITELIST_FILE" 2>/dev/null
  log_info "config: zn_whitelist updated ($(wc -l <"$ZN_WHITELIST_FILE" | tr -d ' ') lines)"
  echo "ok=1"
  echo "hint=白名单已保存；强停相关 App 或重启后 Zygisk 过滤按新名单生效"
}
