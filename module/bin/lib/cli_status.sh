#!/system/bin/sh
# 由 cert_manager.sh 加载；WebUI / CLI 命令实现
# status 聚合输出
# live=1 时强制实测并回写 runtime-status，再输出（供刷新复核 / adb）
# quick=1 首屏：跳过慢探测（ksud/Zygisk/扫证），后台 enrich 再补全

_emit_builtin_cert_block() {
  kind="$1"
  title_fb="$2"
  quick="$3"
  echo "${kind}_enabled=$(read_conf "$kind" 1)"
  echo "${kind}_active=$(is_addon_applied "$kind" && echo 1 || echo 0)"
  echo "${kind}_name=$(get_applied_name "$kind")"
  echo "${kind}_title=$(get_applied_display "$kind" "$title_fb")"
  if [ "$quick" = "1" ]; then
    avail=0
    if is_addon_applied "$kind"; then
      avail=1
    elif find_applied_gen_cert "$kind" >/dev/null 2>&1; then
      avail=1
    elif stash_has_cert "$kind" 2>/dev/null; then
      avail=1
    else
      _src="${SOURCES_DIR:-${CB_EXT_DIR:-/data/adb/certbridge}/addon-sources}/$kind"
      for _f in "$_src"/*; do
        [ -f "$_f" ] || continue
        case "$_f" in *.meta) continue ;; esac
        avail=1
        break
      done
    fi
    echo "${kind}_available=$avail"
    echo "${kind}_display=$title_fb"
    return 0
  fi
  if cert_file=$(find_addon_cert "$kind" 0 2>/dev/null); then
    echo "${kind}_available=1"
    echo "${kind}_display=$(read_cert_meta_display "$cert_file" "$title_fb")"
  elif find_applied_gen_cert "$kind" >/dev/null 2>&1; then
    echo "${kind}_available=1"
    echo "${kind}_display=$(get_applied_display "$kind" "$title_fb")"
  elif stash_has_cert "$kind"; then
    echo "${kind}_available=1"
    echo "${kind}_display=$title_fb"
  elif [ "${4:-0}" = "1" ] && find_live_app_cert "$kind" 0 >/dev/null 2>&1; then
    echo "${kind}_available=1"
    echo "${kind}_display=$title_fb"
  else
    echo "${kind}_available=0"
    echo "${kind}_display=$title_fb"
  fi
}

# 首屏：只读 conf，不跑 ksud / SuSFS 探测
emit_hide_status_quick() {
  echo "hide_supported=1"
  echo "hide_allow=$(read_conf hide_allow 0)"
  echo "stage_root=${RUNTIME_MOUNT_ROOT:-}"
  echo "hide_susfs=0"
  echo "hide_ksud_umount=0"
  echo "hide_nohello=0"
  echo "hide_kernel_umount_feature=0"
  echo "hide_try_umount_paths="
  echo "hide_provider=none"
  echo "hide_provider_label="
  echo "hide_applied=0"
  echo "hide_summary="
}

emit_zygisk_loader_status_quick() {
  cache="$STATEDIR/zygisk-loader.cache"
  if [ -f "$cache" ]; then
    # shellcheck disable=SC1090
    . "$cache" 2>/dev/null && return 0
  fi
  echo "zygisk_loader=unknown"
  echo "zygisk_loader_label="
  echo "zygisk_loader_ok=1"
}

cmd_status() {
  live=0
  quick=0
  case "${1:-}" in
    --live|live|verify) live=1 ;;
    --quick|quick) quick=1 ;;
  esac
  if [ "$live" = "1" ]; then
    clear_stale_hot_update_marker 2>/dev/null || true
    live_finalize_runtime_status live >/dev/null 2>&1 || true
  fi

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
    if [ "$quick" = "1" ]; then
      # 首屏只看会话文件是否存在，不跑 hot_mount.sh
      if [ -f "$STATEDIR/hot-session.conf" ]; then
        hot_status=$(awk -F= '
          $1=="added_count"{a=$2}
          $1=="namespace_failed"{f=$2}
          $1=="mode"{m=$2}
          END{
            print "hot_active=1"
            print "hot_partial=" (f+0>0?"1":"0")
            print "hot_stale=0"
            print "hot_added=" (a+0)
            print "hot_namespaces=0"
            print "hot_failed=" (f+0)
            if (m!="") print "hot_mode=" m
          }' "$STATEDIR/hot-session.conf" 2>/dev/null)
      else
        hot_status="hot_active=0
hot_partial=0
hot_stale=0
hot_added=0
hot_namespaces=0
hot_failed=0"
      fi
    else
      hot_status=$(sh "$BINDIR/hot_mount.sh" status light 2>/dev/null)
    fi
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
    echo "status_phase=$(read_runtime_status phase)"
    echo "status_tag=$(read_runtime_status tag)"
  else
    echo "apex_ok=2"
    echo "status_phase="
    echo "status_tag="
  fi
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  emit_inject_error_status
  if [ "$hot_partial" = "1" ]; then
    echo "desc_short=🔥热挂载（部分未覆盖）"
  else
    echo "desc_short=$(compute_status_tag)"
  fi
  echo "status_cached=$(runtime_status_fresh && echo 1 || echo 0)"
  echo "status_live=$live"
  echo "status_quick=$quick"
  echo "desc_body=$(compose_webui_description)"
  _emit_builtin_cert_block reqable Reqable "$quick" "$live"
  _emit_builtin_cert_block proxypin ProxyPin "$quick" "$live"
  echo "mount_mode=$(get_mount_mode)"
  echo "experimental_14_system=$(get_experimental_14_system)"
  echo "tmpfs_style=$(get_tmpfs_style)"
  if is_quiet_prop 2>/dev/null; then
    echo "quiet_prop=1"
  else
    echo "quiet_prop=0"
  fi
  if [ "$quick" = "1" ]; then
    emit_hide_status_quick
    emit_zn_hide_status
    emit_install_profile_status
    emit_zygisk_loader_status_quick
  else
    emit_hide_status
    emit_zn_hide_status
    emit_install_profile_status
    emit_zygisk_loader_status
  fi
  echo "force_bind_capture=$(read_conf force_bind_capture 0)"
  echo "late_inject=$(read_conf late_inject 0)"
  echo "boot_bind_zygote=$(read_conf boot_bind_zygote 0)"
  echo "boot_multi_apex=$(read_conf boot_multi_apex 0)"
  echo "service_probe=$(read_conf service_probe 0)"
  echo "ui_lang=$(read_conf ui_lang system)"
  echo "ui_lang_resolved=$(resolve_ui_lang 2>/dev/null || echo en)"
  echo "version=$(grep '^version=' "$MODDIR/module.prop" 2>/dev/null | cut -d= -f2-)"
  echo "$hot_status"
}

cmd_verify() {
  cmd_status --live
}
