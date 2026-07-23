#!/system/bin/sh
# 将已校验的开机证书集注入到系统信任库。
# 为每个目标路径准备独立临时层并设置 SELinux，再绑定到相关命名空间。
# 只读重挂载失败时不撤销已经成功的绑定。

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

RUNTIME_MOUNT_ROOT="$DATADIR/runtime-mounts"

target_stage_dir() {
  target="$1"
  case "$target" in
    "$APEX_CACERTS") echo "$RUNTIME_MOUNT_ROOT/apex" ;;
    "$SYSTEM_CACERTS") echo "$RUNTIME_MOUNT_ROOT/system" ;;
    *)
      # versioned apex or unexpected path
      name=$(echo "$target" | tr '/@' '__' | sed 's/__*/_/g')
      echo "$RUNTIME_MOUNT_ROOT/$name"
      ;;
  esac
}

current_mount_id() {
  target="$1"
  awk -v target="$target" '
    $5 == target && ($1 + 0) > max { max=$1 }
    END { if (max) print max }
  ' /proc/self/mountinfo 2>/dev/null
}

pid_mount_id() {
  pid="$1"
  target="$2"
  nsenter --mount=/proc/"$pid"/ns/mnt -- awk -v target="$target" '
    $5 == target && ($1 + 0) > max { max=$1 }
    END { if (max) print max }
  ' /proc/self/mountinfo 2>/dev/null
}

# Best-effort placeholder（保留函数名以兼容调用点）。
# bind 后不再 remount,ro：部分机型会干扰 Conscrypt 读取信任库。
try_remount_ro_current() {
  :
}

try_remount_ro_pid() {
  :
}

prepare_target_stage() {
  target="$1"
  stage=$(target_stage_dir "$target")
  mkdir -p "$RUNTIME_MOUNT_ROOT" || return 1

  if ! mountpoint -q "$stage" 2>/dev/null; then
    rm -rf "$stage" 2>/dev/null
    mkdir -p "$stage" || return 1
    mount -t tmpfs -o mode=755 tmpfs "$stage" 2>/dev/null || {
      log_msg "inject: tmpfs mount failed ($stage)"
      return 1
    }
  fi

  # Refresh contents from immutable generation
  rm -f "$stage"/* 2>/dev/null
  for cert in "$GEN_CERTS"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    cp -f "$cert" "$stage/$name" 2>/dev/null || {
      log_msg "inject: copy to tmpfs failed ($name)"
      return 1
    }
  done
  [ "$(count_certs "$stage")" -eq "$(count_certs "$GEN_CERTS")" ] || {
    log_msg "inject: tmpfs cert count mismatch for $target"
    return 1
  }

  chown -R 0:0 "$stage" 2>/dev/null
  chmod 0755 "$stage" 2>/dev/null
  chmod 0644 "$stage"/*.* 2>/dev/null
  # Critical for Flutter/Reqable reading /system/etc/security/cacerts
  set_selinux_context "$target" "$stage" || {
    log_msg "inject: SELinux context for $target failed"
    return 1
  }
  echo "$stage"
}

stage_visible_for_pid() {
  pid="$1"
  stage="$2"
  if nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "$stage" 2>/dev/null; then
    echo "$stage"
    return 0
  fi
  if nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "/proc/1/root$stage" 2>/dev/null; then
    echo "/proc/1/root$stage"
    return 0
  fi
  return 1
}

# 绑定成功即保留。后续内容/归属检查仅用于日志；失败绝不 umount 回滚。
# （过严回滚曾导致「检测已安装、实际 TLS 仍失败」。）
bind_current_once() {
  target="$1"
  stage="$2"
  source_id=$(path_identity "$stage")
  [ -n "$source_id" ] || return 1

  if verify_direct_store "$target"; then
    if [ "$(path_identity "$target")" = "$source_id" ]; then
      log_msg "inject: current ns already valid ($target)"
      return 0
    fi
    log_msg "inject: current ns has compatible content; rebinding to owned tmpfs ($target)"
  fi

  mount --bind "$stage" "$target" 2>/dev/null || {
    log_msg "inject: current ns bind failed ($target)"
    return 1
  }
  if [ "$(path_identity "$target")" != "$source_id" ]; then
    log_msg "inject: current ns ownership mismatch after bind ($target) (keep mount)"
  fi
  if ! verify_direct_store "$target"; then
    log_msg "inject: current ns content verify soft-fail ($target) (keep mount)"
  fi
  log_msg "inject: current ns injected ($target)"
  return 0
}

bind_pid_once() {
  pid="$1"
  label="$2"
  target="$3"
  stage="$4"
  [ -d "/proc/$pid/ns" ] || return 0
  source_id=$(path_identity "$stage")
  [ -n "$source_id" ] || return 1

  if verify_namespace_store "$pid" "$target"; then
    if [ "$(namespace_path_identity "$pid" "$target")" = "$source_id" ]; then
      log_msg "inject: $label pid=$pid already valid"
      return 0
    fi
    log_msg "inject: $label pid=$pid rebinding to owned tmpfs"
  fi

  src=$(stage_visible_for_pid "$pid" "$stage") || {
    log_msg "inject: $label pid=$pid cannot see stage $stage"
    return 1
  }
  nsenter --mount=/proc/"$pid"/ns/mnt -- mount --bind "$src" "$target" 2>/dev/null || {
    log_msg "inject: $label pid=$pid bind failed"
    return 1
  }
  if [ "$(namespace_path_identity "$pid" "$target")" != "$source_id" ]; then
    log_msg "inject: $label pid=$pid ownership mismatch after bind (keep mount)"
  fi
  if ! verify_namespace_store "$pid" "$target"; then
    log_msg "inject: $label pid=$pid content verify soft-fail (keep mount)"
  fi
  log_msg "inject: $label pid=$pid injected"
  return 0
}

bind_package_soft() {
  pkg="$1"
  target="$2"
  stage="$3"
  for pid in $(pidof "$pkg" 2>/dev/null); do
    bind_pid_once "$pid" "$pkg" "$target" "$stage" || \
      log_msg "inject: optional package $pkg pid=$pid skipped/failed"
  done
}

# 只收集关键命名空间，不再遍历全部 /proc（会在部分机型上卡住，导致状态永久「注入中」）
collect_inject_namespaces() {
  ns_file="$1"
  target="$2"
  : >"$ns_file"
  seen="|"
  for pid in 1 \
      $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null) \
      $(pgrep -x zygote 2>/dev/null) $(pgrep -x zygote64 2>/dev/null) \
      $(pidof com.android.settings 2>/dev/null) \
      $(pidof com.reqable.android 2>/dev/null) \
      $(pidof com.reqable.android.pro 2>/dev/null) \
      $(pidof com.reqable 2>/dev/null) \
      $(pidof com.proxy.pin 2>/dev/null) \
      $(pidof com.network.proxy 2>/dev/null) \
      $(pidof com.wangyu.proxypin 2>/dev/null); do
    [ -n "$pid" ] || continue
    [ -d "/proc/$pid/ns" ] || continue
    ns=$(readlink "/proc/$pid/ns/mnt" 2>/dev/null)
    [ -n "$ns" ] || continue
    case "$seen" in *"|$ns|"*) continue ;; esac
    nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "$target" 2>/dev/null || continue
    echo "$ns|$pid" >>"$ns_file"
    seen="$seen$ns|"
  done
}

inject_one_target() {
  target="$1"
  mode="$2"
  [ -d "$target" ] || {
    log_msg "inject: skip missing target $target"
    return 0
  }

  stage=$(prepare_target_stage "$target") || return 1
  rc=0
  bind_current_once "$target" "$stage" || rc=1

  if command -v nsenter >/dev/null 2>&1; then
    bind_pid_once 1 init "$target" "$stage" || rc=1

    if [ "$mode" = "namespaces" ] || [ "$mode" = "boot" ]; then
      for process in zygote zygote64; do
        for pid in $(pidof "$process" 2>/dev/null) $(pgrep -x "$process" 2>/dev/null); do
          bind_pid_once "$pid" "$process" "$target" "$stage" || rc=1
        done
      done
    fi

    if [ "$mode" = "namespaces" ]; then
      for pkg in \
        com.android.settings \
        com.reqable.android \
        com.reqable.android.pro \
        com.reqable \
        com.proxy.pin \
        com.network.proxy \
        com.wangyu.proxypin; do
        bind_package_soft "$pkg" "$target" "$stage"
      done

      ns_file="$STATEDIR/.inject-ns.$$"
      collect_inject_namespaces "$ns_file" "$target"
      injected=0
      failed=0
      while IFS='|' read -r ns pid; do
        [ -n "$pid" ] || continue
        ns_now=$(readlink "/proc/$pid/ns/mnt" 2>/dev/null)
        [ "$ns_now" = "$ns" ] || {
          failed=$((failed + 1))
          continue
        }
        if bind_pid_once "$pid" "ns:$pid" "$target" "$stage"; then
          injected=$((injected + 1))
        else
          failed=$((failed + 1))
        fi
      done <"$ns_file"
      rm -f "$ns_file"
      log_msg "inject: target=$target namespaces ok=$injected fail=$failed"
    fi
  else
    log_msg "inject: nsenter unavailable"
    rc=1
  fi
  return "$rc"
}

inject_boot_namespaces() {
  generation_valid || { log_msg "inject: generation invalid"; return 1; }
  [ -s "$APPLIED_MAP" ] || {
    log_msg "inject: no enabled addon, keep original store"
    return 0
  }

  rc=0
  has_target=0
  for target in $(list_target_stores); do
    has_target=1
    inject_one_target "$target" boot || rc=1
  done
  [ "$has_target" = "1" ] || {
    log_msg "inject: no CA target directory found"
    return 1
  }
  return "$rc"
}

inject_app_namespaces() {
  generation_valid || return 1
  [ -s "$APPLIED_MAP" ] || return 0
  command -v nsenter >/dev/null 2>&1 || return 1

  rc=0
  for target in $(list_target_stores); do
    inject_one_target "$target" namespaces || rc=1
  done
  return "$rc"
}

case "${1:-boot}" in
  boot) inject_boot_namespaces ;;
  namespaces) inject_app_namespaces ;;
  verify) [ "$(check_store_injected)" != "0" ] ;;
  *)
    echo "usage: apex_inject.sh {boot|namespaces|verify}"
    exit 1
    ;;
esac
