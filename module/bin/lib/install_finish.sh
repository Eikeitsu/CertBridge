#!/system/bin/sh
# 由 install_flow 加载；安装阶段专用
# 安装摘要与主流程
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
  if [ "$INSTALL_HIDE" = "1" ]; then
    if [ "$INSTALL_HIDE_ALLOW" = "1" ]; then
      HIDE_LABEL="已安装（默认开启，可在 WebUI 关闭）"
    else
      HIDE_LABEL="已安装（默认关闭，可在 WebUI 开启）"
    fi
  else
    HIDE_LABEL="未安装"
  fi
  if [ "$INSTALL_ZN_HIDE" = "1" ]; then
    if [ "$INSTALL_ZN_HIDE_ALLOW" = "1" ]; then
      ZN_HIDE_LABEL="已安装（默认开启，可在 WebUI 关闭）"
    else
      ZN_HIDE_LABEL="已安装（默认关闭，可在 WebUI 开启）"
    fi
  else
    ZN_HIDE_LABEL="未安装"
  fi
  if [ "$INSTALL_MOUNT_MODE" = "magic" ]; then
    MOUNT_LABEL="轻量 Magic Mount"
  else
    MOUNT_LABEL="完整兼容（运行时 bind）"
  fi

  ui_print "--------------------------------"
  ui_print " 安装方案：$MODE_LABEL"
  ui_print " 挂载模式：$MOUNT_LABEL"
  ui_print " Reqable：$REQABLE_LABEL"
  ui_print " ProxyPin：$PROXYPIN_LABEL"
  ui_print " WebUI：$WEBUI_LABEL"
  ui_print " 免重启热挂载：$HOT_LABEL"
  ui_print " 挂载隐藏协助：$HIDE_LABEL"
  ui_print " Zygisk 挂载过滤：$ZN_HIDE_LABEL"
  log_info "安装选项：方案=$MODE_LABEL，挂载=$MOUNT_LABEL，Reqable=$REQABLE_LABEL，ProxyPin=$PROXYPIN_LABEL，WebUI=$WEBUI_LABEL，免重启热挂载=$HOT_LABEL，挂载隐藏=$HIDE_LABEL，Zygisk过滤=$ZN_HIDE_LABEL"
  ui_print "--------------------------------"
  ui_print " 开机将再次尝试从 App 刷新 CA"
  if [ "$INSTALL_MOUNT_MODE" = "magic" ]; then
    ui_print " 轻量模式：system/ 仅叠启用的 addon 证书"
    ui_print " Magisk 通常无需元模块；KernelSU 建议确认"
    ui_print " 已启用正确的 Magic Mount / 挂载元模块"
  else
    ui_print " 完整兼容：不写 system 覆盖目录，运行时 bind"
    ui_print " 不依赖 Magic Mount 元模块"
  fi
  if [ "$INSTALL_HOT" = "1" ]; then
    ui_print " 永久配置重启生效；临时证书支持免重启"
  else
    ui_print " 永久配置重启生效；未安装临时热挂载"
  fi
  if [ "$INSTALL_HIDE" = "1" ]; then
    if [ "$INSTALL_HIDE_ALLOW" = "1" ]; then
      ui_print " 隐藏协助已安装：默认开启 try_umount"
      ui_print " WebUI「隐藏」页可关闭；抓包勿对 Reqable"
    else
      ui_print " 隐藏协助已安装：默认关闭 try_umount"
      ui_print " 需要时在 WebUI「隐藏」页开启；抓包勿对 Reqable"
    fi
    ui_print " 与被抓包 App 开「卸载模块」"
  fi
  if [ "$INSTALL_ZN_HIDE" = "1" ]; then
    ui_print " Zygisk 过滤：需启用 Zygisk / ZygiskNext 等"
    ui_print " WebUI「隐藏」页可开关 zn_hide_allow；重启后生效"
  fi
  ui_print " Android 14+ 自动注入 APEX"
  ui_print "--------------------------------"
}

# CLI 入口装到模块外，终端直接用 /data/adb/certbridge/cb
certbridge_install_cli_ext() {
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  mkdir -p "$CB_EXT_DIR" 2>/dev/null || return 0
  cat >"$CB_EXT_DIR/cb" <<'CB_EXT_EOF'
#!/system/bin/sh
# CertBridge CLI（模块外入口）
MODDIR="/data/adb/modules/CertBridge"
[ -f "$MODDIR/bin/cert_manager.sh" ] || {
  echo "error=module_missing" >&2
  echo "hint=模块未安装或路径异常" >&2
  exit 1
}
exec sh "$MODDIR/bin/cert_manager.sh" "$@"
CB_EXT_EOF
  chmod 0755 "$CB_EXT_DIR/cb" 2>/dev/null || true
  # 模块内 bin/cb 仍可用；优先提示外部路径
  if [ -f "${MODPATH:-}/bin/cb" ] || [ -f "${MODDIR:-}/bin/cb" ]; then
    :
  fi
  log_info "install: CLI → $CB_EXT_DIR/cb" 2>/dev/null || true
  ui_print "- CLI：$CB_EXT_DIR/cb"
}

# 升级时保留用户证书与关键状态；conf 中部分键在不冲突时回填
certbridge_install_preserve_user() {
  OLD_MOD="/data/adb/modules/CertBridge"
  [ -d "$OLD_MOD" ] || return 0
  if [ -f "$LIBDIR/hot_update.sh" ]; then
    # shellcheck disable=SC1090
    . "$LIBDIR/hot_update.sh"
    hot_update_preserve_paths "$OLD_MOD" "$MODPATH" \
      certs/custom \
      certs/sources \
      certs/generation/current \
      data/state/addon-sources \
      data/state/source-stash \
      data/state/user.conf \
      data/state/addon-sources.migrated \
      data/state/applied-certs.list \
      data/state/applied.conf \
      data/state/hide-assist.conf \
      data/state/source.meta
    # 开关「开着」时证书字节可能只在旧 generation；立刻播到模块外
    if [ -f "$MODPATH/bin/common.sh" ]; then
      (
        MODDIR="$MODPATH"
        # shellcheck disable=SC1090
        . "$MODPATH/bin/common.sh" 2>/dev/null || exit 0
        certbridge_seed_ext_from_module "$OLD_MOD" 2>/dev/null || true
        certbridge_seed_ext_from_module "$MODPATH" 2>/dev/null || true
      ) || true
    fi
  fi
  # 用户改过的 conf 键：在新模板上覆盖同名项（安装向导写的 reqable/proxypin/mount 仍优先）
  if [ -f "$OLD_MOD/config/certs.conf" ] && [ -f "$MODPATH/config/certs.conf" ]; then
    for _k in tmpfs_style hot_allow hide_allow zn_hide_allow experimental_14_system quiet_prop force_bind_capture late_inject boot_bind_zygote boot_multi_apex service_probe; do
      _v=$(sed -n "s/^${_k}=//p" "$OLD_MOD/config/certs.conf" 2>/dev/null | head -n1 | tr -d '\r')
      [ -n "$_v" ] || continue
      # 本次安装若明确写入 hide/hot/zn，不回滚
      case "$_k" in
        hot_allow) [ "$INSTALL_HOT" = "1" ] && continue ;;
        hide_allow) [ "$INSTALL_HIDE" = "1" ] && continue ;;
        zn_hide_allow) [ "$INSTALL_ZN_HIDE" = "1" ] && continue ;;
      esac
      if grep -q "^${_k}=" "$MODPATH/config/certs.conf" 2>/dev/null; then
        sed -i "s|^${_k}=.*|${_k}=${_v}|" "$MODPATH/config/certs.conf"
      else
        echo "${_k}=${_v}" >>"$MODPATH/config/certs.conf"
      fi
    done
  fi
}

certbridge_install_try_hot_update() {
  if [ ! -f "$LIBDIR/hot_update.sh" ]; then
    ui_print " 安装完成，请重启设备 "
    return 1
  fi
  # shellcheck disable=SC1090
  . "$LIBDIR/hot_update.sh"
  HOT_UPDATE_DESC="[♻️热更新中 | 重新注入证书] 本次更新无需重启；完成后自动显示实际状态"
  # system/（Magic 叠层）、sepolicy、zygisk 变更需重启；其余可热更并重跑 post-fs-data
  if hot_update_try CertBridge system sepolicy.rule zygisk; then
    ui_print " 热更新将重新执行证书注入 "
    return 0
  fi
  return 1
}

# Magisk customize 主流程（权限设置仍由 customize.sh 完成）
certbridge_run_install() {
  log_info "install: ==== CertBridge install start ===="
  log_debug "install: MODPATH=$MODPATH"
  # 尽早给 bin 可执行权限，避免解压后无 +x 导致内置 openssl 探测失败
  chmod -R 0755 "$MODPATH/bin" 2>/dev/null || true
  # zip 含多架构；安装后只保留当前 ABI，约省 20MB 占用
  trim_info=$(trim_bundled_openssl_to_abi 2>/dev/null)
  [ -n "$trim_info" ] && log_debug "install: openssl_trim: $trim_info"
  if openssl_cmd=$(find_openssl); then
    log_info "install: openssl=$openssl_cmd"
    case "$openssl_cmd" in
      *cbx509.sh)
        ui_print "- X509：CertBridge Lite（dex）"
        ;;
      *)
        ui_print "- OpenSSL：已按 ABI 精简（$openssl_cmd）"
        ;;
    esac
  else
    log_error "install: openssl=UNAVAILABLE"
    diag=$(diagnose_bundled_openssl 2>&1)
    [ -n "$diag" ] && log_debug "install: openssl_diag: $diag"
    ui_print "! 警告：当前环境无可用 X509 工具，App 证书无法转换导入"
    ui_print "  ProxyPin 仍可使用内置证书；Reqable/自定义请重启后用 WebUI"
  fi
  certbridge_install_choose_mode
  certbridge_install_prepare_dirs
  certbridge_install_import_reqable
  certbridge_install_import_proxypin
  certbridge_install_ask_optional_apps
  certbridge_install_write_config
  certbridge_install_trim_components
  certbridge_install_preserve_user
  certbridge_install_cli_ext
  MODDIR="$MODPATH"
  tr -d '\r\n' </proc/sys/kernel/random/boot_id >"$INSTALL_BOOT_FILE" 2>/dev/null
  certbridge_install_dump_tree
  certbridge_install_print_summary
  certbridge_install_try_hot_update
  ui_print "********************************"
  log_info "install: ==== CertBridge install end ===="
}
