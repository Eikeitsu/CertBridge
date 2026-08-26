#!/system/bin/sh
# 信任库路径、SELinux / 路径身份、挂载模式与 Magic 叠层

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

MODULE_SYSTEM_CACERTS="$MODDIR/system/etc/security/cacerts"

# 每个信任库目标对应的 runtime tmpfs 目录（注入与状态校验共用）
target_stage_dir() {
  target="$1"
  case "$target" in
    "$APEX_CACERTS") echo "$RUNTIME_MOUNT_ROOT/apex" ;;
    "$SYSTEM_CACERTS") echo "$RUNTIME_MOUNT_ROOT/system" ;;
    *)
      name=$(echo "$target" | tr '/@' '__' | sed 's/__*/_/g')
      echo "$RUNTIME_MOUNT_ROOT/$name"
      ;;
  esac
}

# 当前命名空间里，target 是否仍绑着本模块 runtime tmpfs（软重启残留）
is_certbridge_runtime_bind() {
  target="$1"
  mountinfo="${2:-/proc/self/mountinfo}"
  [ -n "$target" ] && [ -f "$mountinfo" ] || return 1
  awk -v target="$target" -v root="${RUNTIME_MOUNT_ROOT:-/dev/.cb0}" '
    $5 == target && (
      index($0, root) > 0 ||
      index($0, "/dev/.cb0") > 0 ||
      index($0, "/dev/.cb1") > 0 ||
      index($0, "/data/local/tmp/.fs0") > 0 ||
      index($0, "/data/local/tmp/.fs1") > 0 ||
      index($0, "/data/local/tmp/sys-ca-merge") > 0
    ) { found=1 }
    END { exit found ? 0 : 1 }
  ' "$mountinfo" 2>/dev/null
}

# 卸掉信任库路径上残留的 CertBridge runtime bind，露出真实系统 CA。
# 软重启不换 mount 时，若不先卸掉，build_boot_generation 会把旧 addon
#（如已关闭的 ProxyPin 243f0bfb.0）当成「系统基线」再次拷进 generation。
detach_runtime_cacert_binds() {
  targets=""
  seen="|"
  for target in "$APEX_CACERTS" "$SYSTEM_CACERTS"; do
    [ -d "$target" ] || continue
    case "$seen" in *"|$target|"*) continue ;; esac
    targets="$targets $target"
    seen="$seen$target|"
  done
  for apex_dir in /apex/com.android.conscrypt@*/cacerts; do
    [ -d "$apex_dir" ] || continue
    case "$seen" in *"|$apex_dir|"*) continue ;; esac
    targets="$targets $apex_dir"
    seen="$seen$apex_dir|"
  done

  detached=0
  for target in $targets; do
    tries=0
    while [ "$tries" -lt 6 ] && is_certbridge_runtime_bind "$target"; do
      umount "$target" 2>/dev/null || umount -l "$target" 2>/dev/null || break
      detached=$((detached + 1))
      tries=$((tries + 1))
    done
    if command -v nsenter >/dev/null 2>&1 && [ -d /proc/1/ns/mnt ]; then
      tries=0
      while [ "$tries" -lt 6 ]; do
        nsenter --mount=/proc/1/ns/mnt -- \
          awk -v target="$target" -v root="${RUNTIME_MOUNT_ROOT:-/dev/.cb0}" '
            $5 == target && (
              index($0, root) > 0 ||
              index($0, "/dev/.cb0") > 0 ||
              index($0, "/dev/.cb1") > 0 ||
              index($0, "/data/local/tmp/.fs0") > 0 ||
              index($0, "/data/local/tmp/.fs1") > 0 ||
              index($0, "/data/local/tmp/sys-ca-merge") > 0
            ) { found=1 }
            END { exit found ? 0 : 1 }
          ' /proc/self/mountinfo 2>/dev/null || break
        nsenter --mount=/proc/1/ns/mnt -- umount "$target" 2>/dev/null || \
          nsenter --mount=/proc/1/ns/mnt -- umount -l "$target" 2>/dev/null || break
        detached=$((detached + 1))
        tries=$((tries + 1))
      done
    fi
  done

  if [ -d "$RUNTIME_MOUNT_ROOT" ]; then
    for stage in "$RUNTIME_MOUNT_ROOT"/*; do
      [ -d "$stage" ] || continue
      if mountpoint -q "$stage" 2>/dev/null; then
        umount "$stage" 2>/dev/null || umount -l "$stage" 2>/dev/null || true
      fi
    done
  fi
  [ "$detached" -gt 0 ] && \
    log_info "store: detached $detached leftover runtime cacert bind(s)"
  return 0
}

# compatible：APEX（34+）+ system，全程运行时 bind。
# magic：system 交给 Magic Mount（模块内仅 addon）；34+ 仍对 APEX 做运行时 bind。
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
  # 轻量 Magic：system 路径不 bind，避免盖掉 Magic Mount 叠层
  if is_magic_mount_mode; then
    return 0
  fi
  if [ -d "$SYSTEM_CACERTS" ]; then
    case "$seen" in *"|$SYSTEM_CACERTS|"*) ;; *)
      echo "$SYSTEM_CACERTS"
      ;;
    esac
  fi
}

# 仅写入启用的 addon（绝不能塞整库，否则部分环境会整目录遮蔽系统 CA）。
sync_magic_overlay() {
  root="${1:-$MODDIR}"
  dest="$root/system/etc/security/cacerts"
  mkdir -p "$dest" || return 1
  # 清空旧叠层，避免残留 hash 或误放整库文件
  for old in "$dest"/*; do
    [ -e "$old" ] || continue
    rm -f "$old" 2>/dev/null
  done
  tmp_map="$STATEDIR/.magic-overlay.$$"
  mkdir -p "$STATEDIR" 2>/dev/null
  : >"$tmp_map"
  if [ -s "$APPLIED_MAP" ] && [ -d "$GEN_CERTS" ]; then
    while IFS='|' read -r label name checksum display; do
      [ -n "$name" ] || continue
      [ -f "$GEN_CERTS/$name" ] || continue
      cp -f "$GEN_CERTS/$name" "$dest/$name" 2>/dev/null || {
        rm -f "$tmp_map"
        return 1
      }
      echo "$label|$name|$checksum|$display" >>"$tmp_map"
    done <"$APPLIED_MAP"
  else
    install_addon_certs_into "$dest" "$tmp_map" || {
      rm -f "$tmp_map"
      return 1
    }
  fi
  chown -R 0:0 "$dest" 2>/dev/null
  chmod 0755 "$dest" 2>/dev/null
  chmod 0644 "$dest"/* 2>/dev/null
  set_selinux_context "$SYSTEM_CACERTS" "$dest" 2>/dev/null || true
  n=$(count_certs "$dest")
  rm -f "$tmp_map"
  if [ "${n:-0}" -eq 0 ]; then
    # 空目录叠层在部分 KSU 上会整目录遮蔽系统 CA，必须删掉
    clear_magic_overlay "$root"
    log_debug "magic-overlay: no addons, removed empty system overlay"
    echo 0
    return 0
  fi
  log_info "magic-overlay: synced $n addon cert(s) -> system/etc/security/cacerts"
  echo "$n"
}

clear_magic_overlay() {
  root="${1:-$MODDIR}"
  dest="$root/system/etc/security/cacerts"
  if [ -d "$dest" ]; then
    rm -rf "$dest" 2>/dev/null
    log_debug "magic-overlay: cleared $dest"
  fi
  # 若 system 树已空，顺带去掉空目录，避免无意义 Magic Mount 节点
  rmdir "$root/system/etc/security" 2>/dev/null
  rmdir "$root/system/etc" 2>/dev/null
  rmdir "$root/system" 2>/dev/null
  return 0
}

# 开机前按模式准备叠层：magic 同步 addon；compatible 清掉 system/ 叠层
prepare_mount_mode_overlay() {
  root="${1:-$MODDIR}"
  if is_magic_mount_mode; then
    sync_magic_overlay "$root" >/dev/null
  else
    clear_magic_overlay "$root"
  fi
}

verify_magic_overlay_live() {
  [ -s "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    [ -f "$SYSTEM_CACERTS/$name" ] || return 1
    actual=$(cksum "$SYSTEM_CACERTS/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
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
