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
  echo "inject_error=$([ -f "$STATEDIR/inject-error" ] && echo 1 || echo 0)"
  if [ "$hot_partial" = "1" ]; then
    echo "desc_short=临时证书部分挂载，请检查命名空间状态"
  else
    echo "desc_short=$(compute_status_tag)"
  fi
  echo "status_cached=$(runtime_status_fresh && echo 1 || echo 0)"
  echo "desc_body=$(get_desc_body)"
  echo "reqable_enabled=$(read_conf reqable 1)"
  echo "reqable_active=$(is_addon_applied reqable && echo 1 || echo 0)"
  echo "reqable_name=$(get_applied_name reqable)"
  echo "proxypin_enabled=$(read_conf proxypin 1)"
  echo "proxypin_active=$(is_addon_applied proxypin && echo 1 || echo 0)"
  echo "proxypin_name=$(get_applied_name proxypin)"
  echo "version=$(grep '^version=' "$MODDIR/module.prop" 2>/dev/null | cut -d= -f2-)"
  echo "$hot_status"
}

cmd_list_custom() {
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    echo "custom|$name"
  done
}

cmd_toggle() {
  name="$1"
  value="$2"
  case "$name" in reqable|proxypin) ;; *) echo "error=invalid_toggle"; return 1 ;; esac
  [ "$value" = "1" ] || [ "$value" = "0" ] || { echo "error=invalid_value"; return 1; }
  acquire_write_lock || { echo "error=busy"; return 1; }
  write_conf "$name" "$value" || { release_write_lock; echo "error=write_failed"; return 1; }
  mark_reboot_required
  release_write_lock
  log_msg "config: $name=$value (reboot required)"
  echo "ok=1"
  echo "reboot_required=1"
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
  hash=$($openssl_cmd x509 $inform -in "$raw" -subject_hash_old -noout 2>/dev/null | tr 'A-F' 'a-f')
  case "$hash" in
    ????????) ;;
    *) rm -f "$raw" "$normalized"; echo "error=hash_failed"; return 1 ;;
  esac
  case "$hash" in *[!0-9a-f]*) rm -f "$raw" "$normalized"; echo "error=hash_failed"; return 1 ;; esac
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
  mark_reboot_required
  release_write_lock
  rm -f "$raw" "$normalized"
  log_msg "custom: installed $name (reboot required)"
  echo "ok=1"
  echo "filename=$name"
  echo "reboot_required=1"
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
  rm -f "$CUSTOM_DIR/$filename" || {
    release_write_lock
    echo "error=remove_failed"
    return 1
  }
  mark_reboot_required
  release_write_lock
  log_msg "custom: removed $filename (reboot required)"
  echo "ok=1"
  echo "reboot_required=1"
}

cmd_hot_mount() {
  mode="$1"
  sd_path="$2"
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
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
  install_custom) cmd_install_custom "$2" ;;
  remove_custom) cmd_remove_custom "$2" ;;
  hot_mount) cmd_hot_mount "$2" "$3" ;;
  hot_unmount) cmd_hot_unmount ;;
  reinject|sync)
    echo "error=hot_reload_disabled"
    echo "reboot_required=1"
    exit 1
    ;;
  *)
    echo "usage: cert_manager.sh {status|list_custom|toggle|install_custom|remove_custom|hot_mount|hot_unmount}"
    exit 1
    ;;
esac
