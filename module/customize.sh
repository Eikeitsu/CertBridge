#!/system/bin/sh

ui_print "********************************"
ui_print " 系统 CA 证书 "
ui_print " CertBridge "
ui_print "********************************"

mkdir -p "$MODPATH/bin" "$MODPATH/config" "$MODPATH/data" "$MODPATH/webroot"
mkdir -p "$MODPATH/certs/builtin/reqable" "$MODPATH/certs/builtin/proxypin"
mkdir -p "$MODPATH/certs/custom" "$MODPATH/certs/active"

# 证书只能放在模块私有目录。创建 module/system/.../cacerts 会触发
# Magisk / KernelSU Magic Mount 覆盖整个系统 CA 目录。
rm -rf "$MODPATH/system" 2>/dev/null
ACTIVE_DIR="$MODPATH/certs/active"

# active 只保存追加证书；系统目录仅在运行时完成增量 bind mount
rm -f "$ACTIVE_DIR"/*.0 2>/dev/null
[ -f "$MODPATH/certs/builtin/reqable/833e2479.0" ] && cp -f "$MODPATH/certs/builtin/reqable/833e2479.0" "$ACTIVE_DIR/"
[ -f "$MODPATH/certs/builtin/proxypin/243f0bfb.0" ] && cp -f "$MODPATH/certs/builtin/proxypin/243f0bfb.0" "$ACTIVE_DIR/"

addon_n=$(ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | wc -l)
addon_n=$(echo "$addon_n" | tr -d ' ')

ui_print "--------------------------------"
ui_print " 已准备追加证书: $addon_n 个"
ui_print " 内置: Reqable / ProxyPin "
ui_print " 模式: 现场增量挂载（不改系统分区）"
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
set_perm_recursive "$MODPATH/webroot" root root 0755 0644
for s in post-fs-data.sh service.sh action.sh uninstall.sh customize.sh; do
  [ -f "$MODPATH/$s" ] && set_perm "$MODPATH/$s" root root 0755
done

cp "$MODPATH/module.prop" "$MODPATH/t_module"
chmod 0644 "$MODPATH/t_module"
