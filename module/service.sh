#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

SERVICE_HAS_LOCK=0
service_finalize() {
  if [ "$SERVICE_HAS_LOCK" = "1" ]; then
    release_write_lock
    SERVICE_HAS_LOCK=0
  fi
  finalize_runtime_status service >/dev/null
}
trap 'service_finalize; exit 1' 1 2 15

count=0
while [ "$(getprop sys.boot_completed)" != "1" ] && [ $count -lt 90 ]; do
  sleep 1
  count=$((count + 1))
done

# 不再用 t_module 覆盖 module.prop（会把简介打回「检测中」）。
# 开机最终状态由下方 finalize_runtime_status 写入。

log_msg "service: verify app namespaces after boot (${count}s)"
update_module_description "注入中"
if ! acquire_write_lock; then
  echo "应用命名空间证书检查繁忙，请稍后在 WebUI 刷新" >"$STATEDIR/inject-error"
  log_msg "service: lifecycle lock timeout"
  service_finalize
  exit 1
fi
SERVICE_HAS_LOCK=1
if hot_session_recorded; then
  log_msg "service: hot session recorded, still reinforce persistent namespaces"
fi
if sh "$MODDIR/bin/apex_inject.sh" namespaces; then
  rc=0
else
  rc=1
fi
release_write_lock
SERVICE_HAS_LOCK=0
if [ "$rc" -eq 0 ]; then
  rm -f "$STATEDIR/inject-error"
else
  echo "应用命名空间证书注入失败，请查看日志" >"$STATEDIR/inject-error"
  log_msg "service: namespace injection failed"
fi
finalize_runtime_status service >/dev/null
trap - 1 2 15
log_msg "service done"
