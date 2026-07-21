#!/system/bin/sh
# 系统 CA 基线增量注入
# 始终使用「完整系统基线 + 模块追加证书」，禁止从已挂载目录反复取种子

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

prepare_merged_tmpfs() {
  target_path="$1"
  tmpfs_path="$2"

  base_n=$(count_certs "$SYSTEM_BASE_DIR")
  if [ "$base_n" -lt "$MIN_SAFE_CERTS" ]; then
    log_msg "inject: system_base too small ($base_n), refuse mount"
    return 1
  fi

  umount "$tmpfs_path" 2>/dev/null
  rm -rf "$tmpfs_path" 2>/dev/null
  mkdir -p "$tmpfs_path" || return 1

  if ! mount -t tmpfs tmpfs "$tmpfs_path"; then
    log_msg "inject: tmpfs mount failed ($tmpfs_path)"
    return 1
  fi

  cp -f "$SYSTEM_BASE_DIR"/*.0 "$tmpfs_path/" 2>/dev/null
  install_addon_certs_into "$tmpfs_path"

  chown -R 0:0 "$tmpfs_path"
  chmod 755 "$tmpfs_path"
  chmod 644 "$tmpfs_path"/*.0 2>/dev/null
  set_selinux_context "$target_path" "$tmpfs_path"

  merged=$(count_certs "$tmpfs_path")
  if [ "$merged" -lt "$MIN_SAFE_CERTS" ]; then
    log_msg "inject: merged $merged < $MIN_SAFE_CERTS, refuse bind"
    umount "$tmpfs_path" 2>/dev/null
    return 1
  fi

  log_msg "inject: prepared target=$target_path base=$base_n merged=$merged"
  return 0
}

bind_merged() {
  src="$1"
  dest="$2"

  mount --bind "$src" "$dest" 2>/dev/null
  log_msg "inject: current bind $dest status=$?"

  nsenter --mount=/proc/1/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null
  log_msg "inject: PID 1 bind $dest status=$?"

  for zygote in zygote zygote64; do
    for pid in $(pidof "$zygote" 2>/dev/null); do
      nsenter --mount=/proc/"$pid"/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null
      log_msg "inject: $zygote pid=$pid bind $dest status=$?"
    done
  done

  for pid in $(pidof com.android.settings 2>/dev/null); do
    nsenter --mount=/proc/"$pid"/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null
    log_msg "inject: settings pid=$pid bind $dest status=$?"
  done
}

inject_apex() {
  api=$(get_api)
  [ "$api" -ge 34 ] || return 0

  if [ ! -d "$APEX_CACERTS" ]; then
    log_msg "inject: APEX path missing"
    return 1
  fi

  sync_active_certs || return 1

  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    log_msg "inject: no addon certs, skip APEX"
    return 0
  fi

  prepare_merged_tmpfs "$APEX_CACERTS" "$TEMP_APEX" || return 1
  bind_merged "$TEMP_APEX" "$APEX_CACERTS"
  log_msg "inject: APEX bind done"
  return 0
}

inject_system_merge() {
  sync_active_certs || return 1

  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    log_msg "inject: no addon certs, skip system"
    return 0
  fi

  if [ ! -d "$SYSTEM_CACERTS" ]; then
    log_msg "inject: system cacerts missing"
    return 1
  fi

  prepare_merged_tmpfs "$SYSTEM_CACERTS" "$TEMP_SYSTEM" || return 1
  bind_merged "$TEMP_SYSTEM" "$SYSTEM_CACERTS"
  log_msg "inject: system bind done"
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
