# 由 cert_manager.sh 加载；WebUI / CLI 命令实现
# status 聚合输出
cmd_status() {
  api=$(get_api)
  release=$(getprop ro.build.version.release)
  disabled=0
  [ -f "$MODDIR/disable" ] && disabled=1
  custom=$(count_certs "$CUSTOM_DIR")
  applied=$(wc -l <"$APPLIED_MAP" 2>/dev/null)
  applied=$(echo "${applied:-0}" | tr -d ' ')
  hot_supported=0
  if [ -x "$BINDIR/hot_mount.sh" ]; then
    hot_supported=1
    # 轻量 status：读会话文件，不做全命名空间扫描
    hot_status=$(sh "$BINDIR/hot_mount.sh" status light 2>/dev/null)
  else
    hot_status="hot_active=0
hot_partial=0
hot_stale=0
hot_added=0
hot_namespaces=0
hot_failed=0"
  fi
  hot_partial=$(echo "$hot_status" | awk -F= '$1 == "hot_partial" { print $2; exit }')

  module_ok=0
  [ -f "$MODDIR/module.prop" ] && [ -x "$BINDIR/apex_inject.sh" ] && [ -f "$CONF" ] && module_ok=1
  echo "module_ok=$module_ok"
  echo "hot_supported=$hot_supported"
  if [ "$hot_supported" = "1" ]; then
    echo "hot_allow=$(read_conf hot_allow 1)"
  else
    echo "hot_allow=0"
  fi
  echo "disabled=$disabled"
  echo "api=$api"
  echo "release=$release"
  echo "root=$(detect_root_impl)"
  echo "active_count=$applied"
  echo "custom_count=$custom"
  echo "base_count=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)"
  echo "store_count=$(count_certs "$GEN_CERTS")"
  if runtime_status_fresh; then
    echo "apex_ok=$(read_runtime_status apex_ok)"
  else
    echo "apex_ok=2"
  fi
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  emit_inject_error_status
  if [ "$hot_partial" = "1" ]; then
    echo "desc_short=🔥热挂载（部分未覆盖）"
  else
    echo "desc_short=$(compute_status_tag)"
  fi
  echo "status_cached=$(runtime_status_fresh && echo 1 || echo 0)"
  echo "desc_body=$(compose_webui_description)"
  echo "reqable_enabled=$(read_conf reqable 1)"
  echo "reqable_active=$(is_addon_applied reqable && echo 1 || echo 0)"
  echo "reqable_name=$(get_applied_name reqable)"
  echo "reqable_title=$(get_applied_display reqable Reqable)"
  if req_file=$(find_addon_cert reqable 0 2>/dev/null); then
    echo "reqable_available=1"
    echo "reqable_display=$(read_cert_meta_display "$req_file" "Reqable")"
  elif is_addon_applied reqable; then
    echo "reqable_available=1"
    echo "reqable_display=$(get_applied_display reqable Reqable)"
  else
    echo "reqable_available=0"
    echo "reqable_display=Reqable"
  fi
  echo "proxypin_enabled=$(read_conf proxypin 1)"
  echo "proxypin_active=$(is_addon_applied proxypin && echo 1 || echo 0)"
  echo "proxypin_name=$(get_applied_name proxypin)"
  echo "proxypin_title=$(get_applied_display proxypin ProxyPin)"
  if pp_file=$(find_addon_cert proxypin 0 2>/dev/null); then
    echo "proxypin_available=1"
    echo "proxypin_display=$(read_cert_meta_display "$pp_file" "ProxyPin")"
  elif is_addon_applied proxypin; then
    echo "proxypin_available=1"
    echo "proxypin_display=$(get_applied_display proxypin ProxyPin)"
  else
    echo "proxypin_available=0"
    echo "proxypin_display=ProxyPin"
  fi
  echo "mount_mode=$(get_mount_mode)"
  echo "tmpfs_style=$(get_tmpfs_style)"
  emit_hide_status
  emit_zn_hide_status
  emit_install_profile_status
  emit_zygisk_loader_status
  echo "version=$(grep '^version=' "$MODDIR/module.prop" 2>/dev/null | cut -d= -f2-)"
  echo "$hot_status"
}
