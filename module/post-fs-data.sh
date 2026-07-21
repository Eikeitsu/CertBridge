#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

log_msg "post-fs-data start (api=$(get_api))"
# 上一轮启动的 bind mount 已随重启消失，可安全清理旧合并目录
rm -rf "${TEMP_APEX}".* "${TEMP_SYSTEM}".* 2>/dev/null
sync_active_certs
sh "$MODDIR/bin/apex_inject.sh" inject
log_msg "post-fs-data done"
