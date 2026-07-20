#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

log_msg "post-fs-data start (api=$(get_api))"
sync_active_certs
sh "$MODDIR/bin/apex_inject.sh" inject
log_msg "post-fs-data done"
