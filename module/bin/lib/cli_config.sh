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
  log_info "config: mount_mode=$mode (reboot required)"
  echo "ok=1"
  echo "mount_mode=$mode"
  echo "pending_reboot=1"
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
  log_info "config: tmpfs_style=$style (reboot required)"
  echo "ok=1"
  echo "tmpfs_style=$style"
  echo "pending_reboot=1"
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
  log_info "config: experimental_14_system=$mode (reboot required; API34+ both mount modes)"
  echo "ok=1"
  echo "experimental_14_system=$mode"
  echo "pending_reboot=1"
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
    log_info "config: hide_allow=0 (cleared hide state; reboot clears kernel try_umount)"
    echo "ok=1"
    echo "hide_allow=0"
    echo "hide_applied=0"
    echo "hint=已关闭；内核侧已登记项通常需重启才清除"
    return 0
  fi

  log_info "config: hide_allow=1 (register now)"
  # 立刻登记，不必等重启 / 再注入
  hide_assist_after_inject 2>/dev/null || true
  echo "ok=1"
  echo "hide_allow=1"
  if hide_read_applied 2>/dev/null; then
    echo "hide_applied=1"
    echo "hint=已当场登记。请强停目标 App 再开以验证「卸载模块」；无需为此再重启"
  else
    echo "hide_applied=0"
    if ! hide_susfs_bin_present 2>/dev/null && ! hide_susfs4ksu_module_present 2>/dev/null && \
        ! [ -x /data/adb/ksu/bin/ksud ] && ! hide_nohello_available 2>/dev/null; then
      echo "hint=本机无 SuSFS/ksud/NoHello，兼容模式脚本 bind 无法被「卸载模块」卸掉。请先安装 susfs4ksu 或确认内核支持 ksud umount"
    else
      echo "hint=探测到助手但当场登记未成功，请看模块日志 hide: 行；可再执行 hide_reregister"
    fi
  fi
}

# 仅重跑 try_umount / NoHello 登记（不重绑证书）；验证卸载时不必重启
cmd_hide_reregister() {
  [ -f "$LIBDIR/hide_assist.sh" ] || { echo "error=hide_feature_not_installed"; return 1; }
  hide_assist_enabled || { echo "error=hide_allow_off"; echo "hint=请先开启 hide_allow"; return 1; }
  hide_probe_cache_clear 2>/dev/null || true
  hide_assist_after_inject 2>/dev/null || true
  echo "ok=1"
  if hide_read_applied 2>/dev/null; then
    echo "hide_applied=1"
    echo "hint=登记完成。强停 App 再开即可测卸载，无需重启"
  else
    echo "hide_applied=0"
    echo "hint=登记未成功：检查 SuSFS/ksud/NoHello 与模块日志"
  fi
  emit_hide_status 2>/dev/null || true
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
  echo "hint=开关变更后需重启相关 App 或整机后 Zygisk 挂钩才会按新配置生效"
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
    echo "hint=下次命名空间注入时会强注 Reqable/ProxyPin；可盖掉「卸载模块」。建议仅抓包调试时开启，改后重启或等下次注入生效"
  else
    echo "hint=已恢复默认：尊重卸载模块，不再强注抓包 App"
  fi
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
