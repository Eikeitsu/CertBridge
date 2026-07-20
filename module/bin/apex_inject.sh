#!/system/bin/sh
# 现场增量挂载（与 reqable / ProxyPin 相同思路）：
# tmpfs = 当前目标路径全部 CA + 模块追加 → bind mount
# 不落盘备份系统证书；重启后挂载消失，原厂路径自动恢复

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

prepare_merged_tmpfs() {
  target_path="$1"
  tmpfs_path="$2"
  seed_path="$3"

  umount "$tmpfs_path" 2>/dev/null
  rm -rf "$tmpfs_path" 2>/dev/null
  mkdir -p "$tmpfs_path"

  if ! mount -t tmpfs tmpfs "$tmpfs_path"; then
    log_msg "inject: tmpfs mount failed ($tmpfs_path)"
    return 1
  fi

  seed_n=$(count_certs "$seed_path")
  if [ "$seed_n" -lt "$MIN_SAFE_CERTS" ]; then
    log_msg "inject: seed too small ($seed_n) from $seed_path, refuse bind"
    umount "$tmpfs_path" 2>/dev/null
    return 1
  fi

  cp -a "$seed_path"/* "$tmpfs_path/" 2>/dev/null
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

  log_msg "inject: target=$target_path seed=$seed_n merged=$merged"
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

pick_system_seed() {
  # Magic Mount 可能让 /system/.../cacerts 看起来只剩模块证书；
  # 优先用尚未被我们 bind 的 APEX，其次 Magisk mirror，最后才用当前路径
  if [ -d "$APEX_CACERTS" ] && [ "$(count_certs "$APEX_CACERTS")" -ge "$MIN_SAFE_CERTS" ]; then
    echo "$APEX_CACERTS"
    return 0
  fi
  mirror=$(find_system_cacerts_mirror)
  if [ -n "$mirror" ] && [ "$(count_certs "$mirror")" -ge "$MIN_SAFE_CERTS" ]; then
    echo "$mirror"
    return 0
  fi
  echo "$SYSTEM_CACERTS"
}

inject_apex() {
  api=$(get_api)
  [ "$api" -ge 34 ] || return 0

  if [ ! -d "$APEX_CACERTS" ]; then
    log_msg "inject: APEX path missing"
    return 1
  fi

  sync_active_certs

  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    log_msg "inject: no addon certs, skip APEX"
    return 0
  fi

  # 开机后 APEX 仍是原厂完整库，直接现场合并
  prepare_merged_tmpfs "$APEX_CACERTS" "$TEMP_APEX" "$APEX_CACERTS" || return 1
  bind_merged "$TEMP_APEX" "$APEX_CACERTS"
  log_msg "inject: APEX bind done"
  return 0
}

inject_system_merge() {
  sync_active_certs

  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    log_msg "inject: no addon certs, skip system"
    return 0
  fi

  if [ ! -d "$SYSTEM_CACERTS" ]; then
    log_msg "inject: system cacerts missing"
    return 1
  fi

  seed=$(pick_system_seed)
  prepare_merged_tmpfs "$SYSTEM_CACERTS" "$TEMP_SYSTEM" "$seed" || return 1
  bind_merged "$TEMP_SYSTEM" "$SYSTEM_CACERTS"
  log_msg "inject: system bind done (seed=$seed)"
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
