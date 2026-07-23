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

certbridge_install_log() {
  log_msg "install: $*"
}

certbridge_install_try_app() {
  # 尝试从 App 导入到 sources；写日志与 ui_print。成功返回 0。
  kind="$1"
  label=$(app_cert_label "$kind")
  diag=$(diagnose_app_cert_import "$kind")
  diag_rc=$?
  certbridge_install_log "$kind: diag_rc=$diag_rc"
  [ -n "$diag" ] && certbridge_install_log "$kind: $diag"
  case "$diag_rc" in
    0)
      if path=$(sync_source_from_app "$kind"); then
        dn=$(read_cert_meta_display "$path" "$label")
        ui_print "- 已从 ${label} 导入：$dn"
        ui_print "  源文件：$(echo "$diag" | awk -F= '$1=="live"{print substr($0,6); exit}')"
        ui_print "  写入：${path#$MODPATH/}"
        certbridge_install_log "$kind: ok path=$path display=$dn"
        return 0
      fi
      ui_print "! ${label} 二次写入失败"
      certbridge_install_log "$kind: sync failed after diagnose ok"
      return 1
      ;;
    1)
      ui_print "! ${label}：设备上找不到可用的 OpenSSL，无法转换证书"
      ui_print "  （安装环境需 openssl；可稍后在系统启动后用 WebUI 导入）"
      return 1
      ;;
    2)
      ui_print "! ${label}：未找到 App 证书文件"
      ui_print "  请先在 ${label} 内生成/导出根证书后再刷入"
      certbridge_install_log "$kind: searched common app paths, none found"
      return 1
      ;;
    *)
      live=$(echo "$diag" | awk -F= '$1=="live"{print substr($0,6); exit}')
      ui_print "! ${label}：找到文件但校验/转换失败"
      [ -n "$live" ] && ui_print "  文件：$live"
      ui_print "  需为有效 CA、未过期；详见 data/install.log"
      return 1
      ;;
  esac
}

certbridge_install_import_reqable() {
  REQABLE_SRC_OK=0
  if [ "$INSTALL_REQABLE" != "1" ]; then
    certbridge_install_log "reqable: skipped (disabled by choice)"
    return 0
  fi
  ui_print "--------------------------------"
  ui_print " 正在检测 Reqable 证书…"
  if certbridge_install_try_app reqable; then
    REQABLE_SRC_OK=1
  else
    INSTALL_REQABLE=0
    ui_print "  或稍后用 WebUI 自定义导入"
  fi
}

certbridge_install_import_proxypin() {
  PROXYPIN_SRC="none"
  if [ "$INSTALL_PROXYPIN" != "1" ]; then
    certbridge_install_log "proxypin: skipped (disabled by choice)"
    return 0
  fi
  ui_print "--------------------------------"
  ui_print " 正在检测 ProxyPin 证书…"
  if certbridge_install_try_app proxypin; then
    PROXYPIN_SRC="app"
  elif builtin_path=$(find_builtin_cert proxypin); then
    PROXYPIN_SRC="builtin"
    ui_print "- 未从 App 导入成功，使用模块内置证书"
    ui_print "  内置：${builtin_path#$MODPATH/}"
    certbridge_install_log "proxypin: fallback builtin=$builtin_path"
  else
    INSTALL_PROXYPIN=0
    ui_print "! ProxyPin 无 App 证书且缺少内置文件，已跳过"
    certbridge_install_log "proxypin: no app and no builtin"
  fi
}

certbridge_install_ask_optional_apps() {
  for opt_kind in httpcanary adguard; do
    opt_label=$(app_cert_label "$opt_kind")
    live=$(find_live_app_cert "$opt_kind") || {
      certbridge_install_log "$opt_kind: not installed / no cert path"
      continue
    }
    certbridge_install_log "$opt_kind: detected live=$live"
    if certbridge_ask_import_detected "$opt_label"; then
      if ! find_openssl >/dev/null 2>&1; then
        ui_print "! ${opt_label}：OpenSSL 不可用，跳过导入"
        certbridge_install_log "$opt_kind: skip import, openssl unavailable"
        continue
      fi
      if name=$(import_ca_into_dir "$live" "$MODPATH/certs/custom" "$opt_label"); then
        ui_print "- 已导入 ${opt_label} → 自定义 $name"
        certbridge_install_log "$opt_kind: imported as custom/$name"
      else
        ui_print "! ${opt_label} 证书校验失败，已跳过"
        certbridge_install_log "$opt_kind: import_ca_into_dir failed live=$live"
      fi
    else
      ui_print "- 已跳过 ${opt_label}"
      certbridge_install_log "$opt_kind: user skipped"
    fi
  done
}

certbridge_install_dump_tree() {
  ui_print "--------------------------------"
  ui_print " 证书目录结果（modules_update 下）"
  certbridge_install_log "--- cert tree begin ---"
  for sub in sources/reqable sources/proxypin custom builtin/proxypin; do
    dir="$MODPATH/certs/$sub"
    if [ ! -d "$dir" ]; then
      ui_print " · $sub：（目录不存在）"
      certbridge_install_log "tree: $sub MISSING"
      continue
    fi
    count=0
    list=""
    for f in "$dir"/*; do
      [ -f "$f" ] || continue
      case "$f" in *.meta) continue ;; esac
      count=$((count + 1))
      list="${list}${list:+, }$(basename "$f")"
    done
    if [ "$count" -eq 0 ]; then
      ui_print " · $sub：空"
      certbridge_install_log "tree: $sub empty"
    else
      ui_print " · $sub：$list"
      certbridge_install_log "tree: $sub = $list"
    fi
  done
  if [ -f "$MODPATH/config/install-profile.conf" ]; then
    certbridge_install_log "profile:"
    while IFS= read -r line; do
      [ -n "$line" ] && certbridge_install_log "  $line"
    done <"$MODPATH/config/install-profile.conf"
  fi
  certbridge_install_log "--- cert tree end ---"
  ui_print " 详细日志：data/install.log"
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
  certbridge_install_log "==== CertBridge install start ===="
  certbridge_install_log "MODPATH=$MODPATH"
  # 尽早给 bin 可执行权限，避免解压后无 +x 导致内置 openssl 探测失败
  chmod -R 0755 "$MODPATH/bin" 2>/dev/null || true
  # zip 含多架构；安装后只保留当前 ABI，约省 20MB 占用
  trim_info=$(trim_bundled_openssl_to_abi 2>/dev/null)
  [ -n "$trim_info" ] && certbridge_install_log "openssl_trim: $trim_info"
  if openssl_cmd=$(find_openssl); then
    certbridge_install_log "openssl=$openssl_cmd"
    case "$openssl_cmd" in
      *cbx509.sh)
        ui_print "- X509：CertBridge Lite（dex）"
        ;;
      *)
        ui_print "- OpenSSL：已按 ABI 精简（$openssl_cmd）"
        ;;
    esac
  else
    certbridge_install_log "openssl=UNAVAILABLE"
    diag=$(diagnose_bundled_openssl 2>&1)
    [ -n "$diag" ] && certbridge_install_log "openssl_diag: $diag"
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
  MODDIR="$MODPATH"
  tr -d '\r\n' </proc/sys/kernel/random/boot_id >"$INSTALL_BOOT_FILE" 2>/dev/null
  certbridge_install_dump_tree
  certbridge_install_print_summary
  certbridge_install_log "==== CertBridge install end ===="
}
