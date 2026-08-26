# 由 hot_mount.sh 加载；勿单独执行
# 会话状态 / boot / 锁清理
hot_exit_cleanup() {
  rm -f "$HOT_ROOT"/.cert.$$.* "$HOT_ROOT/.sd-files.$$" \
    "$HOT_ROOT/.namespaces.$$" "$HOT_ROOT/.status-namespaces.$$" 2>/dev/null
  rm -f "$HOT_STATE.tmp.$$" 2>/dev/null
  rm -rf "$HOT_ROOT/.new.$$" 2>/dev/null
  if [ "$HOT_HAS_LOCK" = "1" ]; then
    release_write_lock
    HOT_HAS_LOCK=0
  fi
}

hot_unlock() {
  release_write_lock
  HOT_HAS_LOCK=0
}

hot_read_state() {
  key="$1"
  if [ -f "$HOT_STATE" ]; then
    HOT_STATE_SOURCE="$HOT_STATE"
  elif [ -f "$HOT_CURRENT/session.conf" ]; then
    HOT_STATE_SOURCE="$HOT_CURRENT/session.conf"
  else
    return 0
  fi
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$HOT_STATE_SOURCE" 2>/dev/null
}

hot_state_set() {
  HOT_STATE_KEY="$1"
  HOT_STATE_VALUE="$2"
  [ -f "$HOT_STATE" ] || return 1
  HOT_STATE_TMP="$HOT_STATE.tmp.$$"
  awk -F= -v key="$HOT_STATE_KEY" -v value="$HOT_STATE_VALUE" '
    BEGIN { done=0 }
    $1 == key { print key "=" value; done=1; next }
    { print }
    END { if (!done) print key "=" value }
  ' "$HOT_STATE" >"$HOT_STATE_TMP" || return 1
  chmod 0600 "$HOT_STATE_TMP" 2>/dev/null
  mv -f "$HOT_STATE_TMP" "$HOT_STATE"
}

hot_boot_id() {
  tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null
}

hot_boot_epoch() {
  tr -d '\r\n' <"$BOOT_EPOCH_FILE" 2>/dev/null
}

# 会话是否属于当前内核 boot + 用户态 epoch（软重启会递增 epoch）
hot_session_boot_fresh() {
  HOT_STATE_BOOT="$1"
  HOT_STATE_EPOCH="$2"
  HOT_NOW_BOOT=$(hot_boot_id)
  HOT_NOW_EPOCH=$(hot_boot_epoch)
  [ -n "$HOT_STATE_BOOT" ] && [ "$HOT_STATE_BOOT" = "$HOT_NOW_BOOT" ] || return 1
  if [ -n "$HOT_STATE_EPOCH" ]; then
    [ "$HOT_STATE_EPOCH" = "$HOT_NOW_EPOCH" ]
  else
    [ -z "$HOT_NOW_EPOCH" ] || [ "$HOT_NOW_EPOCH" = "0" ]
  fi
}
