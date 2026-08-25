#!/system/bin/sh
# 开机证书集合生成与校验

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

mark_reboot_required() {
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "配置已变更，重启后生效" >"$PENDING_FILE"
  chmod 0600 "$PENDING_FILE" 2>/dev/null
}

clear_reboot_required() {
  rm -f "$PENDING_FILE" 2>/dev/null
}

# 读 applied.conf 中某键（缺省回退）
read_applied_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$APPLIED_CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$APPLIED_CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

# 自定义证书指纹：文件名 + cksum，排序后拼接
custom_certs_fingerprint() {
  [ -d "$CUSTOM_DIR" ] || { echo ""; return 0; }
  (
    for f in "$CUSTOM_DIR"/*.*; do
      [ -f "$f" ] || continue
      base=$(basename "$f")
      case "$base" in *.meta) continue ;; esac
      is_cert_filename "$base" 2>/dev/null || continue
      sum=$(cksum "$f" 2>/dev/null | awk '{print $1 ":" $2}')
      echo "${base}|${sum}"
    done
  ) | sort | tr '\n' ';'
}

# 生效快照中的自定义证书指纹（applied-certs.list 的 custom:* 行）
applied_custom_fingerprint() {
  [ -s "$APPLIED_MAP" ] || { echo ""; return 0; }
  (
    while IFS='|' read -r label name checksum display; do
      case "$label" in
        custom:*)
          [ -n "$name" ] || continue
          echo "${name}|${checksum}"
          ;;
      esac
    done <"$APPLIED_MAP"
  ) | sort | tr '\n' ';'
}

# 当前配置是否与开机已生效快照一致？一致则不应再「待重启」
config_matches_applied() {
  [ -f "$APPLIED_CONF" ] || return 1
  generation_valid 2>/dev/null || return 1

  cur_req=$(read_conf reqable 1)
  cur_pp=$(read_conf proxypin 1)
  cur_mm=$(get_mount_mode)
  cur_tf=$(get_tmpfs_style)
  app_req=$(read_applied_conf reqable 1)
  app_pp=$(read_applied_conf proxypin 1)
  app_mm=$(read_applied_conf mount_mode compatible | tr 'A-Z' 'a-z')
  case "$app_mm" in magic|builtin|lightweight) app_mm=magic ;; *) app_mm=compatible ;; esac
  app_tf=$(read_applied_conf tmpfs_style dev | tr 'A-Z' 'a-z')
  case "$app_tf" in
    legacy|classic|verbose|long) app_tf=legacy ;;
    short|tmp) app_tf=short ;;
    *) app_tf=dev ;;
  esac

  [ "$cur_req" = "$app_req" ] || return 1
  [ "$cur_pp" = "$app_pp" ] || return 1
  [ "$cur_mm" = "$app_mm" ] || return 1
  [ "$cur_tf" = "$app_tf" ] || return 1

  cur_custom=$(custom_certs_fingerprint)
  app_custom=$(applied_custom_fingerprint)
  [ "$cur_custom" = "$app_custom" ] || return 1
  return 0
}

# 写配置后调用：与生效快照一致则清除 pending，否则标记待重启
# stdout: reboot_required=0|1
update_reboot_required_flag() {
  if config_matches_applied; then
    clear_reboot_required
    echo "reboot_required=0"
    return 0
  fi
  mark_reboot_required
  echo "reboot_required=1"
}

get_applied_name() {
  grep -m1 "^$1|" "$APPLIED_MAP" 2>/dev/null | cut -d'|' -f2 | tr -d '\r'
}

get_applied_display() {
  label="$1"
  fallback="$2"
  name=$(grep -m1 "^${label}|" "$APPLIED_MAP" 2>/dev/null | cut -d'|' -f4 | tr -d '\r')
  if [ -n "$name" ]; then
    echo "$name"
    return 0
  fi
  echo "${fallback:-$label}"
}

is_addon_applied() {
  [ -n "$(get_applied_name "$1")" ]
}
