#!/system/bin/sh

ui_print "********************************"
ui_print " CA 证书管理 "
ui_print " CACertStore "
ui_print "********************************"

mkdir -p "$MODPATH/bin" "$MODPATH/config" "$MODPATH/data" "$MODPATH/webroot"
mkdir -p "$MODPATH/certs/builtin/reqable" "$MODPATH/certs/builtin/proxypin" "$MODPATH/certs/custom"
mkdir -p "$MODPATH/system/etc/security/cacerts"

# 默认启用内置证书到挂载目录
rm -f "$MODPATH/system/etc/security/cacerts"/*.0 2>/dev/null
[ -f "$MODPATH/certs/builtin/reqable/833e2479.0" ] && cp -f "$MODPATH/certs/builtin/reqable/833e2479.0" "$MODPATH/system/etc/security/cacerts/"
[ -f "$MODPATH/certs/builtin/proxypin/243f0bfb.0" ] && cp -f "$MODPATH/certs/builtin/proxypin/243f0bfb.0" "$MODPATH/system/etc/security/cacerts/"

cert_n=$(ls -1 "$MODPATH/system/etc/security/cacerts"/*.0 2>/dev/null | wc -l)
ui_print "--------------------------------"
ui_print " 已准备证书: $cert_n 个"
ui_print " 内置: Reqable / ProxyPin "
ui_print " 支持: Magisk / KernelSU / APatch "
ui_print " Android 14+ 自动 APEX 注入 "
ui_print "--------------------------------"
ui_print " 安装后请重启设备 "
ui_print " 可在 WebUI 管理证书开关 "
ui_print "********************************"

set_perm_recursive "$MODPATH/bin" root root 0755 0755
set_perm_recursive "$MODPATH/config" root root 0755 0644
set_perm_recursive "$MODPATH/data" root root 0755 0777
set_perm_recursive "$MODPATH/certs" root root 0755 0644
set_perm_recursive "$MODPATH/system/etc/security/cacerts" 0 0 0755 0644
set_perm_recursive "$MODPATH/webroot" root root 0755 0644
for s in post-fs-data.sh service.sh action.sh uninstall.sh customize.sh; do
  [ -f "$MODPATH/$s" ] && set_perm "$MODPATH/$s" root root 0755
done