#!/system/bin/sh

MODDIR="$MODPATH"
CERTBRIDGE_PROFILE=install
if [ -f "$MODPATH/bin/common.sh" ]; then
  # shellcheck disable=SC1090
  . "$MODPATH/bin/common.sh"
else
  ui_print "! Missing bin/common.sh"
  abort "! incomplete package" 2>/dev/null || exit 1
fi

# 停掉上一轮热更新观察进程，避免它在本次解压/customize 期间删掉 modules_update
_cb_hot_lock="/data/adb/certbridge/CertBridge.hot_update.lock"
if [ -f "$_cb_hot_lock/pid" ]; then
  _cb_hot_pid=$(cat "$_cb_hot_lock/pid" 2>/dev/null | tr -d ' \r\n')
  case "$_cb_hot_pid" in
    ''|*[!0-9]*) ;;
    *) kill "$_cb_hot_pid" 2>/dev/null || true ;;
  esac
fi
rm -rf "$_cb_hot_lock" /data/adb/.CertBridge.hot_update.lock 2>/dev/null || true

i18n_load >/dev/null 2>&1 || true
ui_print "********************************"
ui_print " $(i18n_msg install.banner)"
ui_print " CertBridge "
ui_print "********************************"

certbridge_run_install
i18n_seed_user_lang
i18n_load >/dev/null 2>&1 || true

set_perm_recursive "$MODPATH/bin" root root 0755 0755
set_perm_recursive "$MODPATH/config" root root 0700 0600
set_perm_recursive "$MODPATH/data" root root 0700 0600
set_perm_recursive "$MODPATH/certs" root root 0755 0644
set_perm_recursive "$MODPATH/certs/custom" root root 0700 0600
set_perm_recursive "$MODPATH/certs/sources" root root 0700 0600
[ -d "$MODPATH/system/etc/security/cacerts" ] && \
  set_perm_recursive "$MODPATH/system/etc/security/cacerts" root root 0755 0644
[ -d "$MODPATH/webroot" ] && set_perm_recursive "$MODPATH/webroot" root root 0755 0644
for s in post-fs-data.sh service.sh action.sh uninstall.sh customize.sh hotinstall.sh; do
  [ -f "$MODPATH/$s" ] && set_perm "$MODPATH/$s" root root 0755
done

# 必须在热更新 worker 启动前完成：部分管理器装完立刻校验 module.prop；
# worker 过早清理 modules_update 会表现为「多刷几次才成功」。
if [ ! -f "$MODPATH/module.prop" ]; then
  ui_print "! module.prop 缺失，安装包不完整"
  abort "! missing module.prop" 2>/dev/null || exit 1
fi
cp "$MODPATH/module.prop" "$MODPATH/t_module" || {
  ui_print "! 无法备份 module.prop"
  abort "! t_module copy failed" 2>/dev/null || exit 1
}
chmod 0644 "$MODPATH/t_module"
# 标记：热更新清理暂存前须见到此文件，避免装到一半被旧 worker 删掉
: >"$MODPATH/.cb_install_ready" 2>/dev/null || true
chmod 0644 "$MODPATH/.cb_install_ready" 2>/dev/null || true

if type certbridge_install_try_hot_update >/dev/null 2>&1; then
  certbridge_install_try_hot_update || true
fi
