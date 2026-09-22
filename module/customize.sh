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

cp "$MODPATH/module.prop" "$MODPATH/t_module"
chmod 0644 "$MODPATH/t_module"
