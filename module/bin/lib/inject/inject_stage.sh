# 由 apex_inject.sh 加载
# 临时层准备与可见性
current_mount_id() {
  target="$1"
  awk -v target="$target" '
    $5 == target && ($1 + 0) > max { max=$1 }
    END { if (max) print max }
  ' /proc/self/mountinfo 2>/dev/null
}

pid_mount_id() {
  pid="$1"
  target="$2"
  nsenter --mount=/proc/"$pid"/ns/mnt -- awk -v target="$target" '
    $5 == target && ($1 + 0) > max { max=$1 }
    END { if (max) print max }
  ' /proc/self/mountinfo 2>/dev/null
}

# Best-effort placeholder（保留函数名以兼容调用点）。
# bind 后不再 remount,ro：部分机型会干扰 Conscrypt 读取信任库。
try_remount_ro_current() {
  :
}

try_remount_ro_pid() {
  :
}

ensure_stage_tmpfs() {
  stage="$1"
  if mountpoint -q "$stage" 2>/dev/null; then
    # 旧层可能被 remount 成只读，刷新前尽量改回可写
    mount -o remount,rw "$stage" 2>/dev/null || true
    return 0
  fi
  rm -rf "$stage" 2>/dev/null
  mkdir -p "$stage" || {
    record_inject_fail tmpfs_failed "无法创建临时目录"
    return 1
  }
  mount -t tmpfs -o mode=755 tmpfs "$stage" 2>/dev/null || {
    log_error "inject: tmpfs mount failed ($stage)"
    record_inject_fail tmpfs_failed "tmpfs 挂载失败"
    return 1
  }
}

# 将 GEN_CERTS 刷入 stage；失败时打印首个问题文件名
fill_stage_from_generation() {
  stage="$1"
  fail_name=""
  rm -f "$stage"/* 2>/dev/null
  for cert in "$GEN_CERTS"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    if ! cp -f "$cert" "$stage/$name" 2>/dev/null; then
      fail_name="$name"
      log_error "inject: copy to tmpfs failed ($name)"
      record_inject_fail stage_copy_failed "$name"
      return 1
    fi
  done
  [ "$(count_certs "$stage")" -eq "$(count_certs "$GEN_CERTS")" ] || {
    log_error "inject: tmpfs cert count mismatch for stage=$stage${fail_name:+ (last=$fail_name)}"
    record_inject_fail stage_copy_failed "数量不一致${fail_name:+:$fail_name}"
    return 1
  }
  return 0
}

prepare_target_stage() {
  target="$1"
  stage=$(target_stage_dir "$target")
  mkdir -p "$RUNTIME_MOUNT_ROOT" || return 1

  ensure_stage_tmpfs "$stage" || return 1

  # Refresh contents from immutable generation；失败则拆掉旧 tmpfs 重建一次
  if ! fill_stage_from_generation "$stage"; then
    log_warn "inject: refreshing stage failed, recreating tmpfs ($stage)"
    umount "$stage" 2>/dev/null || umount -l "$stage" 2>/dev/null || true
    rm -rf "$stage" 2>/dev/null
    ensure_stage_tmpfs "$stage" || return 1
    fill_stage_from_generation "$stage" || return 1
  fi

  chown -R 0:0 "$stage" 2>/dev/null
  chmod 0755 "$stage" 2>/dev/null
  chmod 0644 "$stage"/*.* 2>/dev/null
  # Critical for Flutter/Reqable reading /system/etc/security/cacerts
  set_selinux_context "$target" "$stage" || {
    log_error "inject: SELinux context for $target failed"
    record_inject_fail selinux_failed "$(basename "$target")"
    return 1
  }
  echo "$stage"
}

stage_visible_for_pid() {
  pid="$1"
  stage="$2"
  if nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "$stage" 2>/dev/null; then
    echo "$stage"
    return 0
  fi
  if nsenter --mount=/proc/"$pid"/ns/mnt -- test -d "/proc/1/root$stage" 2>/dev/null; then
    echo "/proc/1/root$stage"
    return 0
  fi
  return 1
}

# 绑定成功即保留。后续内容/归属检查仅用于日志；失败绝不 umount 回滚。
# （过严回滚曾导致「检测已安装、实际 TLS 仍失败」。）
