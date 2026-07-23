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

generation_is_mounted() {
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
      # 仅在明确仍挂着 generation 源时拒绝替换；探测失败视为未挂载，避免误拒重建
    done
  done
  return 1
}

build_boot_generation() {
  target=$(get_target_store)
  boot_id=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  previous_boot_id=$(cat "$GEN_CURRENT/boot-id" 2>/dev/null | tr -d '\r\n')
  [ -n "$previous_boot_id" ] || previous_boot_id=$(cat "$GEN_ACTIVE_BOOT" 2>/dev/null | tr -d '\r\n')
  [ -n "$previous_boot_id" ] || \
    previous_boot_id=$(grep '^boot_id=' "$SOURCE_META" 2>/dev/null | cut -d= -f2-)
  if [ -n "$boot_id" ] && [ "$boot_id" = "$previous_boot_id" ] && \
      generation_valid && verify_direct_store "$target"; then
    log_msg "generation: already active for this boot, skip rebuild"
    return 0
  fi
  if [ -d "$GEN_CURRENT" ]; then
    if generation_is_mounted; then
      log_msg "generation: current source is still mounted, refuse replacement"
      return 1
    fi
    if [ -z "$previous_boot_id" ]; then
      install_boot_id=$(cat "$INSTALL_BOOT_FILE" 2>/dev/null | tr -d '\r\n')
      if [ -z "$install_boot_id" ] || [ "$install_boot_id" = "$boot_id" ]; then
        log_msg "generation: source lifecycle unknown, preserve until reboot"
        return 1
      fi
    elif [ "$previous_boot_id" = "$boot_id" ]; then
      log_msg "generation: invalid same-boot source preserved"
      return 1
    fi
  fi
  source_n=$(count_certs "$target")
  [ "$source_n" -ge "$MIN_SAFE_CERTS" ] || {
    log_msg "generation: live source too small ($source_n), refuse build"
    return 1
  }

  stage="$GEN_ROOT/.new.$$"
  certs="$stage/cacerts"
  map_tmp="$stage/applied-certs.list"
  meta_tmp="$stage/source.meta"
  rm -rf "$stage" 2>/dev/null
  mkdir -p "$certs" "$STATEDIR" || return 1

  copy_cert_store "$target" "$certs" || {
    log_msg "generation: failed to copy live source"
    rm -rf "$stage"
    return 1
  }
  install_addon_certs_into "$certs" "$map_tmp" || {
    log_msg "generation: failed to add module certificates"
    rm -rf "$stage"
    return 1
  }

  total=$(count_certs "$certs")
  [ "$total" -ge "$source_n" ] || {
    log_msg "generation: total $total < source $source_n"
    rm -rf "$stage"
    return 1
  }
  while IFS='|' read -r label name checksum; do
    [ -n "$name" ] || continue
    [ -f "$certs/$name" ] || {
      log_msg "generation: missing applied cert $label/$name"
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
    log_msg "generation: SELinux context verification failed"
    rm -rf "$stage"
    return 1
  }
  echo "complete=1" >"$stage/complete"
  chmod 0600 "$stage/complete"

  rm -rf "$GEN_CURRENT" 2>/dev/null
  mv "$stage" "$GEN_CURRENT" || {
    log_msg "generation: atomic publish failed"
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
  log_msg "generation: source=$source_n total=$total addons=$(count_addon_certs)"
  return 0
}

generation_valid() {
  [ -f "$GEN_CURRENT/complete" ] || return 1
  source_n=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)
  [ "${source_n:-0}" -ge "$MIN_SAFE_CERTS" ] || return 1
  [ "$(count_certs "$GEN_CERTS")" -ge "$source_n" ] || return 1
  [ -f "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum; do
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

get_applied_name() {
  grep -m1 "^$1|" "$APPLIED_MAP" 2>/dev/null | cut -d'|' -f2
}

is_addon_applied() {
  [ -n "$(get_applied_name "$1")" ]
}
