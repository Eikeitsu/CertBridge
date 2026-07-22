#!/system/bin/sh
# 音量键（安装脚本 / Action 可复用）
# 返回：0=音量上，1=音量下，2=超时或无法读取

certbridge_volume_choice() {
  local timeout_sec="${1:-20}"
  local event_file event_pid second
  event_file="${TMPDIR:-/data/local/tmp}/certbridge-key-events.$$"
  rm -f "$event_file"
  command -v getevent >/dev/null 2>&1 || return 2

  getevent -ql >"$event_file" 2>/dev/null &
  event_pid=$!
  second=0
  while [ "$second" -lt "$timeout_sec" ]; do
    sleep 1
    second=$((second + 1))
    if grep -q 'KEY_VOLUMEUP.*DOWN' "$event_file" 2>/dev/null; then
      kill "$event_pid" 2>/dev/null
      wait "$event_pid" 2>/dev/null
      rm -f "$event_file"
      return 0
    fi
    if grep -q 'KEY_VOLUMEDOWN.*DOWN' "$event_file" 2>/dev/null; then
      kill "$event_pid" 2>/dev/null
      wait "$event_pid" 2>/dev/null
      rm -f "$event_file"
      return 1
    fi
  done

  kill "$event_pid" 2>/dev/null
  wait "$event_pid" 2>/dev/null
  rm -f "$event_file"
  return 2
}
