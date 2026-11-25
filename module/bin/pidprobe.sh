#!/system/bin/sh
# CertBridge fork/pid 消耗探针（仅 debug 包带此文件；正式 zip 不含）
#
# 开启方式（任选其一）：
#   1) 建标记文件：touch /data/adb/certbridge/pidprobe.enable
#   2) 属性：setprop persist.certbridge.pidprobe 1
#   3) 环境变量：CERTBRIDGE_PIDPROBE=1
# 关闭：删除标记文件 / setprop persist.certbridge.pidprobe 0
#
# 关闭时：_pidprobe 只做一次变量判断，零 fork 零 IO。
# 原理：/proc/stat 的 processes 字段 = 自启动以来累计创建的进程总数。

_PIDPROBE_LOG=${CERTBRIDGE_PIDPROBE_LOG:-/data/local/tmp/pidprobe.log}

_pidprobe_enabled() {
  [ "${CERTBRIDGE_PIDPROBE:-0}" = "1" ] && return 0
  [ -f /data/adb/certbridge/pidprobe.enable ] && return 0
  [ "$(getprop persist.certbridge.pidprobe 2>/dev/null)" = "1" ] && return 0
  return 1
}

_PIDPROBE_ON=0
_PIDPROBE_LAST=0

_pidprobe_now() {
  _pl=$(grep '^processes' /proc/stat 2>/dev/null)
  echo "${_pl##* }"
}

_pidprobe_init() {
  if _pidprobe_enabled; then
    _PIDPROBE_ON=1
    echo "===== pidprobe $(date '+%Y-%m-%d %H:%M:%S') =====" >>"$_PIDPROBE_LOG"
    _PIDPROBE_LAST=$(_pidprobe_now)
    echo "PROBE T0-start  total=$_PIDPROBE_LAST uptime=$(cut -d' ' -f1 /proc/uptime)" >>"$_PIDPROBE_LOG"
  else
    _PIDPROBE_ON=0
  fi
}

_pidprobe() {
  [ "$_PIDPROBE_ON" = "1" ] || return 0
  _now=$(_pidprobe_now)
  _delta=$((_now - _PIDPROBE_LAST))
  printf 'PROBE %-46s total=%-8s fork_add=%-6s uptime=%s\n' \
    "$1" "$_now" "$_delta" "$(cut -d' ' -f1 /proc/uptime)" >>"$_PIDPROBE_LOG"
  _PIDPROBE_LAST=$_now
}

_pidprobe_done() {
  [ "$_PIDPROBE_ON" = "1" ] || return 0
  _pidprobe "END-total"
  echo "===== end =====" >>"$_PIDPROBE_LOG"
}
