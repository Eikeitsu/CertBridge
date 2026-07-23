#!/system/bin/sh
# 信任库路径与 SELinux / 路径身份

get_api() {
  api=$(getprop ro.build.version.sdk)
  [ -n "$api" ] || api=24
  echo "$api"
}

get_target_store() {
  if [ "$(get_api)" -ge 34 ] && [ -d "$APEX_CACERTS" ]; then
    echo "$APEX_CACERTS"
  else
    echo "$SYSTEM_CACERTS"
  fi
}

# API 34+：Conscrypt 走 APEX，同时注入 system 供 Reqable/Flutter 等检测与旧客户端。
# 仅运行时 bind，不写模块 system/cacerts，避免 Magic Mount 遮蔽整库。
list_target_stores() {
  seen="|"
  if [ "$(get_api)" -ge 34 ]; then
    if [ -d "$APEX_CACERTS" ]; then
      echo "$APEX_CACERTS"
      seen="$seen$APEX_CACERTS|"
    fi
    for apex_dir in /apex/com.android.conscrypt@*/cacerts; do
      [ -d "$apex_dir" ] || continue
      case "$seen" in *"|$apex_dir|"*) continue ;; esac
      echo "$apex_dir"
      seen="$seen$apex_dir|"
    done
  fi
  if [ -d "$SYSTEM_CACERTS" ]; then
    case "$seen" in *"|$SYSTEM_CACERTS|"*) ;; *)
      echo "$SYSTEM_CACERTS"
      ;;
    esac
  fi
}

set_selinux_context() {
  target="$1"
  dest="$2"
  [ "$(getenforce)" = "Enforcing" ] || return 0
  ctx=$(ls -Zd "$target" 2>/dev/null | awk '{print $1}')
  if [ -n "$ctx" ] && [ "$ctx" != "?" ]; then
    chcon -R "$ctx" "$dest" 2>/dev/null || return 1
  else
    ctx="u:object_r:system_security_cacerts_file:s0"
    chcon -R "$ctx" "$dest" 2>/dev/null || return 1
  fi
  actual_ctx=$(ls -Zd "$dest" 2>/dev/null | awk '{print $1}')
  # 部分机型带 MCS 类别（s0:cXX），只比较 type 段，避免误杀整次注入
  if [ "$actual_ctx" = "$ctx" ]; then
    return 0
  fi
  actual_type=$(echo "$actual_ctx" | cut -d: -f1-3)
  expect_type=$(echo "$ctx" | cut -d: -f1-3)
  [ -n "$actual_type" ] && [ "$actual_type" = "$expect_type" ]
}

path_identity() {
  stat -c '%d:%i' "$1" 2>/dev/null | tr -d '\r\n'
}

namespace_path_identity() {
  ns_pid="$1"
  ns_path="$2"
  nsenter --mount=/proc/"$ns_pid"/ns/mnt -- stat -c '%d:%i' "$ns_path" 2>/dev/null | \
    tr -d '\r\n'
}
