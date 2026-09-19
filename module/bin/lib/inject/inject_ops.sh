#!/system/bin/sh
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
    # boot：注入 init + zygote（子进程继承）。
    # namespaces（service 晚注入）：默认不再 nsenter zygote/init，减轻「Found KSU」类误伤；
    # 仅当 /proc/<pid>/mountinfo 看不到本模块 runtime bind 时才补注 zygote（开机过早未就绪的兜底）。
    if [ "$mode" = "boot" ]; then
      bind_pid_once 1 init "$target" "$stage" || rc=1
      for process in zygote zygote64; do
        for pid in $(pidof "$process" 2>/dev/null) $(pgrep -x "$process" 2>/dev/null); do
          bind_pid_once "$pid" "$process" "$target" "$stage" || rc=1
        done
      done
    elif [ "$mode" = "namespaces" ]; then
      for process in zygote zygote64; do
        for pid in $(pidof "$process" 2>/dev/null) $(pgrep -x "$process" 2>/dev/null); do
          [ -n "$pid" ] || continue
          if is_certbridge_runtime_bind "$target" "/proc/$pid/mountinfo" 2>/dev/null; then
            log_debug "inject: skip zygote pid=$pid (already bound)"
            continue
          fi
          log_info "inject: heal zygote pid=$pid (missing runtime bind)"
          bind_pid_once "$pid" "$process" "$target" "$stage" || rc=1
        done
      done
    fi

    if [ "$mode" = "namespaces" ]; then
      # 默认只补 Settings，尊重 KSU「卸载模块」。
      # force_bind_capture=1 时额外强注 Reqable/ProxyPin（旧行为，可盖掉已卸挂载）。
      bind_package_soft "com.android.settings" "$target" "$stage"
      if is_force_bind_capture; then
        log_info "inject: force_bind_capture=1, rebinding capture apps"
        for pkg in $(capture_force_bind_packages); do
          bind_package_soft "$pkg" "$target" "$stage"
        done
      fi

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
  # bind 完成后拆掉 staging 挂载点，避免 mountinfo 长期暴露临时路径
  if [ -n "$stage" ]; then
    orphan_tmpfs_stage "$stage"
    log_debug "inject: orphaned stage $stage"
  fi
  # 仅对本目标成功 bind 后登记，避免失败路径误标 hide_applied
  [ "$rc" = "0" ] && hide_assist_for_target "$target"
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

  # Android 7–13 + magic：无 APEX、system 走 Magic Mount → 无需脚本 bind
  # 仍登记 try_umount：管理器叠层落在 cacerts 路径上，与脚本 bind 同源
  if [ "$(get_api)" -lt 34 ] && is_magic_mount_mode; then
    log_debug "inject: magic mode on API $(get_api), skip bind (Magic Mount)"
    hide_assist_after_inject
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
      hide_assist_after_inject
      return 0
    fi
    log_error "inject: no CA target directory found"
    record_inject_fail no_target
    return 1
  }
  return "$rc"
}

inject_app_namespaces() {
  generation_valid || {
    record_inject_fail generation_invalid
    return 1
  }
  [ -s "$APPLIED_MAP" ] || return 0

  # Android 7–13 + magic：无脚本 bind 目标（boot 路径已登记 try_umount）
  if [ "$(get_api)" -lt 34 ] && is_magic_mount_mode; then
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
    is_magic_mount_mode && {
      hide_assist_after_inject
      return 0
    }
    record_inject_fail no_target
    return 1
  }
  if [ "$rc" != "0" ]; then
    # 若尚未记下更具体原因，记为命名空间部分失败
    [ -f "$INJECT_FAIL_FILE" ] || record_inject_fail namespace_partial
  fi
  return "$rc"
}
