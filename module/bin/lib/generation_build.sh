# 由 common 经 generation.sh 加载
# 开机证书集合构建与有效性
source_identity() {
  src="$1"
  echo "fingerprint=$(getprop ro.build.fingerprint)"
  echo "security_patch=$(getprop ro.build.version.security_patch)"
  echo "api=$(get_api)"
  echo "source=$src"
  echo "source_count=$(count_certs "$src")"
  checksum=$(
    for cert in "$src"/*.*; do
      [ -f "$cert" ] || continue
      name=$(basename "$cert")
      is_cert_filename "$name" || continue
      cksum "$cert" 2>/dev/null
    done | sort | cksum | awk '{print $1 ":" $2}'
  )
  echo "source_checksum=${checksum:-unknown}"
}

# 是否仍有命名空间直接挂着 generation 目录本身（不可安全替换）
# 注意：运行时 tmpfs 拷贝层（RUNTIME_MOUNT_ROOT）不算 —— 软重启后仍可能残留，
# 但不应阻止重建 GEN_CURRENT；后续 inject 会刷新 tmpfs 内容。
generation_source_busy() {
  generation_id=$(path_identity "$GEN_CERTS")
  [ -n "$generation_id" ] || return 1
  generation_seen="|"
  for generation_proc in /proc/[0-9]*; do
    [ -d "$generation_proc/ns" ] || continue
    generation_pid=${generation_proc##*/}
    generation_ns=$(readlink "$generation_proc/ns/mnt" 2>/dev/null)
    [ -n "$generation_ns" ] || continue
    case "$generation_seen" in *"|$generation_ns|"*) continue ;; esac
    generation_seen="$generation_seen$generation_ns|"
    for generation_target in $(list_target_stores); do
      [ "$(namespace_path_identity "$generation_pid" "$generation_target")" = "$generation_id" ] && return 0
      generation_mount_state=$(nsenter --mount=/proc/"$generation_pid"/ns/mnt -- \
        awk -v target="$generation_target" \
          -v source="$GEN_CERTS" \
          -v adb_source="/adb/modules/CertBridge/certs/generation/current/cacerts" \
          -v module_source="/CertBridge/certs/generation/current/cacerts" '
          $5 == target && (
            index($0, source) > 0 ||
            index($0, adb_source) > 0 ||
            index($0, module_source) > 0
          ) { found=1 }
          END { print found ? "mounted" : "clear" }
        ' /proc/self/mountinfo 2>/dev/null)
      [ "$generation_mount_state" = "mounted" ] && return 0
    done
  done
  return 1
}

# 兼容旧调用名
generation_is_mounted() {
  generation_source_busy
}

build_boot_generation() {
  target=$(get_target_store)
  boot_id=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  pending=0
  [ -f "$PENDING_FILE" ] && pending=1
  previous_boot_id=$(cat "$GEN_CURRENT/boot-id" 2>/dev/null | tr -d '\r\n')
  [ -n "$previous_boot_id" ] || previous_boot_id=$(cat "$GEN_ACTIVE_BOOT" 2>/dev/null | tr -d '\r\n')
  [ -n "$previous_boot_id" ] || \
    previous_boot_id=$(grep '^boot_id=' "$SOURCE_META" 2>/dev/null | cut -d= -f2-)
  # 当前 conf 与已生效 conf 不一致时必须重建（防止 pending 标记丢失后仍用旧 addon）
  conf_changed=0
  if [ -f "$CONF" ] && [ -f "$APPLIED_CONF" ]; then
    cmp -s "$CONF" "$APPLIED_CONF" 2>/dev/null || conf_changed=1
  elif [ -f "$CONF" ] && [ ! -f "$APPLIED_CONF" ] && [ -s "$APPLIED_MAP" ]; then
    conf_changed=1
  fi
  [ "$conf_changed" = "1" ] && \
    log_info "generation: conf differs from applied, force rebuild"

  # KernelSU 软重启不换 boot_id，但会重跑 post-fs-data；有待生效配置时必须重建
  if [ "$pending" != "1" ] && [ "$conf_changed" != "1" ] && \
      [ -n "$boot_id" ] && [ "$boot_id" = "$previous_boot_id" ] && \
      generation_valid && verify_direct_store "$target"; then
    log_debug "generation: already active for this boot, skip rebuild"
    return 0
  fi
  if [ -d "$GEN_CURRENT" ]; then
    if generation_source_busy; then
      log_error "generation: current source is still mounted, refuse replacement"
      return 1
    fi
    if [ -z "$previous_boot_id" ]; then
      install_boot_id=$(cat "$INSTALL_BOOT_FILE" 2>/dev/null | tr -d '\r\n')
      if [ -z "$install_boot_id" ] || [ "$install_boot_id" = "$boot_id" ]; then
        # 软重启后可安全重建；仅在源仍被占用时才保留到冷重启
        log_debug "generation: source lifecycle unknown, rebuild (soft-reboot safe)"
      fi
    elif [ "$previous_boot_id" = "$boot_id" ]; then
      # 同 boot_id：冷启动不应走到这里；软重启 / 待生效配置允许重建
      log_info "generation: same-boot rebuild (pending=$pending, soft-reboot friendly)"
    fi
  fi
  source_n=$(count_certs "$target")
  [ "$source_n" -ge "$MIN_SAFE_CERTS" ] || {
    log_error "generation: live source too small ($source_n), refuse build"
    return 1
  }
  # 双保险：若目标仍是本模块 runtime bind，禁止当作系统基线
  if is_certbridge_runtime_bind "$target"; then
    log_error "generation: live target still runtime-bound, refuse contaminated source"
    return 1
  fi

  stage="$GEN_ROOT/.new.$$"
  certs="$stage/cacerts"
  map_tmp="$stage/applied-certs.list"
  meta_tmp="$stage/source.meta"
  rm -rf "$stage" 2>/dev/null
  mkdir -p "$certs" "$STATEDIR" || return 1

  copy_cert_store "$target" "$certs" || {
    log_error "generation: failed to copy live source"
    rm -rf "$stage"
    return 1
  }
  install_addon_certs_into "$certs" "$map_tmp" || {
    log_error "generation: failed to add module certificates"
    rm -rf "$stage"
    return 1
  }

  total=$(count_certs "$certs")
  [ "$total" -ge "$source_n" ] || {
    log_error "generation: total $total < source $source_n"
    rm -rf "$stage"
    return 1
  }
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    [ -f "$certs/$name" ] || {
      log_error "generation: missing applied cert $label/$name"
      rm -rf "$stage"
      return 1
    }
  done <"$map_tmp"

  source_identity "$target" >"$meta_tmp"
  echo "boot_id=$boot_id" >>"$meta_tmp"
  echo "$boot_id" >"$stage/boot-id"
  chown -R 0:0 "$stage" 2>/dev/null
  chmod 0755 "$stage" "$certs" 2>/dev/null
  chmod 0644 "$certs"/*.* 2>/dev/null
  chmod 0600 "$map_tmp" "$meta_tmp" "$stage/boot-id" 2>/dev/null
  set_selinux_context "$target" "$certs" || {
    log_error "generation: SELinux context verification failed"
    rm -rf "$stage"
    return 1
  }
  echo "complete=1" >"$stage/complete"
  chmod 0600 "$stage/complete"

  rm -rf "$GEN_CURRENT" 2>/dev/null
  mv "$stage" "$GEN_CURRENT" || {
    log_error "generation: atomic publish failed"
    rm -rf "$stage"
    return 1
  }
  cp -f "$GEN_CURRENT/applied-certs.list" "$APPLIED_MAP"
  cp -f "$GEN_CURRENT/source.meta" "$SOURCE_META"
  GEN_BOOT_TMP="$GEN_ACTIVE_BOOT.tmp.$$"
  cp -f "$GEN_CURRENT/boot-id" "$GEN_BOOT_TMP" && mv -f "$GEN_BOOT_TMP" "$GEN_ACTIVE_BOOT"
  cp -f "$CONF" "$APPLIED_CONF" 2>/dev/null || : >"$APPLIED_CONF"
  chmod 0600 "$APPLIED_MAP" "$SOURCE_META" "$APPLIED_CONF" 2>/dev/null
  rm -f "$PENDING_FILE"
  log_info "generation: source=$source_n total=$total addons=$(count_addon_certs)"
  log_debug "generation: published at $GEN_CURRENT boot_id=$boot_id"
  return 0
}

generation_valid() {
  [ -f "$GEN_CURRENT/complete" ] || return 1
  source_n=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)
  [ "${source_n:-0}" -ge "$MIN_SAFE_CERTS" ] || return 1
  [ "$(count_certs "$GEN_CERTS")" -ge "$source_n" ] || return 1
  [ -f "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    [ -f "$GEN_CERTS/$name" ] || return 1
    actual=$(cksum "$GEN_CERTS/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}
