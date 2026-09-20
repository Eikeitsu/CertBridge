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

log_msg "service: boot_completed wait done (${count}s)"
update_module_description "注入中"
if ! acquire_write_lock; then
  write_inject_error service_busy
  log_msg "service: lifecycle lock timeout"
  service_finalize
  exit 1
fi
SERVICE_HAS_LOCK=1
if hot_session_recorded; then
  log_msg "service: hot session recorded"
fi

# late_inject=0（默认）：只收尾写状态，不再 namespaces 注入（仅 boot 注入、痕迹更少，减轻 Found KSU 类误伤）
# late_inject=1：boot_completed 后再补应用侧命名空间（难机兼容）
rc=0
if [ "$(read_conf late_inject 0)" = "1" ]; then
  log_msg "service: late_inject=1, reinforce app namespaces"
  rm -f "$INJECT_FAIL_FILE"
  if sh "$MODDIR/bin/apex_inject.sh" namespaces; then
    rc=0
  else
    rc=1
  fi
  if [ "$rc" -eq 0 ]; then
    clear_inject_error
  else
    commit_inject_fail namespace_failed
    log_msg "service: namespace injection failed"
  fi
else
  log_msg "service: late_inject=0, skip namespaces inject (boot-only)"
fi

release_write_lock
SERVICE_HAS_LOCK=0
finalize_runtime_status service >/dev/null
# 覆盖「boot_completed 后立刻校验仍假阴性、稍后才真正可用」窗口
if [ "$rc" -eq 0 ]; then
  heal_runtime_status_later 45
fi
trap - 1 2 15
log_msg "service done"
