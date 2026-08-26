# 由 cert_manager.sh 加载；WebUI / CLI 命令实现
# 挂载模式、隐藏与白名单配置
cmd_set_mount_mode() {
  mode="$1"
  case "$mode" in
    compatible|magic) ;;
    *) echo "error=invalid_mount_mode"; return 1 ;;
  esac
  write_conf mount_mode "$mode" || { echo "error=write_failed"; return 1; }
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
    dev|short|legacy) ;;
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
  if [ "$val" = "0" ]; then
    hide_clear_applied 2>/dev/null || rm -f "$STATEDIR/hide-assist.conf" 2>/dev/null
    log_info "config: hide_allow=0 (cleared hide state; reboot clears kernel try_umount)"
  else
    log_info "config: hide_allow=1 (will register on next inject / hot mount)"
  fi
  echo "ok=1"
  echo "hide_allow=$val"
  echo "hint=开启后需重新注入或热挂载才会登记 try_umount；关闭后需重启以清除内核侧登记"
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
