#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

count=0
while [ "$(getprop sys.boot_completed)" != "1" ] && [ $count -lt 90 ]; do
  sleep 1
  count=$((count + 1))
done

if [ -f "$MODDIR/t_module" ] && ! grep -q '^# ##$' "$MODDIR/module.prop" 2>/dev/null; then
  cp "$MODDIR/t_module" "$MODDIR/module.prop"
  chmod 0644 "$MODDIR/module.prop"
fi

log_msg "service: verify app namespaces after boot (${count}s)"
if ! acquire_write_lock; then
  echo "应用命名空间证书检查繁忙，请稍后在 WebUI 刷新" >"$STATEDIR/inject-error"
  log_msg "service: lifecycle lock timeout"
  refresh_module_description >/dev/null
  exit 1
fi
# 热会话若仍活跃，仍补一次永久层命名空间：热层会叠在上面，但 zygote/抓包 App
# 若热层未覆盖到，至少保证永久 addon 可用。
if hot_session_active; then
  log_msg "service: hot session active, still reinforce persistent namespaces"
fi
if sh "$MODDIR/bin/apex_inject.sh" namespaces; then
  rc=0
else
  rc=1
fi
release_write_lock
if [ "$rc" -eq 0 ]; then
  rm -f "$STATEDIR/inject-error"
else
  echo "应用命名空间证书注入失败，请查看日志" >"$STATEDIR/inject-error"
  log_msg "service: namespace injection failed"
fi
refresh_module_description >/dev/null
log_msg "service done"
