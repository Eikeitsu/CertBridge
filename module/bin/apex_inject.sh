#!/system/bin/sh
# 现场增量挂载：
# 临时合并目录 = 当前目标路径全部 CA + 模块追加 → bind mount
# 模块包不再声明 system/cacerts，注入失败也不会遮蔽系统原有证书

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

prepare_merged_dir() {
  target_path="$1"
  merge_base="$2"
  seed_path="$3"
  merge_path="${merge_base}.$(date +%s).$$"
  PREPARED_DIR="$merge_path"

  rm -rf "$merge_path" 2>/dev/null
  mkdir -p "$merge_path" || return 1

  seed_n=$(count_certs "$seed_path")
  if [ "$seed_n" -lt "$MIN_SAFE_CERTS" ]; then
    log_msg "inject: seed too small ($seed_n) from $seed_path, refuse bind"
    rm -rf "$merge_path" 2>/dev/null
    return 1
  fi

  cp -a "$seed_path"/. "$merge_path/" 2>/dev/null
  install_addon_certs_into "$merge_path"

  chown -R 0:0 "$merge_path"
  chmod 755 "$merge_path"
  chmod 644 "$merge_path"/*.0 2>/dev/null
  set_selinux_context "$target_path" "$merge_path"

  merged=$(count_certs "$merge_path")
  if [ "$merged" -lt "$MIN_SAFE_CERTS" ]; then
    log_msg "inject: merged $merged < $MIN_SAFE_CERTS, refuse bind"
    rm -rf "$merge_path" 2>/dev/null
    return 1
  fi

  log_msg "inject: target=$target_path seed=$seed_n merged=$merged"
  return 0
}

verify_current_target() {
  dest="$1"
  [ "$(count_certs "$dest")" -ge "$MIN_SAFE_CERTS" ] || return 1
  for cert in "$ACTIVE_DIR"/*.0; do
    [ -f "$cert" ] || continue
    [ -f "$dest/$(basename "$cert")" ] || return 1
  done
  return 0
}

verify_namespace_target() {
  pid="$1"
  dest="$2"
  n=$(nsenter --mount=/proc/"$pid"/ns/mnt -- sh -c \
    "ls -1 '$dest'/*.0 2>/dev/null | wc -l" 2>/dev/null)
  n=$(echo "$n" | tr -d ' ')
  [ "${n:-0}" -ge "$MIN_SAFE_CERTS" ] || return 1
  for cert in "$ACTIVE_DIR"/*.0; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    nsenter --mount=/proc/"$pid"/ns/mnt -- sh -c \
      "[ -f '$dest/$name' ]" 2>/dev/null || return 1
  done
  return 0
}

bind_for_pid() {
  pid="$1"
  src="$2"
  dest="$3"
  nsenter --mount=/proc/"$pid"/ns/mnt -- mount --bind "$src" "$dest" 2>/dev/null || return 1
  verify_namespace_target "$pid" "$dest"
}

bind_merged() {
  src="$1"
  dest="$2"

  current_ok=0
  global_ok=0

  if mount --bind "$src" "$dest" 2>/dev/null && verify_current_target "$dest"; then
    current_ok=1
  else
    log_msg "inject: current namespace bind failed ($dest)"
  fi

  if bind_for_pid 1 "$src" "$dest"; then
    global_ok=1
  else
    log_msg "inject: PID 1 namespace bind failed ($dest)"
  fi

  for zygote in zygote zygote64; do
    for pid in $(pidof "$zygote" 2>/dev/null); do
      bind_for_pid "$pid" "$src" "$dest" || \
        log_msg "inject: $zygote namespace bind failed pid=$pid ($dest)"
    done
  done

  for pid in $(pidof com.android.settings 2>/dev/null); do
    bind_for_pid "$pid" "$src" "$dest" || \
      log_msg "inject: settings namespace bind failed pid=$pid ($dest)"
  done

  verified=0
  if command -v nsenter >/dev/null 2>&1; then
    [ "$global_ok" -eq 1 ] && verified=1
  else
    [ "$current_ok" -eq 1 ] && verified=1
  fi

  if [ "$verified" -ne 1 ]; then
    umount "$dest" 2>/dev/null
    nsenter --mount=/proc/1/ns/mnt -- umount "$dest" 2>/dev/null
    log_msg "inject: no verified namespace bind ($dest)"
    return 1
  fi

  log_msg "inject: bind verified target=$dest current=$current_ok global=$global_ok"
  return 0
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
  prepare_merged_dir "$APEX_CACERTS" "$TEMP_APEX" "$APEX_CACERTS" || return 1
  bind_merged "$PREPARED_DIR" "$APEX_CACERTS" || return 1
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
  prepare_merged_dir "$SYSTEM_CACERTS" "$TEMP_SYSTEM" "$seed" || return 1
  bind_merged "$PREPARED_DIR" "$SYSTEM_CACERTS" || return 1
  log_msg "inject: system bind done (seed=$seed)"
  return 0
}

case "${1:-inject}" in
  inject)
    rc=0
    inject_apex || rc=1
    inject_system_merge || rc=1
    exit "$rc"
    ;;
  *)
    rc=0
    inject_apex || rc=1
    inject_system_merge || rc=1
    exit "$rc"
    ;;
esac
