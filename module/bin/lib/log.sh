#!/system/bin/sh
# 日志

log_msg() {
  mkdir -p "$DATADIR" 2>/dev/null
  if [ -f "$LOG_FILE" ]; then
    size=$(wc -c <"$LOG_FILE" 2>/dev/null)
    [ "${size:-0}" -gt 524288 ] && mv -f "$LOG_FILE" "$LOG_FILE.1" 2>/dev/null
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$LOG_FILE"
}
