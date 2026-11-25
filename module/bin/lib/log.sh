#!/system/bin/sh
# 运行日志：YYYY-MM-DD HH:MM:SS [LEVEL] 内容
# LEVEL: INFO | WARN | ERROR | DEBUG
#
# 双文件：
#   install.log  —— 安装/升级过程（仅新安装时清空）
#   runtime.log  —— 开机注入 / 服务 / CLI（每次 post-fs-data 清空）
#
# 推荐调用：
#   log_info  / log_warn / log_error / log_debug  —— 显式等级（首选）
#   log_msg [level] message…                   —— level 可省略，省略时按关键词推断（兼容旧调用）
#   log_use_install / log_use_runtime          —— 切换写入目标

_cb_log_level() {
  case "$1" in
    info|INFO) echo INFO ;;
    warn|WARN) echo WARN ;;
    error|ERROR) echo ERROR ;;
    debug|DEBUG) echo DEBUG ;;
    *) return 1 ;;
  esac
}

# 旧调用未显式传 level 时，按关键词推断，避免漏改调用点时等级全变 INFO
_cb_log_infer() {
  case "$1" in
    *failed*|*Failed*|*refuse*|*invalid*|*timeout*|*missing*|*error*|*Error*|*cannot*|*unavailable*)
      echo ERROR
      ;;
    *soft-fail*|*skipped*|*skip\ *|*warn*|*Warn*|*stale*)
      echo WARN
      ;;
    *debug*|*Debug*)
      echo DEBUG
      ;;
    *) echo INFO ;;
  esac
}

_cb_log_active_file() {
  case "${LOG_CHANNEL:-runtime}" in
    install) echo "${INSTALL_LOG_FILE:-$LOG_FILE}" ;;
    *) echo "${RUNTIME_LOG_FILE:-$LOG_FILE}" ;;
  esac
}

log_use_install() {
  LOG_CHANNEL=install
  export LOG_CHANNEL
  LOG_FILE="${INSTALL_LOG_FILE:-$LOG_FILE}"
  export LOG_FILE
}

log_use_runtime() {
  LOG_CHANNEL=runtime
  export LOG_CHANNEL
  LOG_FILE="${RUNTIME_LOG_FILE:-$LOG_FILE}"
  export LOG_FILE
}

# 清空安装日志（新安装开始）
log_reset_install() {
  mkdir -p "$DATADIR" 2>/dev/null
  _f="${INSTALL_LOG_FILE:-$DATADIR/install.log}"
  : >"$_f" 2>/dev/null || true
  rm -f "$_f.1" 2>/dev/null || true
}

# 清空运行日志（每次 post-fs-data）
log_reset_runtime() {
  mkdir -p "$DATADIR" 2>/dev/null
  _f="${RUNTIME_LOG_FILE:-$DATADIR/runtime.log}"
  : >"$_f" 2>/dev/null || true
  rm -f "$_f.1" 2>/dev/null || true
}

# 兼容旧名：清空当前通道
log_reset() {
  case "${LOG_CHANNEL:-runtime}" in
    install) log_reset_install ;;
    *) log_reset_runtime ;;
  esac
}

# 轮转检查：每 50 次写入才检查一次，避免每条日志都 fork wc
_cb_log_rotate_tick=0
_cb_log_dir_ready=""
_cb_log_rotate_if_huge() {
  _f="$1"
  [ -f "$_f" ] || return 0
  _cb_log_rotate_tick=$((_cb_log_rotate_tick + 1))
  [ "$_cb_log_rotate_tick" -ge 50 ] || return 0
  _cb_log_rotate_tick=0
  size=$(wc -c <"$_f" 2>/dev/null)
  [ "${size:-0}" -gt 524288 ] && mv -f "$_f" "$_f.1" 2>/dev/null
  return 0
}

_cb_log_write() {
  lvl="$1"
  shift
  # 目录只在首次写入时建，避免每次 fork mkdir
  if [ -z "${_cb_log_dir_ready:-}" ]; then
    mkdir -p "$DATADIR" 2>/dev/null
    _cb_log_dir_ready=1
  fi
  # 通道选择用纯变量，去掉 $(_cb_log_active_file) 子 shell
  case "${LOG_CHANNEL:-runtime}" in
    install) _f="${INSTALL_LOG_FILE:-$LOG_FILE}" ;;
    *) _f="${RUNTIME_LOG_FILE:-$LOG_FILE}" ;;
  esac
  _cb_log_rotate_if_huge "$_f"
  # date 仍是唯一必需的外部命令（保留时间戳）
  printf '%s\n' "[$(date '+%Y-%m-%d %H:%M:%S')] [$lvl] $*" >>"$_f"
}

log_msg() {
  # 等级判断全部内建 case，去掉 _cb_log_level / _cb_log_infer 的 $( ) fork
  case "${1:-}" in
    info|INFO) lvl=INFO; shift ;;
    warn|WARN) lvl=WARN; shift ;;
    error|ERROR) lvl=ERROR; shift ;;
    debug|DEBUG) lvl=DEBUG; shift ;;
    *)
      case "${1:-}" in
        *failed*|*Failed*|*refuse*|*invalid*|*timeout*|*missing*|*error*|*Error*|*cannot*|*unavailable*)
          lvl=ERROR ;;
        *soft-fail*|*skipped*|*skip\ *|*warn*|*Warn*|*stale*)
          lvl=WARN ;;
        *debug*|*Debug*)
          lvl=DEBUG ;;
        *) lvl=INFO ;;
      esac
      ;;
  esac
  _cb_log_write "$lvl" "$@"
}

log_info() { _cb_log_write INFO "$@"; }
log_warn() { _cb_log_write WARN "$@"; }
log_error() { _cb_log_write ERROR "$@"; }
log_debug() { _cb_log_write DEBUG "$@"; }
