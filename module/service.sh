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

if [ "$(read_conf auto_reinject 1)" != "1" ]; then
  log_msg "service: auto_reinject disabled"
  exit 0
fi

log_msg "service: reinject after boot (${count}s)"
sync_active_certs
sh "$MODDIR/bin/apex_inject.sh" inject
log_msg "service done"
