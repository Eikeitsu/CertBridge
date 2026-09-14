# 由 status.sh 加载
# boot-epoch / runtime-status 缓存 / Root 识别 / 热挂载会话探测
current_boot_id() {
  tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null
}

# KernelSU 软重启（越狱模式常用）不换内核 boot_id，但会重跑模块脚本。
# boot-epoch 在每次 post-fs-data 递增，用来区分「同 boot_id 的不同用户态周期」。
current_boot_epoch() {
  tr -d '\r\n' <"$BOOT_EPOCH_FILE" 2>/dev/null
}

current_boot_token() {
  echo "$(current_boot_id):$(current_boot_epoch)"
}

bump_boot_epoch() {
  mkdir -p "$STATEDIR" 2>/dev/null
  old=$(current_boot_epoch)
  case "$old" in
    ""|*[!0-9]*) old=0 ;;
  esac
  echo $((old + 1)) >"$BOOT_EPOCH_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$BOOT_EPOCH_FILE.tmp.$$" "$BOOT_EPOCH_FILE"
  chmod 0600 "$BOOT_EPOCH_FILE" 2>/dev/null
}

read_runtime_status() {
  key="$1"
  [ -f "$RUNTIME_STATUS_FILE" ] || return 1
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' \
    "$RUNTIME_STATUS_FILE" 2>/dev/null | tr -d '\r'
}

runtime_status_fresh() {
  cached_token=$(read_runtime_status boot_token)
  if [ -n "$cached_token" ]; then
    [ "$cached_token" = "$(current_boot_token)" ]
    return $?
  fi
  # 兼容旧缓存：仅有 boot_id 时，还要求 epoch 为空/0（未曾软重启递增）
  cached_boot=$(read_runtime_status boot_id)
  epoch=$(current_boot_epoch)
  [ -n "$cached_boot" ] && [ "$cached_boot" = "$(current_boot_id)" ] && \
    { [ -z "$epoch" ] || [ "$epoch" = "0" ]; }
}

# phase: post-fs-data | service | manual
# apex_ok: 0|1|2  （同 check_store_injected）
write_runtime_status() {
  phase="$1"
  apex_ok="$2"
  tag="$3"
  mkdir -p "$STATEDIR" 2>/dev/null
  tmp="$RUNTIME_STATUS_FILE.tmp.$$"
  cat >"$tmp" <<EOF
boot_id=$(current_boot_id)
boot_epoch=$(current_boot_epoch)
boot_token=$(current_boot_token)
phase=$phase
apex_ok=$apex_ok
tag=$tag
updated_at=$(date +%s)
EOF
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$RUNTIME_STATUS_FILE"
}

detect_root_impl() {
  if [ -f "$ROOT_CACHE_FILE" ]; then
    cached=$(tr -d '\r\n' <"$ROOT_CACHE_FILE" 2>/dev/null)
    case "$cached" in
      Magisk|KernelSU|SukiSU|APatch|Unknown)
        echo "$cached"
        return 0
        ;;
    esac
  fi

  result=Unknown
  if [ "$APATCH" = "true" ] || [ -d /data/adb/ap ] || [ -f /data/adb/ap/bin/apd ]; then
    result=APatch
  elif [ "$KSU" = "true" ] || [ -d /data/adb/ksu ] || [ -f /data/adb/ksu/bin/ksud ]; then
    if [ -f /data/adb/ksu/bin/ksud ] && \
        grep -aql sukisu /data/adb/ksu/bin/ksud 2>/dev/null; then
      result=SukiSU
    else
      result=KernelSU
    fi
  elif [ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] || [ -f /sbin/magisk ]; then
    result=Magisk
  fi

  mkdir -p "$STATEDIR" 2>/dev/null
  echo "$result" >"$ROOT_CACHE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$ROOT_CACHE_FILE.tmp.$$" "$ROOT_CACHE_FILE" 2>/dev/null
  echo "$result"
}

hot_session_recorded() {
  hot_state="$STATEDIR/hot-session.conf"
  [ -f "$hot_state" ] || return 1
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_boot=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_epoch=$(awk -F= '$1 == "boot_epoch" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_session" ] || return 1
  [ "$hot_boot" = "$(current_boot_id)" ] || return 1
  # 无 epoch 字段的旧会话：仅在尚未发生软重启递增时视为有效
  cur_epoch=$(current_boot_epoch)
  if [ -n "$hot_epoch" ]; then
    [ "$hot_epoch" = "$cur_epoch" ]
  else
    [ -z "$cur_epoch" ] || [ "$cur_epoch" = "0" ]
  fi
}

hot_session_active() {
  hot_session_recorded || return 1
  hot_state="$STATEDIR/hot-session.conf"
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_target=$(awk -F= '$1 == "target" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_target" ] || return 1
  actual=$(nsenter --mount=/proc/1/ns/mnt -- \
    sh -c "cat '$hot_target/certbridge_session' 2>/dev/null" 2>/dev/null | tr -d '\r\n')
  [ "$actual" = "$hot_session" ]
}

# 证书缺省显示名（applied 第 4 列为空时）
