#!/system/bin/sh

ui_print "********************************"
ui_print " 系统 CA 证书 "
ui_print " CertBridge "
ui_print "********************************"

mkdir -p "$MODPATH/bin" "$MODPATH/config" "$MODPATH/data" "$MODPATH/webroot"
mkdir -p "$MODPATH/certs/builtin/reqable" "$MODPATH/certs/builtin/proxypin"
mkdir -p "$MODPATH/certs/custom" "$MODPATH/certs/system_base"

rm -rf "$MODPATH/system" 2>/dev/null
mkdir -p "$MODPATH/system/etc/security/cacerts"

MIN_SAFE_CERTS=10
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
SYSTEM_CACERTS="/system/etc/security/cacerts"
OLD_BASE="/data/adb/modules/CertBridge/certs/system_base"
BASE_DIR="$MODPATH/certs/system_base"
ACTIVE_DIR="$MODPATH/system/etc/security/cacerts"

count_certs() {
  n=$(ls -1 "$1"/*.0 2>/dev/null | wc -l)
  echo "$n" | tr -d ' '
}

ui_print "- 抓取系统 CA 基线..."
rm -f "$BASE_DIR"/*.0 2>/dev/null
captured=0

if [ -d "$OLD_BASE" ] && [ "$(count_certs "$OLD_BASE")" -ge "$MIN_SAFE_CERTS" ]; then
  cp -f "$OLD_BASE"/*.0 "$BASE_DIR/" 2>/dev/null
  captured=$(count_certs "$BASE_DIR")
  ui_print "  来源: 已有基线 ($captured)"
elif [ -d "$APEX_CACERTS" ] && [ "$(count_certs "$APEX_CACERTS")" -ge "$MIN_SAFE_CERTS" ]; then
  cp -f "$APEX_CACERTS"/*.0 "$BASE_DIR/" 2>/dev/null
  captured=$(count_certs "$BASE_DIR")
  ui_print "  来源: APEX ($captured)"
elif [ -d "$SYSTEM_CACERTS" ] && [ "$(count_certs "$SYSTEM_CACERTS")" -ge "$MIN_SAFE_CERTS" ]; then
  cp -f "$SYSTEM_CACERTS"/*.0 "$BASE_DIR/" 2>/dev/null
  captured=$(count_certs "$BASE_DIR")
  ui_print "  来源: system ($captured)"
fi

if [ "$captured" -lt "$MIN_SAFE_CERTS" ]; then
  abort "! 无法获取完整系统 CA 基线。请禁用或卸载旧版，重启后重新安装。"
fi

rm -f "$ACTIVE_DIR"/*.0 2>/dev/null
cp -f "$BASE_DIR"/*.0 "$ACTIVE_DIR/" 2>/dev/null
[ -f "$MODPATH/certs/builtin/reqable/833e2479.0" ] && cp -f "$MODPATH/certs/builtin/reqable/833e2479.0" "$ACTIVE_DIR/"
[ -f "$MODPATH/certs/builtin/proxypin/243f0bfb.0" ] && cp -f "$MODPATH/certs/builtin/proxypin/243f0bfb.0" "$ACTIVE_DIR/"

cert_n=$(count_certs "$ACTIVE_DIR")
addon_n=0
[ -f "$ACTIVE_DIR/833e2479.0" ] && addon_n=$((addon_n + 1))
[ -f "$ACTIVE_DIR/243f0bfb.0" ] && addon_n=$((addon_n + 1))

ui_print "--------------------------------"
ui_print " 系统 CA 基线: $captured"
ui_print " 挂载目录合计: $cert_n (含追加 $addon_n)"
ui_print " 内置: Reqable / ProxyPin "
ui_print " 模式: 系统基线增量合并 "
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

cp "$MODPATH/module.prop" "$MODPATH/t_module"
chmod 0644 "$MODPATH/t_module"
