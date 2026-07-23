#!/system/bin/sh
# 刷入安装编排：音量键选择、App CA 导入、写配置与组件裁剪
# 由 customize.sh 在 CERTBRIDGE_PROFILE=install 下调用

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

certbridge_ask_import_detected() {
  app_label="$1"
  ui_print "--------------------------------"
  ui_print " 检测到已安装 ${app_label}"
  ui_print " 是否导入其 CA 为自定义证书？"
  ui_print " 音量上：导入"
  ui_print " 音量下：跳过"
  ui_print " 20 秒未选择将跳过"
  certbridge_volume_choice
  case "$?" in
    0) return 0 ;;
    *) return 1 ;;
  esac
}

certbridge_install_prepare_dirs() {
  mkdir -p "$MODPATH/bin" "$MODPATH/config" "$MODPATH/data/state"
  mkdir -p "$MODPATH/certs/builtin/proxypin"
  mkdir -p "$MODPATH/certs/sources/reqable" "$MODPATH/certs/sources/proxypin"
  mkdir -p "$MODPATH/certs/custom" "$MODPATH/certs/generation"
  rm -rf "$MODPATH/certs/builtin/reqable"
}

certbridge_install_choose_mode() {
  INSTALL_MODE="default"
  INSTALL_REQABLE=1
  INSTALL_PROXYPIN=1
  INSTALL_WEBUI=1
  INSTALL_HOT=1

  ui_print "--------------------------------"
  ui_print " 请选择安装方式"
  ui_print " 音量上：默认安装（推荐）"
  ui_print "   自动检测已安装抓包 App 的 CA"
  ui_print "   ProxyPin 未检测到时使用内置兜底"
  ui_print "   并安装 WebUI 与免重启热挂载"
  ui_print " 音量下：自定义安装"
  ui_print "   逐项选择证书与附加功能"
  ui_print " 20 秒未选择将使用默认安装"
  certbridge_volume_choice
  case "$?" in
    1)
      INSTALL_MODE="custom"
      ui_print "- 已选择自定义安装"
      certbridge_choose_component "Reqable（从 App 导入 CA）"
      INSTALL_REQABLE="$COMPONENT_CHOICE"
      certbridge_choose_component "ProxyPin（App 优先，无则内置）"
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
}

certbridge_install_import_reqable() {
  REQABLE_SRC_OK=0
  if [ "$INSTALL_REQABLE" != "1" ]; then
    return 0
  fi
  ui_print "--------------------------------"
  ui_print " 正在检测 Reqable 证书…"
  if sync_source_from_app reqable >/dev/null 2>&1; then
    REQABLE_SRC_OK=1
    dn=$(read_cert_meta_display "$(find_source_cert reqable)" "Reqable")
    ui_print "- 已从 Reqable 导入：$dn"
  else
    INSTALL_REQABLE=0
    ui_print "! 未找到 Reqable 证书文件"
    ui_print "  请先在 Reqable 中生成/导出根证书后再刷入"
    ui_print "  或稍后用 WebUI 自定义导入"
  fi
}

certbridge_install_import_proxypin() {
  PROXYPIN_SRC="none"
  if [ "$INSTALL_PROXYPIN" != "1" ]; then
    return 0
  fi
  ui_print "--------------------------------"
  ui_print " 正在检测 ProxyPin 证书…"
  if sync_source_from_app proxypin >/dev/null 2>&1; then
    PROXYPIN_SRC="app"
    dn=$(read_cert_meta_display "$(find_source_cert proxypin)" "ProxyPin")
    ui_print "- 已从 ProxyPin 导入：$dn"
  elif find_builtin_cert proxypin >/dev/null 2>&1; then
    PROXYPIN_SRC="builtin"
    ui_print "- 未检测到 ProxyPin App 证书，使用模块内置兜底"
  else
    INSTALL_PROXYPIN=0
    ui_print "! ProxyPin 无 App 证书且缺少内置兜底，已跳过"
  fi
}

certbridge_install_ask_optional_apps() {
  for opt_kind in httpcanary adg; do
    opt_label=$(app_cert_label "$opt_kind")
    live=$(find_live_app_cert "$opt_kind") || continue
    if certbridge_ask_import_detected "$opt_label"; then
      if name=$(import_ca_into_dir "$live" "$MODPATH/certs/custom" "$opt_label"); then
        ui_print "- 已导入 ${opt_label} → 自定义 $name"
        log_msg "install: imported $opt_kind as custom $name"
      else
        ui_print "! ${opt_label} 证书校验失败，已跳过"
      fi
    else
      ui_print "- 已跳过 ${opt_label}"
    fi
  done
}

certbridge_install_write_config() {
  sed -i "s/^reqable=.*/reqable=$INSTALL_REQABLE/" "$MODPATH/config/certs.conf"
  sed -i "s/^proxypin=.*/proxypin=$INSTALL_PROXYPIN/" "$MODPATH/config/certs.conf"
  cat >"$MODPATH/config/install-profile.conf" <<EOF
install_mode=$INSTALL_MODE
webui=$INSTALL_WEBUI
hot_reload=$INSTALL_HOT
reqable_source=$([ "$REQABLE_SRC_OK" = "1" ] && echo app || echo none)
proxypin_source=$PROXYPIN_SRC
EOF
}

certbridge_install_trim_components() {
  if [ "$INSTALL_WEBUI" != "1" ]; then
    rm -rf "$MODPATH/webroot"
  fi
  if [ "$INSTALL_HOT" != "1" ]; then
    rm -f "$MODPATH/bin/hot_mount.sh"
  fi
}

certbridge_install_print_summary() {
  [ "$INSTALL_MODE" = "default" ] && MODE_LABEL="默认安装" || MODE_LABEL="自定义安装"
  if [ "$INSTALL_REQABLE" = "1" ]; then
    REQABLE_LABEL="已从 App 导入"
  else
    REQABLE_LABEL="未启用"
  fi
  case "$PROXYPIN_SRC" in
    app) PROXYPIN_LABEL="已从 App 导入" ;;
    builtin) PROXYPIN_LABEL="内置兜底" ;;
    *) PROXYPIN_LABEL="未启用" ;;
  esac
  [ "$INSTALL_WEBUI" = "1" ] && WEBUI_LABEL="已安装" || WEBUI_LABEL="未安装"
  [ "$INSTALL_HOT" = "1" ] && HOT_LABEL="已安装" || HOT_LABEL="未安装"

  ui_print "--------------------------------"
  ui_print " 安装方案：$MODE_LABEL"
  ui_print " Reqable：$REQABLE_LABEL"
  ui_print " ProxyPin：$PROXYPIN_LABEL"
  ui_print " WebUI：$WEBUI_LABEL"
  ui_print " 免重启热挂载：$HOT_LABEL"
  log_msg "安装选项：方案=$MODE_LABEL，Reqable=$REQABLE_LABEL，ProxyPin=$PROXYPIN_LABEL，WebUI=$WEBUI_LABEL，免重启热挂载=$HOT_LABEL"
  ui_print "--------------------------------"
  ui_print " 开机将再次尝试从 App 刷新 CA"
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
}

# Magisk customize 主流程（权限设置仍由 customize.sh 完成）
certbridge_run_install() {
  certbridge_install_choose_mode
  certbridge_install_prepare_dirs
  certbridge_install_import_reqable
  certbridge_install_import_proxypin
  certbridge_install_ask_optional_apps
  certbridge_install_write_config
  certbridge_install_trim_components
  MODDIR="$MODPATH"
  tr -d '\r\n' </proc/sys/kernel/random/boot_id >"$INSTALL_BOOT_FILE" 2>/dev/null
  certbridge_install_print_summary
}
