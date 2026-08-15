#!/system/bin/sh
# CLI for WebUI. Read commands never mutate module state.
# Certificate changes are persisted and applied only after reboot.

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

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
  echo "version=$(grep '^version=' "$MODDIR/module.prop" 2>/dev/null | cut -d= -f2-)"
  echo "$hot_status"
}

cmd_list_custom() {
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    display=$(read_cert_meta_display "$cert" "$name")
    display=$(echo "$display" | tr '|' '/')
    echo "custom|$name|$display"
  done
}

cmd_toggle() {
  name="$1"
  value="$2"
  case "$name" in reqable|proxypin) ;; *) echo "error=invalid_toggle"; return 1 ;; esac
  [ "$value" = "1" ] || [ "$value" = "0" ] || { echo "error=invalid_value"; return 1; }
  if [ "$value" = "1" ]; then
    # 开启：尽量从 App 刷新；关断后 sources 空时从 generation 回填；仍无来源才拒绝
    sync_source_from_app "$name" >/dev/null 2>&1 || true
    ensure_source_from_applied "$name" >/dev/null 2>&1 || true
    if ! addon_can_enable "$name"; then
      echo "error=certificate_unavailable"
      echo "hint=请先在对应 App 中生成根证书，或使用自定义导入"
      return 1
    fi
  else
    # 关闭：保留 sources；若本就没有 sources，趁 generation 还在先回填一份，方便立刻重开
    ensure_source_from_applied "$name" >/dev/null 2>&1 || true
  fi
  acquire_write_lock || { echo "error=busy"; return 1; }
  write_conf "$name" "$value" || { release_write_lock; echo "error=write_failed"; return 1; }
  if is_magic_mount_mode; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  pending_line=$(update_reboot_required_flag)
  release_write_lock
  if echo "$pending_line" | grep -q 'reboot_required=1'; then
    log_msg "config: $name=$value (reboot required)"
  else
    log_msg "config: $name=$value (matches applied, pending cleared)"
  fi
  refresh_module_description_light >/dev/null 2>&1
  echo "ok=1"
  echo "${name}_enabled=$value"
  if addon_can_enable "$name"; then
    echo "${name}_available=1"
  else
    echo "${name}_available=0"
  fi
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  echo "$pending_line"
}

cmd_sync_apps() {
  out=$(sync_enabled_app_sources)
  echo "$out"
  updated=$(echo "$out" | awk -F= '$1 == "updated" { print $2; exit }')
  if [ "${updated:-0}" -gt 0 ] 2>/dev/null; then
    pending_line=$(update_reboot_required_flag)
    echo "$pending_line"
    refresh_module_description_light >/dev/null 2>&1
  else
    refresh_module_description_light >/dev/null 2>&1
  fi
}

cmd_install_custom() {
  b64="$1"
  raw="$DATADIR/upload.$$.raw"
  normalized="$DATADIR/upload.$$.pem"
  mkdir -p "$DATADIR" "$CUSTOM_DIR"
  chmod 0700 "$DATADIR" "$CUSTOM_DIR" 2>/dev/null
  echo "$b64" | base64 -d >"$raw" 2>/dev/null || {
    rm -f "$raw" "$normalized"
    echo "error=decode_failed"
    return 1
  }
  chmod 0600 "$raw"
  size=$(wc -c <"$raw" 2>/dev/null)
  if [ "${size:-0}" -le 0 ] || [ "$size" -gt "$MAX_CUSTOM_BYTES" ]; then
    rm -f "$raw" "$normalized"
    echo "error=invalid_size"
    return 1
  fi

  openssl_cmd=$(find_openssl) || {
    rm -f "$raw" "$normalized"
    echo "error=openssl_unavailable"
    return 1
  }
  inform=""
  if $openssl_cmd x509 -in "$raw" -noout >/dev/null 2>&1; then
    inform=""
  elif $openssl_cmd x509 -inform DER -in "$raw" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  else
    rm -f "$raw" "$normalized"
    echo "error=invalid_x509"
    return 1
  fi

  $openssl_cmd x509 $inform -in "$raw" -checkend 0 -noout >/dev/null 2>&1 || {
    rm -f "$raw" "$normalized"
    echo "error=expired_certificate"
    return 1
  }
  $openssl_cmd x509 $inform -in "$raw" -noout -text 2>/dev/null | \
    grep -q 'CA:TRUE' || {
      rm -f "$raw" "$normalized"
      echo "error=not_ca_certificate"
      return 1
    }
  hash=$(openssl_subject_hash "$openssl_cmd" "$inform" "$raw") || {
    rm -f "$raw" "$normalized"
    echo "error=hash_failed"
    return 1
  }
  $openssl_cmd x509 $inform -in "$raw" -out "$normalized" >/dev/null 2>&1 || {
    rm -f "$raw" "$normalized"
    echo "error=normalize_failed"
    return 1
  }

  acquire_write_lock || { rm -f "$raw" "$normalized"; echo "error=busy"; return 1; }
  name=$(next_collision_name "$normalized" "$CUSTOM_DIR" "$hash.0") || {
    release_write_lock
    rm -f "$raw" "$normalized"
    echo "error=too_many_collisions"
    return 1
  }
  if [ ! -f "$CUSTOM_DIR/$name" ]; then
    install -m 0600 -o 0 -g 0 "$normalized" "$CUSTOM_DIR/$name" || {
      release_write_lock
      rm -f "$raw" "$normalized"
      echo "error=install_failed"
      return 1
    }
  fi
  display=$(cert_display_name_from_file "$CUSTOM_DIR/$name" "$name")
  printf 'display_name=%s\n' "$display" >"$CUSTOM_DIR/$name.meta"
  chmod 0600 "$CUSTOM_DIR/$name.meta" 2>/dev/null
  pending_line=$(update_reboot_required_flag)
  if is_magic_mount_mode; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  rm -f "$raw" "$normalized"
  if echo "$pending_line" | grep -q 'reboot_required=1'; then
    log_msg "custom: installed $name ($display, reboot required)"
  else
    log_msg "custom: installed $name ($display, matches applied)"
  fi
  refresh_module_description_light >/dev/null 2>&1
  echo "ok=1"
  echo "filename=$name"
  echo "display_name=$display"
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  echo "$pending_line"
}

cmd_remove_custom() {
  filename="$1"
  is_cert_filename "$filename" || { echo "error=invalid_filename"; return 1; }
  acquire_write_lock || { echo "error=busy"; return 1; }
  [ -f "$CUSTOM_DIR/$filename" ] || {
    release_write_lock
    echo "error=not_found"
    return 1
  }
  rm -f "$CUSTOM_DIR/$filename" "$CUSTOM_DIR/$filename.meta" || {
    release_write_lock
    echo "error=remove_failed"
    return 1
  }
  pending_line=$(update_reboot_required_flag)
  if is_magic_mount_mode; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  if echo "$pending_line" | grep -q 'reboot_required=1'; then
    log_msg "custom: removed $filename (reboot required)"
  else
    log_msg "custom: removed $filename (matches applied, pending cleared)"
  fi
  refresh_module_description_light >/dev/null 2>&1
  echo "ok=1"
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  echo "$pending_line"
}

cmd_cert_info() {
  target="$1"
  case "$target" in
    reqable|proxypin)
      file=$(find_addon_cert "$target" 0) || {
        echo "error=not_found"
        return 1
      }
      ;;
    custom:*)
      name=${target#custom:}
      is_cert_filename "$name" || {
        echo "error=invalid_filename"
        return 1
      }
      file="$CUSTOM_DIR/$name"
      ;;
    *)
      echo "error=invalid_target"
      return 1
      ;;
  esac
  cert_info_from_file "$file"
}

cmd_set_mount_mode() {
  mode="$1"
  case "$mode" in
    compatible|magic) ;;
    *) echo "error=invalid_mount_mode"; return 1 ;;
  esac
  acquire_write_lock || { echo "error=busy"; return 1; }
  write_conf mount_mode "$mode" || { release_write_lock; echo "error=write_failed"; return 1; }
  if [ "$mode" = "magic" ]; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  else
    clear_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  pending_line=$(update_reboot_required_flag)
  release_write_lock
  if echo "$pending_line" | grep -q 'reboot_required=1'; then
    log_msg "config: mount_mode=$mode (reboot required)"
  else
    log_msg "config: mount_mode=$mode (matches applied, pending cleared)"
  fi
  refresh_module_description_light >/dev/null 2>&1
  echo "ok=1"
  echo "mount_mode=$mode"
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  echo "$pending_line"
}

cmd_set_tmpfs_style() {
  style="$1"
  case "$style" in
    short|legacy) ;;
    *) echo "error=invalid_tmpfs_style"; return 1 ;;
  esac
  acquire_write_lock || { echo "error=busy"; return 1; }
  write_conf tmpfs_style "$style" || { release_write_lock; echo "error=write_failed"; return 1; }
  apply_tmpfs_style
  pending_line=$(update_reboot_required_flag)
  release_write_lock
  if echo "$pending_line" | grep -q 'reboot_required=1'; then
    log_msg "config: tmpfs_style=$style (reboot required)"
  else
    log_msg "config: tmpfs_style=$style (matches applied, pending cleared)"
  fi
  refresh_module_description_light >/dev/null 2>&1
  echo "ok=1"
  echo "tmpfs_style=$style"
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
  echo "$pending_line"
}

cmd_set_hot_allow() {
  val="$1"
  case "$val" in
    0|1) ;;
    *) echo "error=invalid_hot_allow"; return 1 ;;
  esac
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
  acquire_write_lock || { echo "error=busy"; return 1; }
  write_conf hot_allow "$val" || { release_write_lock; echo "error=write_failed"; return 1; }
  release_write_lock
  if [ "$val" = "0" ]; then
    hot_status=$(sh "$BINDIR/hot_mount.sh" status light 2>/dev/null)
    hot_active=$(echo "$hot_status" | awk -F= '$1 == "hot_active" { print $2; exit }')
    if [ "$hot_active" = "1" ]; then
      cmd_hot_unmount
      return $?
    fi
  fi
  log_msg "config: hot_allow=$val"
  refresh_module_description_light >/dev/null 2>&1
  echo "ok=1"
  echo "hot_allow=$val"
  echo "pending_reboot=$([ -f "$PENDING_FILE" ] && echo 1 || echo 0)"
}

cmd_hot_mount() {
  mode="$1"
  sd_path="$2"
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
  [ "$(read_conf hot_allow 1)" = "1" ] || { echo "error=hot_allow_disabled"; return 1; }
  case "$mode" in user|sd|all) ;; *) echo "error=invalid_mode"; return 1 ;; esac
  sh "$BINDIR/hot_mount.sh" mount "$mode" "$sd_path"
}

cmd_hot_unmount() {
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
  sh "$BINDIR/hot_mount.sh" unmount
}

case "$1" in
  status) cmd_status ;;
  list_custom) cmd_list_custom ;;
  toggle) cmd_toggle "$2" "$3" ;;
  sync_apps) cmd_sync_apps ;;
  set_mount_mode) cmd_set_mount_mode "$2" ;;
  set_tmpfs_style) cmd_set_tmpfs_style "$2" ;;
  install_custom) cmd_install_custom "$2" ;;
  remove_custom) cmd_remove_custom "$2" ;;
  cert_info) cmd_cert_info "$2" ;;
  hot_mount) cmd_hot_mount "$2" "$3" ;;
  hot_unmount) cmd_hot_unmount ;;
  set_hot_allow) cmd_set_hot_allow "$2" ;;
  reinject|sync)
    echo "error=hot_reload_disabled"
    echo "reboot_required=1"
    exit 1
    ;;
  *)
    echo "usage: cert_manager.sh {status|list_custom|toggle|sync_apps|set_mount_mode|set_tmpfs_style|set_hot_allow|install_custom|remove_custom|cert_info|hot_mount|hot_unmount}"
    exit 1
    ;;
esac
