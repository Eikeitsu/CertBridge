#!/system/bin/sh
# 运行日志：YYYY-MM-DD HH:MM:SS [LEVEL] 内容
# LEVEL: INFO | WARN | ERROR | DEBUG

_cb_log_level() {
  case "$1" in
    info|INFO) echo INFO ;;
    warn|WARN) echo WARN ;;
    error|ERROR) echo ERROR ;;
    debug|DEBUG) echo DEBUG ;;
    *) return 1 ;;
  esac
}

# 旧调用未显式传 level 时，按关键词推断，避免逐处改 80+ 调用点
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

log_msg() {
  local lvl=""
  lvl=$(_cb_log_level "${1:-}") || true
  if [ -n "$lvl" ]; then
    shift
  else
    lvl=$(_cb_log_infer "${1:-}")
  fi

  mkdir -p "$DATADIR" 2>/dev/null
  if [ -f "$LOG_FILE" ]; then
    size=$(wc -c <"$LOG_FILE" 2>/dev/null)
    [ "${size:-0}" -gt 524288 ] && mv -f "$LOG_FILE" "$LOG_FILE.1" 2>/dev/null
  fi
  printf '%s\n' "[$(date '+%Y-%m-%d %H:%M:%S')] [$lvl] $*" >>"$LOG_FILE"
}
