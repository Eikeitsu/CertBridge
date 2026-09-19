#!/system/bin/sh
# 由 apex_inject.sh 加载
# bind 单次与命名空间收集
bind_current_once() {
  target="$1"
  stage="$2"
  source_id=$(path_identity "$stage")
  [ -n "$source_id" ] || return 1

  if verify_direct_store "$target"; then
    if [ "$(path_identity "$target")" = "$source_id" ]; then
      log_debug "inject: current ns already valid ($target)"
      return 0
    fi
    log_debug "inject: current ns has compatible content; rebinding to owned tmpfs ($target)"
  fi

  mount --bind "$stage" "$target" 2>/dev/null || {
    log_error "inject: current ns bind failed ($target)"
    record_inject_fail bind_failed "init"
    return 1
  }
  if [ "$(path_identity "$target")" != "$source_id" ]; then
    log_warn "inject: current ns ownership mismatch after bind ($target) (keep mount)"
  fi
  if ! verify_direct_store "$target"; then
    log_warn "inject: current ns content verify soft-fail ($target) (keep mount)"
  fi
  log_info "inject: current ns injected ($target)"
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
      log_debug "inject: $label pid=$pid already valid"
      return 0
    fi
    log_debug "inject: $label pid=$pid rebinding to owned tmpfs"
  fi

  src=$(stage_visible_for_pid "$pid" "$stage") || {
    log_error "inject: $label pid=$pid cannot see stage $stage"
    record_inject_fail bind_failed "$label 看不到临时层"
    return 1
  }
  nsenter --mount=/proc/"$pid"/ns/mnt -- mount --bind "$src" "$target" 2>/dev/null || {
    log_error "inject: $label pid=$pid bind failed"
    record_inject_fail bind_failed "$label"
    return 1
  }
  if [ "$(namespace_path_identity "$pid" "$target")" != "$source_id" ]; then
    log_warn "inject: $label pid=$pid ownership mismatch after bind (keep mount)"
  fi
  if ! verify_namespace_store "$pid" "$target"; then
    log_warn "inject: $label pid=$pid content verify soft-fail (keep mount)"
  fi
  log_info "inject: $label pid=$pid injected"
  return 0
}

bind_package_soft() {
  pkg="$1"
  target="$2"
  stage="$3"
  for pid in $(pidof "$pkg" 2>/dev/null); do
    bind_pid_once "$pid" "$pkg" "$target" "$stage" || \
      log_warn "inject: optional package $pkg pid=$pid skipped/failed"
  done
}

# 抓包 App 包名（强注开关 force_bind_capture=1 时使用）
capture_force_bind_packages() {
  echo "com.reqable.android"
  echo "com.reqable.android.pro"
  echo "com.wangyu.proxypin"
  echo "com.network.proxy"
}

is_force_bind_capture() {
  [ "$(read_conf force_bind_capture 0)" = "1" ]
}

# 只收集应用侧命名空间，不再遍历全部 /proc（会在部分机型上卡住，导致状态永久「注入中」）
# 不含 init/zygote：由 boot 注入；service 晚注入不再二次收集 zygote
# force_bind_capture=1 时并入抓包 App（旧行为）
collect_inject_namespaces() {
  ns_file="$1"
  target="$2"
  : >"$ns_file"
  seen="|"
  extra_pids=
  if is_force_bind_capture; then
    for pkg in $(capture_force_bind_packages); do
      extra_pids="$extra_pids $(pidof "$pkg" 2>/dev/null)"
    done
  fi
  for pid in \
      $(pidof com.android.settings 2>/dev/null) \
      $extra_pids; do
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
