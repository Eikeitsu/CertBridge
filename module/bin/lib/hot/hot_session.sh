# 由 hot_mount.sh 加载；勿单独执行
# 挂载编排、启停与 status
hot_mount_namespaces() {
  HOT_PRIMARY=$(hot_read_state target)
  HOT_SESSION=$(hot_read_state session_id)
  HOT_EXPECTED=$(hot_read_state store_count)
  hot_prepare_bind_stage || {
    log_error "hot: failed to prepare bind stage at $HOT_BIND_ROOT"
    return 1
  }
  HOT_OK=0
  HOT_FAIL=0
  for HOT_TARGET in $(list_target_stores); do
    HOT_NS_FILE="$HOT_ROOT/.namespaces.$$"
    hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
    while IFS='|' read -r HOT_NS HOT_PID; do
      [ -n "$HOT_PID" ] || continue
      HOT_NS_BEFORE=$(hot_namespace_id "$HOT_PID")
      [ "$HOT_NS_BEFORE" = "$HOT_NS" ] || {
        HOT_FAIL=$((HOT_FAIL + 1))
        continue
      }
      echo "intent|$HOT_NS|$HOT_PID|$HOT_TARGET" >>"$HOT_LEDGER"
      if hot_bind_pid "$HOT_PID" "$HOT_NS" "$HOT_TARGET" "$HOT_SESSION" "$HOT_EXPECTED" && \
          [ "$(hot_namespace_id "$HOT_PID")" = "$HOT_NS" ]; then
        HOT_OK=$((HOT_OK + 1))
      else
        echo "failed|$HOT_NS|$HOT_PID|$HOT_TARGET" >>"$HOT_LEDGER"
        HOT_FAIL=$((HOT_FAIL + 1))
      fi
    done <"$HOT_NS_FILE"
    rm -f "$HOT_NS_FILE"
  done
  HOT_CRITICAL_FAIL=0
  for HOT_PID in 1 $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$HOT_PID/ns" ] || continue
    hot_top_owned_by_session "$HOT_PID" "$HOT_PRIMARY" "$HOT_SESSION" || HOT_CRITICAL_FAIL=1
  done
  if [ "$HOT_CRITICAL_FAIL" -ne 0 ]; then
    hot_unmount_internal >/dev/null 2>&1
    return 1
  fi
  hot_state_set namespace_count "$HOT_OK" || log_warn "hot: failed to persist namespace count"
  hot_state_set namespace_failed "$HOT_FAIL" || log_warn "hot: failed to persist namespace failures"
  log_info "hot: mounted session=$HOT_SESSION mode=$(hot_read_state mode) added=$(hot_read_state added_count) namespaces=$HOT_OK failed=$HOT_FAIL"
}

hot_start() {
  HOT_MODE="$1"
  HOT_SD_PATH="$2"
  case "$HOT_MODE" in user|sd|all) ;; *) echo "error=invalid_mode"; return 1 ;; esac
  if [ "$HOT_MODE" = "sd" ] || [ "$HOT_MODE" = "all" ]; then
    hot_validate_sd_path "$HOT_SD_PATH"
    HOT_PATH_RC=$?
    [ "$HOT_PATH_RC" -eq 0 ] || {
      [ "$HOT_PATH_RC" -eq 2 ] && echo "error=sd_path_missing" || echo "error=invalid_sd_path"
      return 1
    }
  fi
  command -v nsenter >/dev/null 2>&1 || { echo "error=nsenter_unavailable"; return 1; }
  acquire_write_lock || { echo "error=busy"; return 1; }
  HOT_HAS_LOCK=1
  if ! hot_unmount_internal; then
    hot_unlock
    echo "error=previous_session_busy"
    return 1
  fi
  hot_build_generation "$HOT_MODE" "$HOT_SD_PATH"
  HOT_BUILD_RC=$?
  if [ "$HOT_BUILD_RC" -ne 0 ]; then
    hot_unlock
    case "$HOT_BUILD_RC" in
      2) echo "error=openssl_unavailable" ;;
      3) echo "error=no_valid_certificates" ;;
      *) echo "error=hot_build_failed" ;;
    esac
    return 1
  fi
  if ! hot_mount_namespaces; then
    hot_unlock
    echo "error=hot_mount_failed"
    return 1
  fi
  HOT_TARGET=$(hot_read_state target)
  [ -n "$HOT_TARGET" ] && hide_assist_for_target "$HOT_TARGET"
  hot_unlock
  refresh_module_description >/dev/null
  echo "ok=1"
  echo "hot_active=1"
  echo "hot_added=$(hot_read_state added_count)"
  echo "hot_skipped=$(hot_read_state skipped_count)"
  echo "hot_namespaces=$(hot_read_state namespace_count)"
  echo "hot_failed=$(hot_read_state namespace_failed)"
}

hot_stop() {
  acquire_write_lock || { echo "error=busy"; return 1; }
  HOT_HAS_LOCK=1
  hot_stop_locked
  HOT_STOP_RC=$?
  hot_unlock
  return "$HOT_STOP_RC"
}

hot_stop_locked() {
  if hot_unmount_internal; then
    refresh_module_description >/dev/null
    echo "ok=1"
    echo "hot_active=0"
  else
    HOT_REMAINING=$(hot_count_mounted_namespaces "$(hot_read_state session_id)" "$(hot_read_state target)")
    echo "error=hot_unmount_incomplete"
    echo "hot_remaining=$HOT_REMAINING"
    return 1
  fi
}

hot_status() {
  HOT_MODE="${1:-light}"
  HOT_SESSION=$(hot_read_state session_id)
  HOT_TARGET=$(hot_read_state target)
  HOT_STATE_BOOT=$(hot_read_state boot_id)
  HOT_STATE_EPOCH=$(hot_read_state boot_epoch)
  if [ -z "$HOT_SESSION" ] || ! hot_session_boot_fresh "$HOT_STATE_BOOT" "$HOT_STATE_EPOCH"; then
    echo "hot_active=0"
    echo "hot_stale=$([ -n "$HOT_SESSION" ] && echo 1 || echo 0)"
    echo "hot_partial=0"
    echo "hot_added=0"
    echo "hot_namespaces=0"
    echo "hot_failed=0"
    return 0
  fi

  # 默认 light：只读会话文件，供 WebUI 快速展示
  if [ "$HOT_MODE" = "light" ]; then
    HOT_FAILED=$(hot_read_state namespace_failed)
    HOT_NS=$(hot_read_state namespace_count)
    HOT_PARTIAL=0
    [ "${HOT_FAILED:-0}" -gt 0 ] && HOT_PARTIAL=1
    echo "hot_active=1"
    echo "hot_stale=0"
    echo "hot_partial=$HOT_PARTIAL"
    echo "hot_mode=$(hot_read_state mode)"
    echo "hot_added=$(hot_read_state added_count)"
    echo "hot_skipped=$(hot_read_state skipped_count)"
    echo "hot_namespaces=${HOT_NS:-0}"
    echo "hot_failed=${HOT_FAILED:-0}"
    echo "hot_sd_path=$(hot_read_state sd_path)"
    return 0
  fi

  if hot_top_owned_by_session 1 "$HOT_TARGET" "$HOT_SESSION"; then
    HOT_ACTIVE=1
  else
    HOT_ACTIVE=0
  fi
  HOT_RUNTIME=$(hot_runtime_counts "$HOT_SESSION" "$HOT_TARGET")
  HOT_MOUNTED=$(echo "$HOT_RUNTIME" | cut -d'|' -f1)
  HOT_RUNTIME_FAILED=$(echo "$HOT_RUNTIME" | cut -d'|' -f2)
  HOT_CRITICAL_FAILED=0
  for HOT_PID in $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$HOT_PID/ns" ] || continue
    hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" || \
      HOT_CRITICAL_FAILED=$((HOT_CRITICAL_FAILED + 1))
  done
  HOT_STORED_FAILED="${HOT_RUNTIME_FAILED:-0}"
  HOT_PARTIAL=0
  if [ "$HOT_ACTIVE" -eq 1 ]; then
    if [ "$HOT_STORED_FAILED" -gt 0 ] || [ "$HOT_CRITICAL_FAILED" -gt 0 ]; then
      HOT_PARTIAL=1
    fi
  fi
  echo "hot_active=$HOT_ACTIVE"
  [ "$HOT_ACTIVE" -eq 1 ] && echo "hot_stale=0" || echo "hot_stale=1"
  echo "hot_partial=$HOT_PARTIAL"
  echo "hot_critical_failed=$HOT_CRITICAL_FAILED"
  echo "hot_mode=$(hot_read_state mode)"
  echo "hot_added=$(hot_read_state added_count)"
  echo "hot_skipped=$(hot_read_state skipped_count)"
  echo "hot_namespaces=$HOT_MOUNTED"
  echo "hot_failed=$HOT_STORED_FAILED"
  echo "hot_sd_path=$(hot_read_state sd_path)"
}
