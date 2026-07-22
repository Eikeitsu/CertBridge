#!/system/bin/sh
# 写锁（跨脚本互斥）

acquire_write_lock() {
  mkdir -p "$STATEDIR" 2>/dev/null
  lock_boot=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  lock_start=$(awk '{print $22}' "/proc/$$/stat" 2>/dev/null)
  lock_identity="$$|$lock_boot|$lock_start"
  tries=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    tries=$((tries + 1))
    lock_record=$(cat "$LOCK_OWNER" 2>/dev/null)
    lock_pid=$(echo "$lock_record" | cut -d'|' -f1)
    lock_record_boot=$(echo "$lock_record" | cut -d'|' -f2)
    lock_record_start=$(echo "$lock_record" | cut -d'|' -f3)
    lock_live_start=""
    case "$lock_pid" in *[!0-9]*|"") ;; *)
      lock_live_start=$(awk '{print $22}' "/proc/$lock_pid/stat" 2>/dev/null)
      ;;
    esac
    lock_stale=0
    if [ -n "$lock_record" ]; then
      if [ "$lock_record_boot" != "$lock_boot" ] || [ -z "$lock_live_start" ] || \
          [ "$lock_live_start" != "$lock_record_start" ]; then
        lock_stale=1
      fi
    fi
    if [ "$lock_stale" -eq 1 ]; then
      rm -f "$LOCK_OWNER" 2>/dev/null
      rmdir "$LOCK_DIR" 2>/dev/null
      continue
    fi
    if [ -z "$lock_record" ] && [ "$tries" -ge 2 ]; then
      rmdir "$LOCK_DIR" 2>/dev/null && continue
    fi
    [ "$tries" -ge 5 ] && return 1
    sleep 1
  done
  echo "$lock_identity" >"$LOCK_OWNER" || {
    rmdir "$LOCK_DIR" 2>/dev/null
    return 1
  }
  chmod 0600 "$LOCK_OWNER" 2>/dev/null
}

release_write_lock() {
  lock_boot=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  lock_start=$(awk '{print $22}' "/proc/$$/stat" 2>/dev/null)
  lock_identity="$$|$lock_boot|$lock_start"
  [ "$(cat "$LOCK_OWNER" 2>/dev/null)" = "$lock_identity" ] || return 1
  rm -f "$LOCK_OWNER" 2>/dev/null
  rmdir "$LOCK_DIR" 2>/dev/null
}
