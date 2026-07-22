#!/system/bin/sh

ui_print "********************************"
ui_print " 系统 CA 证书 "
ui_print " CertBridge "
ui_print "********************************"

# 音量键：复用 bin/lib/keys.sh（Magisk 已解压到 MODPATH）
MODDIR="$MODPATH"
if [ -f "$MODPATH/bin/common.sh" ]; then
  # shellcheck disable=SC1090
  . "$MODPATH/bin/common.sh"
else
  ui_print "! 缺少 bin/common.sh，安装包不完整"
  abort "! incomplete package" 2>/dev/null || exit 1
fi

certbridge_choose_component() {
  component_name="$1"
  ui_print "--------------------------------"
  ui_print " 是否安装${component_name}？"
  ui_print " 音量上：安装"
  ui_print " 音量下：不安装"
  ui_print " 20 秒未选择将跳过此项"
  certbridge_volume_choice
  case "$?" in
    0) COMPONENT_CHOICE=1; ui_print "- ${component_name}：安装" ;;
    1) COMPONENT_CHOICE=0; ui_print "- ${component_name}：不安装" ;;
    *) COMPONENT_CHOICE=0; ui_print "- ${component_name}：选择超时，按安全默认不安装" ;;
  esac
}

INSTALL_MODE="default"
INSTALL_REQABLE=1
INSTALL_PROXYPIN=1
INSTALL_WEBUI=1
INSTALL_HOT=1

ui_print "--------------------------------"
ui_print " 请选择安装方式"
ui_print " 音量上：默认安装（推荐）"
ui_print "   启用两张内置 CA，并安装全部功能"
ui_print " 音量下：自定义安装"
ui_print "   逐项选择证书与附加功能"
ui_print " 20 秒未选择将使用默认安装"
certbridge_volume_choice
case "$?" in
  1)
    INSTALL_MODE="custom"
    ui_print "- 已选择自定义安装"
    certbridge_choose_component "Reqable CA"
    INSTALL_REQABLE="$COMPONENT_CHOICE"
    certbridge_choose_component "ProxyPin CA"
    INSTALL_PROXYPIN="$COMPONENT_CHOICE"
    certbridge_choose_component "WebUI 管理界面"
    INSTALL_WEBUI="$COMPONENT_CHOICE"
    ui_print "--------------------------------"
    ui_print " 免重启热挂载可临时提升用户区或"
    ui_print " 存储卡中的 CA，请仅使用可信证书"
    certbridge_choose_component "免重启热挂载"
    INSTALL_HOT="$COMPONENT_CHOICE"
    ;;
  0) ui_print "- 已选择默认安装" ;;
  *) ui_print "- 未检测到按键，使用默认安装" ;;
esac

mkdir -p "$MODPATH/bin" "$MODPATH/config" "$MODPATH/data/state"
mkdir -p "$MODPATH/certs/builtin/reqable" "$MODPATH/certs/builtin/proxypin"
mkdir -p "$MODPATH/certs/custom" "$MODPATH/certs/generation"

sed -i "s/^reqable=.*/reqable=$INSTALL_REQABLE/" "$MODPATH/config/certs.conf"
sed -i "s/^proxypin=.*/proxypin=$INSTALL_PROXYPIN/" "$MODPATH/config/certs.conf"
cat >"$MODPATH/config/install-profile.conf" <<EOF
install_mode=$INSTALL_MODE
webui=$INSTALL_WEBUI
hot_reload=$INSTALL_HOT
EOF

if [ "$INSTALL_WEBUI" != "1" ]; then
  rm -rf "$MODPATH/webroot"
fi
if [ "$INSTALL_HOT" != "1" ]; then
  rm -f "$MODPATH/bin/hot_mount.sh"
fi

MODDIR="$MODPATH"
tr -d '\r\n' </proc/sys/kernel/random/boot_id >"$INSTALL_BOOT_FILE" 2>/dev/null

[ "$INSTALL_MODE" = "default" ] && MODE_LABEL="默认安装" || MODE_LABEL="自定义安装"
[ "$INSTALL_REQABLE" = "1" ] && REQABLE_LABEL="启用" || REQABLE_LABEL="不启用"
[ "$INSTALL_PROXYPIN" = "1" ] && PROXYPIN_LABEL="启用" || PROXYPIN_LABEL="不启用"
[ "$INSTALL_WEBUI" = "1" ] && WEBUI_LABEL="已安装" || WEBUI_LABEL="未安装"
[ "$INSTALL_HOT" = "1" ] && HOT_LABEL="已安装" || HOT_LABEL="未安装"

ui_print "--------------------------------"
ui_print " 安装方案：$MODE_LABEL"
ui_print " Reqable CA：$REQABLE_LABEL"
ui_print " ProxyPin CA：$PROXYPIN_LABEL"
ui_print " WebUI：$WEBUI_LABEL"
ui_print " 免重启热挂载：$HOT_LABEL"
log_msg "安装选项：方案=$MODE_LABEL，Reqable=$REQABLE_LABEL，ProxyPin=$PROXYPIN_LABEL，WebUI=$WEBUI_LABEL，免重启热挂载=$HOT_LABEL"
ui_print "--------------------------------"
ui_print " 开机实时读取并合并系统 CA"
ui_print " 不保存系统 CA 基线，不创建 system 覆盖目录"
if [ "$INSTALL_HOT" = "1" ]; then
  ui_print " 永久配置重启生效；临时证书支持免重启"
else
  ui_print " 永久配置重启生效；未安装临时热挂载"
fi
ui_print " Android 14+ 自动注入 APEX"
ui_print "--------------------------------"
ui_print " 安装后必须重启设备 "
ui_print "********************************"

set_perm_recursive "$MODPATH/bin" root root 0755 0755
set_perm_recursive "$MODPATH/config" root root 0700 0600
set_perm_recursive "$MODPATH/data" root root 0700 0600
set_perm_recursive "$MODPATH/certs" root root 0755 0644
set_perm_recursive "$MODPATH/certs/custom" root root 0700 0600
[ -d "$MODPATH/webroot" ] && set_perm_recursive "$MODPATH/webroot" root root 0755 0644
for s in post-fs-data.sh service.sh action.sh uninstall.sh customize.sh; do
  [ -f "$MODPATH/$s" ] && set_perm "$MODPATH/$s" root root 0755
done

cp "$MODPATH/module.prop" "$MODPATH/t_module"
chmod 0644 "$MODPATH/t_module"
