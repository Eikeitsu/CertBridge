#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

# 如果安装器在热更新期间杀掉了 worker，完整副本仍保存在模块目录之外；
# 开机时重新拉起，确保不会因为 modules_update 被清理而丢失更新。
if [ -d "/data/adb/.certbridge_hot_update_payload/CACertStore" ] \
	&& [ -f "$MODDIR/bin/lib/hot_update.sh" ]; then
	# shellcheck disable=SC1090
	. "$MODDIR/bin/lib/hot_update.sh" 2>/dev/null || true
	if type hot_update_spawn_worker >/dev/null 2>&1; then
		hot_update_spawn_worker CACertStore hotinstall.sh \
			"/data/adb/.certbridge_hot_update_payload/CACertStore" || true
	fi
fi

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
  write_inject_error service_busy
  log_msg "service: lifecycle lock timeout"
  service_finalize
  exit 1
fi
SERVICE_HAS_LOCK=1
if hot_session_recorded; then
  log_msg "service: hot session recorded, still reinforce persistent namespaces"
fi
rm -f "$INJECT_FAIL_FILE"
if sh "$MODDIR/bin/apex_inject.sh" namespaces; then
  rc=0
else
  rc=1
fi
release_write_lock
SERVICE_HAS_LOCK=0
if [ "$rc" -eq 0 ]; then
  # 保留 post-fs 已写入的更早失败；仅在本轮成功时清除
  clear_inject_error
else
  commit_inject_fail namespace_failed
  log_msg "service: namespace injection failed"
fi
finalize_runtime_status service >/dev/null
trap - 1 2 15
log_msg "service done"
