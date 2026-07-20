#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

count=0
while [ "$(getprop sys.boot_completed)" != "1" ] && [ $count -lt 90 ]; do
  sleep 1
  count=$((count + 1))
done

sleep 3
chmod 0755 "$BINDIR"/*.sh 2>/dev/null
chmod 0644 "$CONF" 2>/dev/null
[ -d "$MODDIR/webroot" ] && find "$MODDIR/webroot" -type f -exec chmod 0644 {} \;

if [ -f "$MODDIR/t_module" ] && ! grep -q '^# ##$' "$MODDIR/module.prop" 2>/dev/null; then
  cp "$MODDIR/t_module" "$MODDIR/module.prop"
  chmod 0644 "$MODDIR/module.prop"
fi

if [ "$(read_conf auto_reinject 1)" != "1" ]; then
  refresh_module_description >/dev/null
  log_msg "service: auto_reinject disabled"
  exit 0
fi

log_msg "service: reinject after boot (${count}s)"
sync_active_certs
sh "$MODDIR/bin/apex_inject.sh" inject
refresh_module_description >/dev/null
log_msg "service done"
