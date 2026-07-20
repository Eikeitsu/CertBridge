#!/system/bin/sh
# Android 14+ APEX CA injection

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

inject_apex() {
  api=$(get_api)
  [ "$api" -ge 34 ] || return 0

  if [ ! -d "$APEX_CACERTS" ]; then
    log_msg "apex_inject: APEX path missing"
    return 1
  fi

  sync_active_certs

  cert_count=$(ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | wc -l)
  cert_count=$(echo "$cert_count" | tr -d ' ')
  if [ "$cert_count" -eq 0 ]; then
    log_msg "apex_inject: no active certificates"
    return 0
  fi

  umount "$TEMP_APEX" 2>/dev/null
  rm -rf "$TEMP_APEX" 2>/dev/null
  mkdir -p "$TEMP_APEX"

  if ! mount -t tmpfs tmpfs "$TEMP_APEX"; then
    log_msg "apex_inject: tmpfs mount failed"
    return 1
  fi

  cp -a "$APEX_CACERTS"/* "$TEMP_APEX/" 2>/dev/null
  cp -f "$ACTIVE_DIR"/*.0 "$TEMP_APEX/" 2>/dev/null

  chown -R 0:0 "$TEMP_APEX"
  chmod 755 "$TEMP_APEX"
  chmod 644 "$TEMP_APEX"/*.0 2>/dev/null
  set_selinux_context "$APEX_CACERTS" "$TEMP_APEX"

  orig=$(ls -1 "$APEX_CACERTS"/*.0 2>/dev/null | wc -l)
  merged=$(ls -1 "$TEMP_APEX"/*.0 2>/dev/null | wc -l)
  log_msg "apex_inject: system=$orig merged=$merged"

  mount --bind "$TEMP_APEX" "$APEX_CACERTS" 2>/dev/null
  nsenter --mount=/proc/1/ns/mnt -- mount --bind "$TEMP_APEX" "$APEX_CACERTS" 2>/dev/null

  for zygote in zygote zygote64; do
    pid=$(pidof "$zygote" 2>/dev/null)
    [ -n "$pid" ] && nsenter --mount=/proc/$pid/ns/mnt -- mount --bind "$TEMP_APEX" "$APEX_CACERTS" 2>/dev/null
  done

  settings_pid=$(pidof com.android.settings 2>/dev/null)
  [ -n "$settings_pid" ] && nsenter --mount=/proc/$settings_pid/ns/mnt -- mount --bind "$TEMP_APEX" "$APEX_CACERTS" 2>/dev/null

  return 0
}

inject_system_legacy() {
  api=$(get_api)
  [ "$api" -lt 34 ] || return 0
  sync_active_certs
  log_msg "inject_system_legacy: magic mount handles certs"
}

case "${1:-inject}" in
  inject)
    inject_apex
    inject_system_legacy
    ;;
  *)
    inject_apex
    ;;
esac
