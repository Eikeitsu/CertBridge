#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

POST_HAS_LOCK=0
post_cleanup() {
  if [ "$POST_HAS_LOCK" = "1" ]; then
    release_write_lock
    POST_HAS_LOCK=0
  fi
}
trap post_cleanup 0
trap 'post_cleanup; exit 1' 1 2 15

log_msg "post-fs-data start (api=$(get_api))"
if ! acquire_write_lock; then
  echo "开机证书锁获取失败；未执行新的挂载" >"$STATEDIR/inject-error"
  log_msg "post-fs-data: lifecycle lock timeout"
  refresh_module_description >/dev/null
  exit 1
fi
POST_HAS_LOCK=1
if [ -x "$BINDIR/hot_mount.sh" ]; then
  if ! CERTBRIDGE_LOCK_HELD=1 sh "$BINDIR/hot_mount.sh" unmount_locked >/dev/null 2>&1; then
    echo "旧临时证书会话无法安全卸载；未执行新的开机挂载" >"$STATEDIR/inject-error"
    log_msg "post-fs-data: stale hot session cleanup failed"
    refresh_module_description >/dev/null
    exit 1
  fi
else
  log_msg "post-fs-data: hot reload component not installed"
fi
if ! build_boot_generation; then
  echo "实时证书集合生成失败；未执行任何挂载" >"$STATEDIR/inject-error"
  log_msg "post-fs-data: live generation failed, original store preserved"
  refresh_module_description >/dev/null
  exit 1
fi
if sh "$MODDIR/bin/apex_inject.sh" boot; then
  rm -f "$STATEDIR/inject-error"
else
  echo "开机证书注入失败；请查看日志" >"$STATEDIR/inject-error"
  log_msg "post-fs-data: boot injection failed"
fi
post_cleanup
refresh_module_description >/dev/null
log_msg "post-fs-data done"
