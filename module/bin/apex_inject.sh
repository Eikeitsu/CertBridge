#!/system/bin/sh
# Bind one validated, immutable boot generation over the active CA store.
# The generation is rebuilt from the live store only before the first bind.

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

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

rollback_current_owned() {
  target="$1"
  mount_id="$2"
  source_id="$3"
  [ "$(current_mount_id "$target")" = "$mount_id" ] || return 1
  [ "$(path_identity "$target")" = "$source_id" ] || return 1
  umount "$target" 2>/dev/null
}

rollback_pid_owned() {
  pid="$1"
  target="$2"
  mount_id="$3"
  source_id="$4"
  [ "$(pid_mount_id "$pid" "$target")" = "$mount_id" ] || return 1
  [ "$(namespace_path_identity "$pid" "$target")" = "$source_id" ] || return 1
  nsenter --mount=/proc/"$pid"/ns/mnt -- umount "$target" 2>/dev/null
}

source_for_pid() {
  pid="$1"
  if nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "$GEN_CERTS" 2>/dev/null; then
    echo "$GEN_CERTS"
  elif nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "/proc/1/root$GEN_CERTS" 2>/dev/null; then
    echo "/proc/1/root$GEN_CERTS"
  else
    return 1
  fi
}

source_visible_for_pid() {
  pid="$1"
  src=$(source_for_pid "$pid") || return 1
  expected=$(count_certs "$GEN_CERTS")
  n=$(nsenter --mount=/proc/"$pid"/ns/mnt -- sh -c \
    "ls -1 '$src'/*.* 2>/dev/null | wc -l" 2>/dev/null | tr -d ' ')
  [ "${n:-0}" -ge "$expected" ]
}

bind_current_once() {
  target="$1"
  verify_direct_store "$target" && {
    source_id=$(path_identity "$GEN_CERTS")
    if [ -n "$source_id" ] && [ "$(path_identity "$target")" = "$source_id" ]; then
      mount -o remount,bind,ro "$target" 2>/dev/null || {
        log_msg "inject: current namespace read-only remount failed"
        return 1
      }
      log_msg "inject: current namespace already owned and valid"
    else
      log_msg "inject: compatible external CA layer already valid; leave ownership unchanged"
    fi
    return 0
  }
  source_id=$(path_identity "$GEN_CERTS")
  [ -n "$source_id" ] || return 1
  mount --bind "$GEN_CERTS" "$target" 2>/dev/null || {
    log_msg "inject: current namespace bind failed ($target)"
    return 1
  }
  mount_id=$(current_mount_id "$target")
  if [ -z "$mount_id" ] || [ "$(path_identity "$target")" != "$source_id" ]; then
    log_msg "inject: current namespace ownership verification failed"
    return 1
  fi
  if ! mount -o remount,bind,ro "$target" 2>/dev/null; then
    log_msg "inject: current namespace read-only remount failed"
    rollback_current_owned "$target" "$mount_id" "$source_id" >/dev/null 2>&1
    return 1
  fi
  verify_direct_store "$target" || {
    log_msg "inject: current namespace verification failed"
    rollback_current_owned "$target" "$mount_id" "$source_id" >/dev/null 2>&1
    return 1
  }
  log_msg "inject: current namespace injected ($target)"
}

bind_pid_once() {
  pid="$1"
  label="$2"
  target="$3"
  [ -d "/proc/$pid/ns" ] || return 0
  verify_namespace_store "$pid" "$target" && {
    source_id=$(path_identity "$GEN_CERTS")
    if [ -n "$source_id" ] && [ "$(namespace_path_identity "$pid" "$target")" = "$source_id" ]; then
      nsenter --mount=/proc/"$pid"/ns/mnt -- mount -o remount,bind,ro "$target" 2>/dev/null || {
        log_msg "inject: $label pid=$pid read-only remount failed"
        return 1
      }
      log_msg "inject: $label pid=$pid already owned and valid"
    else
      log_msg "inject: $label pid=$pid compatible external CA layer valid"
    fi
    return 0
  }
  source_visible_for_pid "$pid" || {
    log_msg "inject: $label pid=$pid cannot see complete generation"
    return 1
  }
  src=$(source_for_pid "$pid") || return 1
  source_id=$(path_identity "$GEN_CERTS")
  [ -n "$source_id" ] || return 1
  nsenter --mount=/proc/"$pid"/ns/mnt -- mount --bind "$src" "$target" 2>/dev/null || {
    log_msg "inject: $label pid=$pid bind failed"
    return 1
  }
  mount_id=$(pid_mount_id "$pid" "$target")
  if [ -z "$mount_id" ] || [ "$(namespace_path_identity "$pid" "$target")" != "$source_id" ]; then
    log_msg "inject: $label pid=$pid ownership verification failed"
    return 1
  fi
  if ! nsenter --mount=/proc/"$pid"/ns/mnt -- mount -o remount,bind,ro "$target" 2>/dev/null; then
    log_msg "inject: $label pid=$pid read-only remount failed"
    rollback_pid_owned "$pid" "$target" "$mount_id" "$source_id" >/dev/null 2>&1
    return 1
  fi
  verify_namespace_store "$pid" "$target" || {
    log_msg "inject: $label pid=$pid verification failed"
    rollback_pid_owned "$pid" "$target" "$mount_id" "$source_id" >/dev/null 2>&1
    return 1
  }
  log_msg "inject: $label pid=$pid injected"
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
    bind_current_once "$target" || rc=1
    if command -v nsenter >/dev/null 2>&1; then
      bind_pid_once 1 init "$target" || rc=1
    else
      log_msg "inject: nsenter unavailable"
      rc=1
    fi
  done
  [ "$has_target" = "1" ] || {
    log_msg "inject: no CA target directory found"
    return 1
  }
  return "$rc"
}

# Soft-bind one package if running; failures are logged but do not fail boot.
bind_package_soft() {
  pkg="$1"
  target="$2"
  for pid in $(pidof "$pkg" 2>/dev/null); do
    bind_pid_once "$pid" "$pkg" "$target" || \
      log_msg "inject: optional package $pkg pid=$pid bind skipped/failed"
  done
}

collect_inject_namespaces() {
  ns_file="$1"
  target="$2"
  : >"$ns_file"
  seen="|"
  for pid in 1 $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$pid/ns" ] || continue
    ns=$(readlink "/proc/$pid/ns/mnt" 2>/dev/null)
    [ -n "$ns" ] || continue
    case "$seen" in *"|$ns|"*) continue ;; esac
    nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "$target" 2>/dev/null || continue
    echo "$ns|$pid" >>"$ns_file"
    seen="$seen$ns|"
  done
  for proc in /proc/[0-9]*; do
    [ -d "$proc/ns" ] || continue
    pid=${proc##*/}
    ns=$(readlink "/proc/$pid/ns/mnt" 2>/dev/null)
    [ -n "$ns" ] || continue
    case "$seen" in *"|$ns|"*) continue ;; esac
    nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "$target" 2>/dev/null || continue
    echo "$ns|$pid" >>"$ns_file"
    seen="$seen$ns|"
  done
}

inject_app_namespaces() {
  generation_valid || return 1
  [ -s "$APPLIED_MAP" ] || return 0
  command -v nsenter >/dev/null 2>&1 || return 1

  rc=0
  for target in $(list_target_stores); do
    bind_pid_once 1 init "$target" || rc=1
    for process in zygote zygote64; do
      for pid in $(pidof "$process" 2>/dev/null); do
        bind_pid_once "$pid" "$process" "$target" || rc=1
      done
    done

    # Settings + 抓包 App：检测逻辑和 TLS 都依赖自身命名空间
    for pkg in \
      com.android.settings \
      com.reqable.android \
      com.reqable.android.pro \
      com.reqable \
      com.proxy.pin \
      com.network.proxy \
      com.wangyu.proxypin; do
      bind_package_soft "$pkg" "$target"
    done

    # 覆盖已启动应用命名空间，避免「Settings 有证书、App 仍 TLS 失败」
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
      if bind_pid_once "$pid" "ns:$pid" "$target"; then
        injected=$((injected + 1))
      else
        failed=$((failed + 1))
      fi
    done <"$ns_file"
    rm -f "$ns_file"
    log_msg "inject: target=$target namespaces ok=$injected fail=$failed"
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
