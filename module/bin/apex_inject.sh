#!/system/bin/sh
# Android 14+ APEX CA injection + legacy system path merge
# 始终「系统原有 CA + 模块追加」，禁止用少量证书覆盖整库

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

prepare_merged_tmpfs() {
  target_path="$1"
  tmpfs_path="$2"
  base_src="$3"

  umount "$tmpfs_path" 2>/dev/null
  rm -rf "$tmpfs_path" 2>/dev/null
  mkdir -p "$tmpfs_path"

  if ! mount -t tmpfs tmpfs "$tmpfs_path"; then
    log_msg "apex_inject: tmpfs mount failed ($tmpfs_path)"
    return 1
  fi

  # 优先用完整基线；APEX/system 若已被错误覆盖则回退 system_base
  src_n=$(count_certs "$base_src")
  base_n=$(count_certs "$SYSTEM_BASE_DIR")
  if [ "$src_n" -ge "$MIN_SAFE_CERTS" ]; then
    cp -a "$base_src"/* "$tmpfs_path/" 2>/dev/null
    log_msg "apex_inject: seed from live path ($src_n)"
  elif [ "$base_n" -ge "$MIN_SAFE_CERTS" ]; then
    cp -f "$SYSTEM_BASE_DIR"/*.0 "$tmpfs_path/" 2>/dev/null
    log_msg "apex_inject: seed from system_base ($base_n)"
  else
    log_msg "apex_inject: no safe CA baseline, refuse mount"
    umount "$tmpfs_path" 2>/dev/null
    return 1
  fi

  install_addon_certs_into "$tmpfs_path"

  chown -R 0:0 "$tmpfs_path"
  chmod 755 "$tmpfs_path"
  chmod 644 "$tmpfs_path"/*.0 2>/dev/null
  set_selinux_context "$target_path" "$tmpfs_path"

  merged=$(count_certs "$tmpfs_path")
  if [ "$merged" -lt "$MIN_SAFE_CERTS" ]; then
    log_msg "apex_inject: merged count $merged < $MIN_SAFE_CERTS, refuse bind"
    umount "$tmpfs_path" 2>/dev/null
    return 1
  fi

  log_msg "apex_inject: target=$target_path merged=$merged"
  return 0
}

bind_merged() {
  src="$1"
  dest="$2"

  mount --bind "$src" "$dest" 2>/dev/null
  nsenter --mount=/proc/1/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null

  for zygote in zygote zygote64; do
    pid=$(pidof "$zygote" 2>/dev/null)
    [ -n "$pid" ] && nsenter --mount=/proc/$pid/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null
  done

  settings_pid=$(pidof com.android.settings 2>/dev/null)
  [ -n "$settings_pid" ] && nsenter --mount=/proc/$settings_pid/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null
}

inject_apex() {
  api=$(get_api)
  [ "$api" -ge 34 ] || return 0

  if [ ! -d "$APEX_CACERTS" ]; then
    log_msg "apex_inject: APEX path missing"
    return 1
  fi

  sync_active_certs

  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    log_msg "apex_inject: no addon certs, skip APEX bind"
    return 0
  fi

  prepare_merged_tmpfs "$APEX_CACERTS" "$TEMP_APEX" "$APEX_CACERTS" || return 1
  bind_merged "$TEMP_APEX" "$APEX_CACERTS"
  log_msg "apex_inject: APEX bind done"
  return 0
}

# Android 14 以下（及部分 OEM 仍读 system 路径）：运行时合并挂载，避免 Magic Mount 只露出模块证书
inject_system_merge() {
  sync_active_certs

  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    log_msg "inject_system_merge: no addon certs"
    return 0
  fi

  if [ ! -d "$SYSTEM_CACERTS" ]; then
    log_msg "inject_system_merge: system cacerts missing"
    return 1
  fi

  # 基线优先 mirror，再 system_base / 当前路径
  seed="$SYSTEM_CACERTS"
  mirror=$(find_system_cacerts_mirror)
  if [ -n "$mirror" ] && [ "$(count_certs "$mirror")" -ge "$MIN_SAFE_CERTS" ]; then
    seed="$mirror"
  elif [ "$(count_certs "$SYSTEM_BASE_DIR")" -ge "$MIN_SAFE_CERTS" ]; then
    seed="$SYSTEM_BASE_DIR"
  fi

  prepare_merged_tmpfs "$SYSTEM_CACERTS" "$TEMP_SYSTEM" "$seed" || return 1
  bind_merged "$TEMP_SYSTEM" "$SYSTEM_CACERTS"
  log_msg "inject_system_merge: system bind done"
  return 0
}

case "${1:-inject}" in
  inject)
    inject_apex
    inject_system_merge
    ;;
  *)
    inject_apex
    inject_system_merge
    ;;
esac
