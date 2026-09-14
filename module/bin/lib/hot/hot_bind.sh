# 由 hot_mount.sh 加载；勿单独执行
# bind / 校验 / 卸载
hot_verify_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_SESSION="$3"
  HOT_EXPECTED="$4"
  [ "$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SESSION" ] || return 1
  HOT_COUNT=$(nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    sh -c "ls -1 '$HOT_TARGET'/*.* 2>/dev/null | wc -l" 2>/dev/null | tr -d ' ')
  [ "${HOT_COUNT:-0}" -eq "$HOT_EXPECTED" ]
}

hot_rollback_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_MOUNT_ID="$3"
  HOT_SOURCE_ID="$4"
  [ "$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_MOUNT_ID" ] || return 1
  [ "$(hot_path_identity_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SOURCE_ID" ] || return 1
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- umount "$HOT_TARGET" 2>/dev/null
}

hot_bind_pid() {
  HOT_PID="$1"
  HOT_NS="$2"
  HOT_TARGET="$3"
  HOT_SESSION="$4"
  HOT_EXPECTED="$5"
  HOT_SOURCE_ID=$(hot_read_state source_identity)
  [ -n "$HOT_SOURCE_ID" ] || return 1
  HOT_EXISTING=$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")
  [ -z "$HOT_EXISTING" ] || {
    if hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
      echo "mounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
      return 0
    fi
    return 1
  }
  HOT_SOURCE=$(hot_source_for_pid "$HOT_PID") || return 1
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- mount --bind "$HOT_SOURCE" "$HOT_TARGET" 2>/dev/null || \
    return 1
  HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
  HOT_TARGET_ID=$(hot_path_identity_for_pid "$HOT_PID" "$HOT_TARGET")
  if [ -z "$HOT_MOUNT_ID" ] || [ "$HOT_TARGET_ID" != "$HOT_SOURCE_ID" ]; then
    echo "uncertain|$HOT_NS|$HOT_PID" >>"$HOT_LEDGER"
    hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1
    return 1
  fi
  echo "mounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
  if ! nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
      mount -o remount,bind,ro "$HOT_TARGET" 2>/dev/null; then
    if hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1; then
      echo "unmounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
    fi
    return 1
  fi
  if ! hot_verify_pid "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" "$HOT_EXPECTED"; then
    if hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1; then
      echo "unmounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
    fi
    return 1
  fi
}

hot_unmount_pass() {
  HOT_SESSION="$1"
  HOT_TARGET="$2"
  HOT_NS_FILE="$HOT_ROOT/.namespaces.$$"
  hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
  while IFS='|' read -r HOT_NS HOT_PID; do
    [ -n "$HOT_PID" ] || continue
    hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" || continue
    HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
    HOT_SOURCE_ID=$(hot_read_state source_identity)
    if hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1; then
      echo "unmounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
    fi
  done <"$HOT_NS_FILE"
  rm -f "$HOT_NS_FILE"
}

hot_count_mounted_namespaces() {
  HOT_SESSION="$1"
  HOT_TARGET="$2"
  HOT_NS_FILE="$HOT_ROOT/.namespaces.$$"
  HOT_MOUNTED=0
  hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
  while IFS='|' read -r HOT_NS HOT_PID; do
    [ -n "$HOT_PID" ] || continue
    if hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" || \
        hot_namespace_may_reference_session "$HOT_PID" "$HOT_NS" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_MOUNTED=$((HOT_MOUNTED + 1))
    fi
  done <"$HOT_NS_FILE"
  rm -f "$HOT_NS_FILE"
  echo "$HOT_MOUNTED"
}

hot_runtime_counts() {
  HOT_SESSION="$1"
  HOT_TARGET="$2"
  HOT_NS_FILE="$HOT_ROOT/.status-namespaces.$$"
  HOT_RUNTIME_OWNED=0
  HOT_RUNTIME_PROBLEM=0
  hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
  while IFS='|' read -r HOT_NS HOT_PID; do
    [ -n "$HOT_PID" ] || continue
    if hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_RUNTIME_OWNED=$((HOT_RUNTIME_OWNED + 1))
    elif hot_namespace_may_reference_session "$HOT_PID" "$HOT_NS" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_RUNTIME_PROBLEM=$((HOT_RUNTIME_PROBLEM + 1))
    elif awk -F'|' -v ns="$HOT_NS" '$1 == "failed" && $2 == ns { found=1 } END { exit !found }' \
        "$HOT_LEDGER" 2>/dev/null; then
      HOT_RUNTIME_PROBLEM=$((HOT_RUNTIME_PROBLEM + 1))
    fi
  done <"$HOT_NS_FILE"
  rm -f "$HOT_NS_FILE"
  echo "$HOT_RUNTIME_OWNED|$HOT_RUNTIME_PROBLEM"
}

hot_unmount_internal() {
  HOT_SESSION=$(hot_read_state session_id)
  HOT_TARGET=$(hot_read_state target)
  HOT_STATE_BOOT=$(hot_read_state boot_id)
  HOT_STATE_EPOCH=$(hot_read_state boot_epoch)
  [ -n "$HOT_SESSION" ] || HOT_SESSION=$(cat "$HOT_CERTS/$HOT_MARKER" 2>/dev/null | tr -d '\r\n')
  [ -n "$HOT_TARGET" ] || HOT_TARGET=$(get_target_store)
  [ -n "$HOT_SESSION" ] && [ -n "$HOT_TARGET" ] || {
    [ -d "$HOT_CURRENT" ] && return 1
    hot_teardown_bind_stage
    rm -f "$HOT_STATE"
    return 0
  }
  if ! hot_session_boot_fresh "$HOT_STATE_BOOT" "$HOT_STATE_EPOCH"; then
    HOT_REMAINING=$(hot_count_mounted_namespaces "$HOT_SESSION" "$HOT_TARGET")
    if [ "$HOT_REMAINING" -eq 0 ]; then
      hot_teardown_bind_stage
      rm -rf "$HOT_CURRENT" 2>/dev/null
      rm -f "$HOT_STATE"
      return 0
    fi
    # 软重启已递增 epoch，会话标记过期但仍有残留挂载：继续卸载，勿直接失败
    log_warn "hot: stale boot token with $HOT_REMAINING mounts, force unmount"
  fi

  HOT_PASS=0
  while [ "$HOT_PASS" -lt 3 ]; do
    hot_unmount_pass "$HOT_SESSION" "$HOT_TARGET"
    HOT_PASS=$((HOT_PASS + 1))
  done
  HOT_REMAINING=$(hot_count_mounted_namespaces "$HOT_SESSION" "$HOT_TARGET")
  [ "$HOT_REMAINING" -eq 0 ] || return 1
  hot_teardown_bind_stage
  rm -rf "$HOT_CURRENT" 2>/dev/null
  rm -f "$HOT_STATE"
  log_info "hot: session $HOT_SESSION removed without reboot"
}
