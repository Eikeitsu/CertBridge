# 由 apex_inject.sh 加载
# boot / namespaces 注入编排
inject_one_target() {
  target="$1"
  mode="$2"
  [ -d "$target" ] || {
    log_warn "inject: skip missing target $target"
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
      log_info "inject: target=$target namespaces ok=$injected fail=$failed"
    fi
  else
    log_error "inject: nsenter unavailable"
    record_inject_fail nsenter_unavailable
    rc=1
  fi
  return "$rc"
}

inject_boot_namespaces() {
  generation_valid || {
    log_error "inject: generation invalid"
    record_inject_fail generation_invalid
    return 1
  }
  [ -s "$APPLIED_MAP" ] || {
    log_info "inject: no enabled addon, keep original store"
    return 0
  }

  if is_magic_mount_mode && [ "$(get_api)" -lt 34 ]; then
    log_debug "inject: magic mode on API $(get_api), skip bind (Magic Mount)"
    return 0
  fi

  rc=0
  has_target=0
  for target in $(list_target_stores); do
    has_target=1
    inject_one_target "$target" boot || rc=1
  done
  [ "$has_target" = "1" ] || {
    if is_magic_mount_mode; then
      log_warn "inject: magic mode with no bind targets"
      return 0
    fi
    log_error "inject: no CA target directory found"
    record_inject_fail no_target
    return 1
  }
  hide_assist_after_inject
  return "$rc"
}

inject_app_namespaces() {
  generation_valid || {
    record_inject_fail generation_invalid
    return 1
  }
  [ -s "$APPLIED_MAP" ] || return 0

  if is_magic_mount_mode && [ "$(get_api)" -lt 34 ]; then
    log_debug "inject: magic mode on API $(get_api), skip namespace bind"
    return 0
  fi

  command -v nsenter >/dev/null 2>&1 || {
    record_inject_fail nsenter_unavailable
    return 1
  }

  rc=0
  has_target=0
  for target in $(list_target_stores); do
    has_target=1
    inject_one_target "$target" namespaces || rc=1
  done
  [ "$has_target" = "1" ] || {
    is_magic_mount_mode && return 0
    record_inject_fail no_target
    return 1
  }
  if [ "$rc" != "0" ]; then
    # 若尚未记下更具体原因，记为命名空间部分失败
    [ -f "$INJECT_FAIL_FILE" ] || record_inject_fail namespace_partial
  fi
  return "$rc"
}
