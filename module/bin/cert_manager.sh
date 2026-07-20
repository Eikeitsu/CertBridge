#!/system/bin/sh
# CLI for WebUI / action

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

cmd_status() {
  api=$(get_api)
  release=$(getprop ro.build.version.release)
  disabled=0
  [ -f "$MODDIR/disable" ] && disabled=1

  sync_active_certs
  active=$(ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | wc -l)
  active=$(echo "$active" | tr -d ' ')
  custom=$(ls -1 "$CUSTOM_DIR"/*.0 2>/dev/null | wc -l)
  custom=$(echo "$custom" | tr -d ' ')

  apex_ok=0
  if [ "$api" -ge 34 ]; then
    first=$(ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | head -1)
    if [ -n "$first" ] && [ -f "$APEX_CACERTS/$(basename "$first")" ]; then
      apex_ok=1
    fi
  else
    apex_ok=2
  fi

  reqable_en=$(read_conf reqable 1)
  proxypin_en=$(read_conf proxypin 1)
  reqable_file=0
  proxypin_file=0
  [ -f "$ACTIVE_DIR/833e2479.0" ] && reqable_file=1
  [ -f "$ACTIVE_DIR/243f0bfb.0" ] && proxypin_file=1

  root_impl=Magisk
  [ "$KSU" = "true" ] && root_impl=KernelSU
  [ "$APATCH" = "true" ] && root_impl=APatch

  echo "module_ok=1"
  echo "disabled=$disabled"
  echo "api=$api"
  echo "release=$release"
  echo "root=$root_impl"
  echo "active_count=$active"
  echo "custom_count=$custom"
  echo "apex_ok=$apex_ok"
  echo "reqable_enabled=$reqable_en"
  echo "reqable_active=$reqable_file"
  echo "proxypin_enabled=$proxypin_en"
  echo "proxypin_active=$proxypin_file"
  echo "auto_reinject=$(read_conf auto_reinject 1)"
  echo "version=$(grep '^version=' "$MODDIR/module.prop" 2>/dev/null | cut -d= -f2-)"
}

cmd_list_custom() {
  for cert in "$CUSTOM_DIR"/*.0; do
    [ -f "$cert" ] || continue
  echo "custom|$(basename "$cert")"
  done
}

cmd_toggle() {
  name="$1"
  value="$2"
  case "$name" in
    reqable|proxypin|auto_reinject)
      [ "$value" = "1" ] || [ "$value" = "0" ] || return 1
      write_conf "$name" "$value"
      sync_active_certs
      sh "$BINDIR/apex_inject.sh" inject
      log_msg "toggle $name=$value"
      ;;
    *) return 1 ;;
  esac
}

cmd_install_custom() {
  b64="$1"
  filename="$2"
  case "$filename" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f].0) ;;
    *) echo "error=invalid_filename"; return 1 ;;
  esac
  tmp="/data/local/tmp/cacertstore-upload.cert"
  mkdir -p "$CUSTOM_DIR"
  echo "$b64" | base64 -d >"$tmp" 2>/dev/null || { echo "error=decode_failed"; return 1; }
  install -m 0644 -o 0 -g 0 "$tmp" "$CUSTOM_DIR/$filename"
  rm -f "$tmp"
  sync_active_certs
  sh "$BINDIR/apex_inject.sh" inject
  log_msg "install_custom $filename"
  echo "ok=1"
}

cmd_remove_custom() {
  filename="$1"
  case "$filename" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f].0) ;;
    *) echo "error=invalid_filename"; return 1 ;;
  esac
  rm -f "$CUSTOM_DIR/$filename"
  sync_active_certs
  sh "$BINDIR/apex_inject.sh" inject
  log_msg "remove_custom $filename"
  echo "ok=1"
}

cmd_reinject() {
  sync_active_certs
  sh "$BINDIR/apex_inject.sh" inject
  log_msg "manual reinject"
  echo "ok=1"
}

cmd_sync() {
  sync_active_certs
  sh "$BINDIR/apex_inject.sh" inject
  echo "ok=1"
}

case "$1" in
  status) cmd_status ;;
  list_custom) cmd_list_custom ;;
  toggle) cmd_toggle "$2" "$3" ;;
  install_custom) cmd_install_custom "$2" "$3" ;;
  remove_custom) cmd_remove_custom "$2" ;;
  reinject) cmd_reinject ;;
  sync) cmd_sync ;;
  *)
    echo "usage: cert_manager.sh {status|list_custom|toggle|install_custom|remove_custom|reinject|sync}"
    exit 1
    ;;
esac
