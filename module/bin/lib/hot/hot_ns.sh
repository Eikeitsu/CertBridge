# 由 hot_mount.sh 加载；勿单独执行
# 命名空间探测与会话归属判断
hot_namespace_id() {
  readlink "/proc/$1/ns/mnt" 2>/dev/null
}

hot_namespace_has_target() {
  nsenter --mount=/proc/"$1"/ns/mnt -- test -d "$2" 2>/dev/null
}

hot_collect_namespaces() {
  HOT_NS_FILE="$1"
  HOT_TARGET="$2"
  : >"$HOT_NS_FILE"
  HOT_SEEN="|"

  for HOT_PID in 1 $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$HOT_PID/ns" ] || continue
    HOT_NS=$(hot_namespace_id "$HOT_PID")
    [ -n "$HOT_NS" ] || continue
    case "$HOT_SEEN" in *"|$HOT_NS|"*) continue ;; esac
    hot_namespace_has_target "$HOT_PID" "$HOT_TARGET" || continue
    echo "$HOT_NS|$HOT_PID" >>"$HOT_NS_FILE"
    HOT_SEEN="$HOT_SEEN$HOT_NS|"
  done

  for HOT_PROC in /proc/[0-9]*; do
    [ -d "$HOT_PROC/ns" ] || continue
    HOT_PID=${HOT_PROC##*/}
    HOT_NS=$(hot_namespace_id "$HOT_PID")
    [ -n "$HOT_NS" ] || continue
    case "$HOT_SEEN" in *"|$HOT_NS|"*) continue ;; esac
    hot_namespace_has_target "$HOT_PID" "$HOT_TARGET" || continue
    echo "$HOT_NS|$HOT_PID" >>"$HOT_NS_FILE"
    HOT_SEEN="$HOT_SEEN$HOT_NS|"
  done
}

hot_prepare_bind_stage() {
  HOT_TARGET=$(hot_read_state target)
  [ -d "$HOT_CERTS" ] || return 1
  [ -n "$HOT_TARGET" ] || HOT_TARGET=$(get_target_store)
  mkdir -p "$HOT_BIND_ROOT" || return 1
  if ! mountpoint -q "$HOT_BIND_ROOT" 2>/dev/null; then
    umount "$HOT_BIND_ROOT" 2>/dev/null
    rm -rf "$HOT_BIND_ROOT" 2>/dev/null
    mkdir -p "$HOT_BIND_ROOT" || return 1
    mount -t tmpfs -o mode=755 tmpfs "$HOT_BIND_ROOT" 2>/dev/null || return 1
  fi
  for HOT_F in "$HOT_BIND_ROOT"/*; do
    [ -e "$HOT_F" ] || continue
    rm -f "$HOT_F" 2>/dev/null
  done
  for HOT_F in "$HOT_CERTS"/*; do
    [ -f "$HOT_F" ] || continue
    cp -f "$HOT_F" "$HOT_BIND_ROOT/$(basename "$HOT_F")" 2>/dev/null || return 1
  done
  [ -f "$HOT_CERTS/$HOT_MARKER" ] || return 1
  [ -f "$HOT_BIND_ROOT/$HOT_MARKER" ] || \
    cp -f "$HOT_CERTS/$HOT_MARKER" "$HOT_BIND_ROOT/$HOT_MARKER" 2>/dev/null || return 1
  chown -R 0:0 "$HOT_BIND_ROOT" 2>/dev/null
  chmod 0755 "$HOT_BIND_ROOT" 2>/dev/null
  chmod 0644 "$HOT_BIND_ROOT"/* 2>/dev/null
  set_selinux_context "$HOT_TARGET" "$HOT_BIND_ROOT" || return 1
  HOT_SOURCE_ID=$(stat -c '%d:%i' "$HOT_BIND_ROOT" 2>/dev/null | tr -d '\r\n')
  [ -n "$HOT_SOURCE_ID" ] || return 1
  hot_state_set source_identity "$HOT_SOURCE_ID" || return 1
  log_debug "hot: bind stage ready at $HOT_BIND_ROOT"
}

hot_teardown_bind_stage() {
  umount "$HOT_BIND_ROOT" 2>/dev/null
  rm -rf "$HOT_BIND_ROOT" 2>/dev/null
}

hot_source_for_pid() {
  HOT_PID="$1"
  if nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- test -d "$HOT_BIND_ROOT" 2>/dev/null; then
    echo "$HOT_BIND_ROOT"
  elif nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- test -d "/proc/1/root$HOT_BIND_ROOT" 2>/dev/null; then
    echo "/proc/1/root$HOT_BIND_ROOT"
  else
    return 1
  fi
}

hot_marker_for_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    sh -c "cat '$HOT_TARGET/$HOT_MARKER' 2>/dev/null" 2>/dev/null | tr -d '\r\n'
}

hot_path_identity_for_pid() {
  HOT_PID="$1"
  HOT_PATH="$2"
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- stat -c '%d:%i' "$HOT_PATH" 2>/dev/null | \
    tr -d '\r\n'
}

hot_mount_id_for_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    awk -v target="$HOT_TARGET" '
      $5 == target && ($1 + 0) > max { max=$1 }
      END { if (max) print max }
    ' /proc/self/mountinfo 2>/dev/null | tr -d '\r\n'
}

hot_ledger_has_mount_id() {
  HOT_MOUNT_ID="$1"
  HOT_NS="$2"
  [ -n "$HOT_MOUNT_ID" ] && [ -f "$HOT_LEDGER" ] || return 1
  awk -F'|' -v id="$HOT_MOUNT_ID" -v ns="$HOT_NS" '
    $1 == "mounted" && $3 == id { found=1 }
    $1 == "unmounted" && $2 == ns && $3 == id { removed=1 }
    END { exit !(found && !removed) }
  ' \
    "$HOT_LEDGER" 2>/dev/null
}

hot_mount_points_to_source() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_MOUNT_ID="$3"
  HOT_MOUNT_LINE=$(nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    awk -v target="$HOT_TARGET" -v id="$HOT_MOUNT_ID" \
      '$1 == id && $5 == target { print; exit }' /proc/self/mountinfo 2>/dev/null)
  case "$HOT_MOUNT_LINE" in
    *"$HOT_BIND_ROOT"*|*"$HOT_CERTS"*|*"/dev/.cb1"*|*"/data/local/tmp/.fs1"*|*"/data/local/tmp/sys-ca-merge-hot"*|\
    *"/adb/modules/CertBridge/certs/hot/current/cacerts"*|*"/CertBridge/certs/hot/current/cacerts"*)
      return 0
      ;;
  esac
  return 1
}

hot_top_owned_by_session() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_SESSION="$3"
  HOT_SOURCE_ID=$(hot_read_state source_identity)
  [ -n "$HOT_SOURCE_ID" ] || return 1
  [ "$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SESSION" ] || return 1
  HOT_TARGET_ID=$(hot_path_identity_for_pid "$HOT_PID" "$HOT_TARGET")
  [ "$HOT_TARGET_ID" = "$HOT_SOURCE_ID" ] || return 1
  HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
  HOT_NS=$(hot_namespace_id "$HOT_PID")
  hot_ledger_has_mount_id "$HOT_MOUNT_ID" "$HOT_NS" || \
    hot_mount_points_to_source "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID"
}

hot_namespace_may_reference_session() {
  HOT_PID="$1"
  HOT_NS="$2"
  HOT_TARGET="$3"
  HOT_SESSION="$4"
  [ -f "$HOT_LEDGER" ] || return 0

  if [ "$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SESSION" ]; then
    return 0
  fi
  HOT_LEDGER_BOOT=$(hot_read_state boot_id)
  HOT_CURRENT_BOOT=$(hot_boot_id)
  if [ -n "$HOT_LEDGER_BOOT" ] && [ "$HOT_LEDGER_BOOT" = "$HOT_CURRENT_BOOT" ] && \
      awk -F'|' -v ns="$HOT_NS" '
      ($1 == "mounted" && $2 == ns) { mounted[$3]=1 }
      ($1 == "unmounted" && $2 == ns) { delete mounted[$3] }
      ($1 == "intent" && $2 == ns) { intent=1 }
      ($1 == "mounted" && $2 == ns) { resolved=1 }
      ($1 == "failed" && $2 == ns) { resolved=1 }
      ($1 == "uncertain" && $2 == ns) { uncertain=1 }
      END {
        for (id in mounted) found=1
        exit !(found || uncertain || (intent && !resolved))
      }
    ' "$HOT_LEDGER" 2>/dev/null; then
    return 0
  fi
  HOT_IDS=$(nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    awk -v target="$HOT_TARGET" '$5 == target { print $1 }' /proc/self/mountinfo 2>/dev/null)
  for HOT_MOUNT_ID in $HOT_IDS; do
    hot_ledger_has_mount_id "$HOT_MOUNT_ID" "$HOT_NS" && return 0
    hot_mount_points_to_source "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" && return 0
  done
  return 1
}
