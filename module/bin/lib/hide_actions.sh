# 挂载隐藏协助（可选组件）
# try_umount 登记与注入后回调
hide_assist_available() {
  return 0
}

# conf hide_allow=1 时才真正注册 try_umount / 写状态文件
# 默认安装写入 hide_allow=0；自定义安装勾选隐藏时写入 hide_allow=1
hide_assist_enabled() {
  [ "$(read_conf hide_allow 0)" = "1" ]
}

hide_clear_applied() {
  rm -f "$HIDE_STATE_FILE" 2>/dev/null
}

hide_module_enabled() {
  moddir="$1"
  [ -d "$moddir" ] || return 1
  [ ! -f "$moddir/disable" ] && [ ! -f "$moddir/remove" ]
}

hide_susfs_available() {
  [ -x "$SUSFS_BIN" ] || return 1
  "$SUSFS_BIN" show enabled_features 2>/dev/null | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"
}

hide_ksud_kernel_umount_available() {
  [ -x /data/adb/ksu/bin/ksud ] || return 1
  /data/adb/ksud kernel 2>&1 | grep -q "umount"
}

hide_record_applied() {
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "hide_applied=1" >"$HIDE_STATE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$HIDE_STATE_FILE.tmp.$$" "$HIDE_STATE_FILE" 2>/dev/null
}

hide_read_applied() {
  [ -f "$HIDE_STATE_FILE" ] && grep -q '^hide_applied=1' "$HIDE_STATE_FILE" 2>/dev/null
}

# 对单个 cacerts 目标注册 try_umount（bind 成功后调用；需开启 hide_allow）
hide_assist_for_target() {
  target="$1"
  [ -n "$target" ] || return 0
  hide_assist_enabled || return 0
  applied=0

  if hide_susfs_available; then
    if "$SUSFS_BIN" add_try_umount "$target" 1 2>/dev/null; then
      log_debug "hide: susfs try_umount registered ($target)"
      applied=1
    elif "$SUSFS_BIN" add_try_umount "$target" >/dev/null 2>&1; then
      log_debug "hide: susfs try_umount registered legacy ($target)"
      applied=1
    fi
  fi

  if hide_ksud_kernel_umount_available; then
    /data/adb/ksu/bin/ksud kernel umount add "$target" --flags 2 >/dev/null 2>&1 && \
      log_debug "hide: ksud kernel umount registered ($target)" && applied=1
  fi

  [ "$applied" = "1" ] && hide_record_applied
  return 0
}

# 注入完成后对所有目标路径注册隐藏协助
hide_assist_after_inject() {
  hide_assist_enabled || {
    hide_clear_applied
    return 0
  }
  for target in $(list_target_stores); do
    hide_assist_for_target "$target"
  done
}

# 探测已启用的隐藏助手模块（优先级：susfs > zygisk 栈 > magisk_denylist）
