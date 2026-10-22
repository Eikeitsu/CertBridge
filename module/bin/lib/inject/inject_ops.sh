#!/system/bin/sh
# 由 apex_inject.sh 加载
# boot / namespaces 注入编排

# 指定进程的 mountinfo 里，这条 apex cacerts 是否仍是 tmpfs/overlay
apex_pid_has_cert_overlay() {
  _pid="$1"
  _target="$2"
  [ -n "$_pid" ] && [ -n "$_target" ] && [ -f "/proc/$_pid/mountinfo" ] || return 1
  awk -v t="$_target" '
    $5 == t {
      for (i = 1; i <= NF; i++) if ($i == "-") {
        if ($(i + 1) == "tmpfs" || $(i + 1) == "overlay") found = 1
        break
      }
    }
    END { exit found ? 0 : 1 }
  ' "/proc/$_pid/mountinfo" 2>/dev/null
}

# 在该进程命名空间内确保 apex 证书挂载存在，并改成 private（不再跟 init 同一传播组）
apex_make_private_pid() {
  _pid="$1"
  _target="$2"
  [ -d "/proc/$_pid/ns" ] || return 1
  if ! apex_pid_has_cert_overlay "$_pid" "$_target"; then
    nsenter --mount=/proc/"$_pid"/ns/mnt -- \
      mount --bind "/proc/1/root$_target" "$_target" 2>/dev/null || return 1
  fi
  nsenter --mount=/proc/"$_pid"/ns/mnt -- \
    mount --make-private "$_target" 2>/dev/null || return 1
  apex_pid_has_cert_overlay "$_pid" "$_target"
}

# make-private 之后不应再带 shared/master。仍在传播组里就不要卸 init，否则会把 zygote 上的证书一起拆掉。
apex_mount_is_private() {
  _pid="$1"
  _target="$2"
  [ -f "/proc/$_pid/mountinfo" ] || return 1
  awk -v t="$_target" '
    $5 == t {
      priv = 1
      for (i = 6; i <= NF; i++) {
        if ($i == "-") break
        if ($i ~ /^(shared|master|propagate_from):/) priv = 0
      }
      if (priv) found = 1
    }
    END { exit found ? 0 : 1 }
  ' "/proc/$_pid/mountinfo" 2>/dev/null
}

# 开机时 apex 证书 bind 先落在 init，好让后启动的 zygote 继承。
# 这份传播挂载上游 path_umount 拆不掉（MNT_DETACH 得到 -39，flags 0 又因忙失败），
# 应用 mountinfo 里会一直看到 /apex/.../cacerts。
# zygote 起来后：把它改成 private，再从 init 卸掉。pid 1 的表里不再有这条；
# 新应用继承的是可卸载挂载，随后用 MNT_DETACH 登记给 ksud。
isolate_apex_cert_mounts() {
  command -v nsenter >/dev/null 2>&1 || return 0
  [ -f /proc/1/mountinfo ] || return 0

  _targets=$(awk '
    $5 ~ /^\/apex\/com\.android\.conscrypt(@[^/]+)?\/cacerts$/ { print $5 }
  ' /proc/1/mountinfo 2>/dev/null | sort -u)
  [ -n "$_targets" ] || return 0

  for _target in $_targets; do
    is_tmpfs_cacert_overlay "$_target" /proc/1/mountinfo 2>/dev/null || continue
    _kept=0
    _seen_pids="|"
    for _proc in zygote zygote64 webview_zygote; do
      for _pid in $(pidof "$_proc" 2>/dev/null); do
        [ -n "$_pid" ] || continue
        case "$_seen_pids" in *"|$_pid|"*) continue ;; esac
        _seen_pids="${_seen_pids}${_pid}|"
        if apex_make_private_pid "$_pid" "$_target"; then
          _kept=1
        else
          log_warn "inject: apex make-private failed pid=$_pid ($_target)"
        fi
      done
    done
    if [ "$_kept" != "1" ]; then
      log_info "inject: apex isolate deferred ($_target, zygote not ready)"
      continue
    fi
    _private=0
    for _pid in $(printf '%s' "$_seen_pids" | tr '|' ' '); do
      [ -n "$_pid" ] || continue
      apex_mount_is_private "$_pid" "$_target" && _private=1 && break
    done
    if [ "$_private" != "1" ]; then
      log_warn "inject: apex mount still shared, keep init ($_target)"
      continue
    fi
    if ! nsenter --mount=/proc/1/ns/mnt -- mount --make-private "$_target" 2>/dev/null; then
      log_warn "inject: apex init make-private failed, keep init mount ($_target)"
      continue
    fi
    if ! nsenter --mount=/proc/1/ns/mnt -- umount "$_target" 2>/dev/null; then
      nsenter --mount=/proc/1/ns/mnt -- umount -l "$_target" 2>/dev/null || {
        log_warn "inject: apex init umount failed ($_target)"
        continue
      }
    fi
    _still=0
    for _pid in $(printf '%s' "$_seen_pids" | tr '|' ' '); do
      [ -n "$_pid" ] || continue
      apex_pid_has_cert_overlay "$_pid" "$_target" && _still=1 && break
    done
    if [ "$_still" != "1" ]; then
      log_error "inject: apex isolate removed zygote mount ($_target)"
      continue
    fi
    log_info "inject: apex cert mount private in zygote, dropped from init ($_target)"
    if type hide_reregister_apex_umount >/dev/null 2>&1; then
      hide_reregister_apex_umount "$_target" || true
    fi
  done
  return 0
}

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
      # 当前 mount ns 已是 init 时，bind_current 已覆盖 pid 1，避免再 nsenter
      _cur_ns=$(readlink /proc/self/ns/mnt 2>/dev/null)
      _init_ns=$(readlink /proc/1/ns/mnt 2>/dev/null)
      if [ -n "$_cur_ns" ] && [ "$_cur_ns" = "$_init_ns" ]; then
        log_debug "inject: current ns is init, skip separate pid 1 bind"
      else
        bind_pid_once 1 init "$target" "$stage" || rc=1
      fi
      # boot_bind_zygote=0：不进 zygote（仅 init），减轻 Found KSU；子进程一般继承，难机可保持默认 1
      if [ "$(read_conf boot_bind_zygote 0)" = "1" ]; then
        # 每个 zygote 名只取一组去重 PID，避免 pidof+pgrep 双扫重复 nsenter
        for process in zygote zygote64; do
          seen_pids="|"
          for pid in $(pidof "$process" 2>/dev/null) $(pgrep -x "$process" 2>/dev/null); do
            [ -n "$pid" ] || continue
            case "$seen_pids" in *"|$pid|"*) continue ;; esac
            seen_pids="${seen_pids}${pid}|"
            bind_pid_once "$pid" "$process" "$target" "$stage" || rc=1
          done
        done
      else
        log_info "inject: boot_bind_zygote=0, skip zygote (init only)"
      fi
    elif [ "$mode" = "namespaces" ]; then
      for process in zygote zygote64; do
        seen_pids="|"
        for pid in $(pidof "$process" 2>/dev/null) $(pgrep -x "$process" 2>/dev/null); do
          [ -n "$pid" ] || continue
          case "$seen_pids" in *"|$pid|"*) continue ;; esac
          seen_pids="${seen_pids}${pid}|"
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
  # 路径指纹：若 cacerts 目标的 mountinfo 仍含 modules/CertBridge，多半是 Magic Mount 叠层
  # （脚本 bind 应用 tmpfs stage，一般不会长期暴露模块树路径）
  if [ -f /proc/1/mountinfo ]; then
    if grep -E '/cacerts' /proc/1/mountinfo 2>/dev/null | grep -q 'modules/CertBridge'; then
      log_warn "inject: mountinfo still shows modules/CertBridge on a cacerts target (Magic Mount?). Prefer mount_mode=compatible + tmpfs_style=dev for shorter fingerprints; Zygisk filter can hide remaining lines for opted-in apps."
    fi
  fi
  # try_umount 统一由 inject_* 末尾 hide_assist_after_inject 登记，避免同一路径连登两次
  # （第二次常因「已存在」被误报 failed）
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

  # 允许 service 阶段重新探测 SuSFS/ksud（post-fs 过早失败不永久缓存）
  hide_probe_cache_clear 2>/dev/null || true

  rc=0
  has_target=0
  for target in $(list_boot_inject_targets); do
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
  # 再扫一遍登记，覆盖「单目标 rc 失败但挂载已在」的窗口
  hide_assist_after_inject
  isolate_apex_cert_mounts || true
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
    hide_assist_after_inject
    return 0
  fi

  command -v nsenter >/dev/null 2>&1 || {
    record_inject_fail nsenter_unavailable
    return 1
  }

  hide_probe_cache_clear 2>/dev/null || true

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
  # service 晚注入时 SusFS/ksud 通常已就绪：强制再登记一次
  hide_assist_after_inject
  isolate_apex_cert_mounts || true
  if [ "$rc" != "0" ]; then
    # 若尚未记下更具体原因，记为命名空间部分失败
    [ -f "$INJECT_FAIL_FILE" ] || record_inject_fail namespace_partial
  fi
  return "$rc"
}
