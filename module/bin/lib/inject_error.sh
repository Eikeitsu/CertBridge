# 由 common runtime 加载
# 注入失败记录与文案
clear_inject_error() {
  rm -f "$INJECT_ERROR_FILE" "$INJECT_FAIL_FILE"
}

# 记录注入脚本内首个失败点（不覆盖已有记录）
record_inject_fail() {
  reason="$1"
  detail="${2:-}"
  [ -n "$reason" ] || return 0
  mkdir -p "$STATEDIR" 2>/dev/null
  [ -f "$INJECT_FAIL_FILE" ] && return 0
  {
    echo "reason=$reason"
    [ -n "$detail" ] && echo "detail=$detail"
  } >"$INJECT_FAIL_FILE"
}

# reason → 用户可读短句 / 建议
inject_reason_message() {
  case "$1" in
    lock_timeout) echo "证书操作被占用，未能完成注入" ;;
    hot_unmount_failed) echo "旧临时证书未能卸除，已跳过开机注入" ;;
    overlay_prepare_failed) echo "挂载模式叠层准备失败，未执行开机注入" ;;
    generation_failed) echo "证书集合生成失败，未改动系统信任库" ;;
    generation_invalid) echo "证书集合未就绪或校验失败" ;;
    no_target) echo "未找到系统证书目录，无法挂载" ;;
    tmpfs_failed) echo "临时证书层创建失败" ;;
    stage_copy_failed) echo "证书复制到临时层失败" ;;
    selinux_failed) echo "证书目录 SELinux 上下文设置失败" ;;
    bind_failed) echo "证书挂载写入失败" ;;
    nsenter_unavailable) echo "当前环境缺少 nsenter，无法注入应用命名空间" ;;
    namespace_partial) echo "部分应用命名空间未成功挂载证书" ;;
    namespace_failed) echo "应用命名空间证书注入失败" ;;
    boot_inject_failed) echo "开机证书注入失败" ;;
    magic_overlay_missing) echo "轻量模式下系统证书叠层未生效" ;;
    verify_init_failed) echo "系统进程证书挂载校验未通过" ;;
    verify_zygote_failed) echo "Zygote 命名空间证书校验未通过" ;;
    verify_failed) echo "证书挂载后校验未通过" ;;
    service_busy) echo "开机后校验繁忙，请稍后在 WebUI 刷新" ;;
    *) echo "证书注入异常" ;;
  esac
}

inject_reason_hint() {
  case "$1" in
    lock_timeout|service_busy) echo "稍等片刻后在 WebUI 点刷新；仍失败请重启" ;;
    hot_unmount_failed) echo "可先在 WebUI 卸除临时证书，再重启" ;;
    overlay_prepare_failed) echo "检查挂载模式设置，或改回「完整兼容」后重装/重启" ;;
    generation_failed|generation_invalid) echo "查看日志中 generation 相关行；确认系统 CA 可读取" ;;
    no_target) echo "确认设备存在 /system 或 APEX 证书目录" ;;
    tmpfs_failed|stage_copy_failed) echo "检查临时层路径（/dev 或 /data/local/tmp）空间与权限；可切换临时路径风格后重启" ;;
    selinux_failed) echo "部分 ROM 限制 chcon；可尝试完整兼容模式" ;;
    bind_failed|boot_inject_failed) echo "重启后再试；仍失败请到日志页搜索 inject:" ;;
    nsenter_unavailable) echo "当前 Root 方案可能裁剪了 nsenter，建议完整兼容模式或更换环境" ;;
    namespace_partial|namespace_failed) echo "重启后重试；部分应用需冷启动后才吃到新证书" ;;
    magic_overlay_missing) echo "KernelSU 等需确认 Magic Mount/元模块；或改用完整兼容模式" ;;
    verify_*) echo "重启设备；若反复失败请查看日志并反馈设备型号与 Root 方案" ;;
    *) echo "打开「日志」页查看详情，或重启后再检查" ;;
  esac
}

write_inject_error() {
  reason="$1"
  message="${2:-$(inject_reason_message "$reason")}"
  hint="${3:-$(inject_reason_hint "$reason")}"
  mkdir -p "$STATEDIR" 2>/dev/null
  {
    echo "reason=$reason"
    echo "message=$message"
    echo "hint=$hint"
  } >"$INJECT_ERROR_FILE"
}

# 将 apex_inject 记录的失败点写成用户可读 inject-error
commit_inject_fail() {
  fallback_reason="${1:-boot_inject_failed}"
  reason="$fallback_reason"
  detail=""
  if [ -f "$INJECT_FAIL_FILE" ]; then
    reason=$(awk -F= '$1 == "reason" { sub(/^[^=]*=/, ""); print; exit }' "$INJECT_FAIL_FILE" | tr -d '\r')
    detail=$(awk -F= '$1 == "detail" { sub(/^[^=]*=/, ""); print; exit }' "$INJECT_FAIL_FILE" | tr -d '\r')
    [ -n "$reason" ] || reason="$fallback_reason"
  fi
  message=$(inject_reason_message "$reason")
  [ -n "$detail" ] && message="${message}（${detail}）"
  write_inject_error "$reason" "$message" "$(inject_reason_hint "$reason")"
  rm -f "$INJECT_FAIL_FILE"
}

# 兼容旧版纯文本 inject-error
inject_error_present() {
  [ -f "$INJECT_ERROR_FILE" ]
}

read_inject_error_field() {
  key="$1"
  [ -f "$INJECT_ERROR_FILE" ] || return 1
  if grep -q '^message=' "$INJECT_ERROR_FILE" 2>/dev/null || \
    grep -q '^reason=' "$INJECT_ERROR_FILE" 2>/dev/null; then
    awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' \
      "$INJECT_ERROR_FILE" | tr -d '\r'
    return 0
  fi
  # 旧格式：整文件当 message
  if [ "$key" = "message" ]; then
    tr -d '\r' <"$INJECT_ERROR_FILE" | head -n 1
    return 0
  fi
  if [ "$key" = "reason" ]; then
    echo "legacy"
    return 0
  fi
  if [ "$key" = "hint" ]; then
    echo "打开「日志」页查看详情，或重启后再检查"
    return 0
  fi
  return 1
}

format_inject_error_line() {
  inject_error_present || return 1
  msg=$(read_inject_error_field message)
  hint=$(read_inject_error_field hint)
  [ -n "$msg" ] || return 1
  if [ -n "$hint" ]; then
    echo "${msg} · ${hint}"
  else
    echo "$msg"
  fi
}

# 校验失败时推断可读原因（用于 finalize 发现 apex_ok=0）
# 与 check_store_injected 同一套「主路径 + 可运营」标准，避免误诊
