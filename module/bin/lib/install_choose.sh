# 由 install_flow / common 加载；安装阶段专用
# 音量键选择与目录准备
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
  INSTALL_HIDE=1
  INSTALL_HIDE_ALLOW=0
  # Zygisk 挂载痕迹过滤：默认不装；自定义可选。开关 zn_hide_allow 与 hide_allow 独立
  INSTALL_ZN_HIDE=0
  INSTALL_ZN_HIDE_ALLOW=0
  INSTALL_MOUNT_MODE="compatible"

  ui_print "--------------------------------"
  ui_print " 请选择安装方式"
  ui_print " 音量上：默认安装（推荐）"
  ui_print "   自动检测已安装抓包 App 的 CA"
  ui_print "   ProxyPin 未检测到时使用内置兜底"
  ui_print "   并安装 WebUI、免重启热挂载与挂载隐藏协助"
  ui_print "   隐藏协助默认关闭（可在 WebUI「隐藏」页开启）"
  ui_print "   不含 Zygisk 挂载痕迹过滤（自定义可选）"
  ui_print "   挂载：完整兼容模式（运行时 bind）"
  ui_print " 音量下：自定义安装"
  ui_print "   逐项选择证书、附加功能与挂载模式"
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
      ui_print "--------------------------------"
      ui_print " 挂载隐藏协助：bind 后向 SuSFS / 内核"
      ui_print " 注册 try_umount。抓包时勿对 Reqable"
      ui_print " 与被抓包 App 开「卸载模块」，否则"
      ui_print " 会显示根证未安装或抓包断网。"
      ui_print " 勾选后默认开启；可在 WebUI 关闭。"
      certbridge_choose_component "挂载隐藏协助（SuSFS try_umount）"
      INSTALL_HIDE="$COMPONENT_CHOICE"
      # 自定义安装勾选隐藏时默认开启；未勾选则不安装
      if [ "$INSTALL_HIDE" = "1" ]; then
        INSTALL_HIDE_ALLOW=1
      else
        INSTALL_HIDE_ALLOW=0
      fi
      ui_print "--------------------------------"
      ui_print " Zygisk 挂载痕迹过滤：在 App 进程中"
      ui_print " 过滤 mountinfo/mounts 里本模块相关行"
      ui_print "（经典 Zygisk API；需已启用 Zygisk）。"
      ui_print " 与 SuSFS 隐藏协助独立；勾选后默认开启。"
      ui_print " Reqable/ProxyPin 白名单不过滤。"
      certbridge_choose_component "Zygisk 挂载痕迹过滤"
      INSTALL_ZN_HIDE="$COMPONENT_CHOICE"
      if [ "$INSTALL_ZN_HIDE" = "1" ]; then
        INSTALL_ZN_HIDE_ALLOW=1
      else
        INSTALL_ZN_HIDE_ALLOW=0
      fi
      ui_print "--------------------------------"
      ui_print " 请选择挂载模式"
      ui_print " 音量上：完整兼容（推荐，默认方案）"
      ui_print "   运行时整库合并 + bind，不依赖 Magic Mount"
      ui_print "   Magisk / KernelSU / APatch 均可，无需元模块"
      ui_print " 音量下：轻量 Magic Mount"
      ui_print "   仅把启用的 addon 叠进 system/"
      ui_print "   Magisk 一般自带；KernelSU 常需挂载元模块"
      ui_print "   Android 14+ 仍会对 APEX 做脚本注入"
      ui_print " 20 秒未选择将使用完整兼容"
      certbridge_volume_choice
      case "$?" in
        1)
          INSTALL_MOUNT_MODE="magic"
          ui_print "- 挂载模式：轻量 Magic Mount"
          ;;
        *)
          INSTALL_MOUNT_MODE="compatible"
          ui_print "- 挂载模式：完整兼容"
          ;;
      esac
      ;;
    0) ui_print "- 已选择默认安装（完整兼容挂载；隐藏协助已装、默认关闭）" ;;
    *) ui_print "- 未检测到按键，使用默认安装（完整兼容挂载；隐藏协助已装、默认关闭）" ;;
  esac
}
