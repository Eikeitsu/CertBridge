# 由 install_flow / common 加载；安装阶段专用
# App CA 导入与目录树打印
certbridge_install_log() {
  log_info "install: $*"
}

certbridge_install_try_app() {
  # 尝试从 App 导入到 sources；写日志与 ui_print。成功返回 0。
  kind="$1"
  label=$(app_cert_label "$kind")
  diag=$(diagnose_app_cert_import "$kind")
  diag_rc=$?
  log_debug "install: $kind diag_rc=$diag_rc"
  [ -n "$diag" ] && log_debug "install: $kind $diag"
  case "$diag_rc" in
    0)
      if path=$(sync_source_from_app "$kind"); then
        dn=$(read_cert_meta_display "$path" "$label")
        ui_print "- 已从 ${label} 导入：$dn"
        ui_print "  源文件：$(echo "$diag" | awk -F= '$1=="live"{print substr($0,6); exit}')"
        ui_print "  写入：${path#$MODPATH/}"
        log_info "install: $kind ok path=$path display=$dn"
        return 0
      fi
      ui_print "! ${label} 二次写入失败"
      log_error "install: $kind sync failed after diagnose ok"
      return 1
      ;;
    1)
      ui_print "! ${label}：设备上找不到可用的 OpenSSL，无法转换证书"
      ui_print "  （安装环境需 openssl；可稍后在系统启动后用 WebUI 导入）"
      log_error "install: $kind openssl unavailable"
      return 1
      ;;
    2)
      ui_print "! ${label}：未找到 App 证书文件"
      ui_print "  请先在 ${label} 内生成/导出根证书后再刷入"
      log_warn "install: $kind searched common app paths, none found"
      return 1
      ;;
    *)
      live=$(echo "$diag" | awk -F= '$1=="live"{print substr($0,6); exit}')
      imp=$(echo "$diag" | awk -F= '$1=="import_err"{print substr($0,12); exit}')
      ui_print "! ${label}：找到文件但校验/转换失败"
      [ -n "$live" ] && ui_print "  文件：$live"
      [ -n "$imp" ] && ui_print "  原因：$imp"
      ui_print "  需为有效 CA、未过期；详见 data/install.log"
      log_error "install: $kind import failed live=${live:-?} err=${imp:-?}"
      return 1
      ;;
  esac
}

certbridge_install_import_reqable() {
  REQABLE_SRC_OK=0
  if [ "$INSTALL_REQABLE" != "1" ]; then
    log_debug "install: reqable skipped (disabled by choice)"
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
    log_debug "install: proxypin skipped (disabled by choice)"
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
    log_info "install: proxypin fallback builtin=$builtin_path"
  else
    INSTALL_PROXYPIN=0
    ui_print "! ProxyPin 无 App 证书且缺少内置文件，已跳过"
    log_warn "install: proxypin no app and no builtin"
  fi
}

certbridge_install_ask_optional_apps() {
  for opt_kind in $(optional_custom_app_kinds); do
    opt_label=$(app_cert_label "$opt_kind")
    live=$(find_live_app_cert "$opt_kind") || {
      log_debug "install: $opt_kind not installed / no cert path"
      continue
    }
    log_info "install: $opt_kind detected live=$live"
    if certbridge_ask_import_detected "$opt_label"; then
      if ! find_openssl >/dev/null 2>&1; then
        ui_print "! ${opt_label}：OpenSSL 不可用，跳过导入"
        log_warn "install: $opt_kind skip import, openssl unavailable"
        continue
      fi
      if name=$(import_ca_into_dir "$live" "$MODPATH/certs/custom" "$opt_label"); then
        ui_print "- 已导入 ${opt_label} → 自定义 $name"
        log_info "install: $opt_kind imported as custom/$name"
      else
        ui_print "! ${opt_label} 证书校验失败，已跳过"
        log_error "install: $opt_kind import_ca_into_dir failed live=$live"
      fi
    else
      ui_print "- 已跳过 ${opt_label}"
      log_debug "install: $opt_kind user skipped"
    fi
  done
}

certbridge_install_dump_tree() {
  ui_print "--------------------------------"
  ui_print " 证书目录结果（modules_update 下）"
  log_debug "install: --- cert tree begin ---"
  for sub in sources/reqable sources/proxypin custom builtin/proxypin; do
    dir="$MODPATH/certs/$sub"
    if [ ! -d "$dir" ]; then
      ui_print " · $sub：（目录不存在）"
      log_debug "install: tree: $sub MISSING"
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
      log_debug "install: tree: $sub empty"
    else
      ui_print " · $sub：$list"
      log_debug "install: tree: $sub = $list"
    fi
  done
  if [ -f "$MODPATH/config/install-profile.conf" ]; then
    log_debug "install: profile:"
    while IFS= read -r line; do
      [ -n "$line" ] && log_debug "install:   $line"
    done <"$MODPATH/config/install-profile.conf"
  fi
  log_debug "install: --- cert tree end ---"
  ui_print " 详细日志：data/install.log"
}
