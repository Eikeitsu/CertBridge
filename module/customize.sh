#!/system/bin/sh

ui_print "********************************"
ui_print " 证书桥 "
ui_print " CertBridge "
ui_print "********************************"

MODDIR="$MODPATH"
CERTBRIDGE_PROFILE=install
if [ -f "$MODPATH/bin/common.sh" ]; then
  # shellcheck disable=SC1090
  . "$MODPATH/bin/common.sh"
else
  ui_print "! 缺少 bin/common.sh，安装包不完整"
  abort "! incomplete package" 2>/dev/null || exit 1
fi

certbridge_run_install

set_perm_recursive "$MODPATH/bin" root root 0755 0755
set_perm_recursive "$MODPATH/config" root root 0700 0600
set_perm_recursive "$MODPATH/data" root root 0700 0600
set_perm_recursive "$MODPATH/certs" root root 0755 0644
set_perm_recursive "$MODPATH/certs/custom" root root 0700 0600
set_perm_recursive "$MODPATH/certs/sources" root root 0700 0600
[ -d "$MODPATH/webroot" ] && set_perm_recursive "$MODPATH/webroot" root root 0755 0644
for s in post-fs-data.sh service.sh action.sh uninstall.sh customize.sh; do
  [ -f "$MODPATH/$s" ] && set_perm "$MODPATH/$s" root root 0755
done

cp "$MODPATH/module.prop" "$MODPATH/t_module"
chmod 0644 "$MODPATH/t_module"
