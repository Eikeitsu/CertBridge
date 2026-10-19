#!/system/bin/sh
# 音量键读取（仅供安装 customize / install_flow；Action 不再等键）
# 返回：0=音量上，1=音量下，2=超时或无法读取
# 可选参数：超时秒数（默认 20）
#
# 优先 install/tools/volkey（EVIOCGRAB，不弹系统音量条）；装完随 install/ 清除。
# 缺二进制时：有 Magisk chooseport 则用之，否则薄 getevent 回退。

certbridge_volume_volkey_bin() {
  _base="${MODPATH:-${MODDIR:-}}/install/tools"
  [ -d "$_base" ] || return 1
  _name=
  case "${ARCH:-}" in
    arm64 | arm64-v8a) _name=volkey-arm64 ;;
    arm | armeabi-v7a | armeabi) _name=volkey-arm ;;
    *)
      case "$(getprop ro.product.cpu.abi 2>/dev/null)" in
        arm64*) _name=volkey-arm64 ;;
        armeabi* | arm*) _name=volkey-arm ;;
        *) return 1 ;;
      esac
      ;;
  esac
  [ -f "$_base/$_name" ] || return 1
  # zip 若漏标可执行位，装机时补上，避免静默回退 getevent 弹音量条
  chmod 0755 "$_base/$_name" 2>/dev/null || true
  [ -x "$_base/$_name" ] || return 1
  echo "$_base/$_name"
}

certbridge_volume_getevent_bin() {
  if [ -x /system/bin/getevent ]; then
    echo /system/bin/getevent
    return 0
  fi
  if [ -x /system/xbin/getevent ]; then
    echo /system/xbin/getevent
    return 0
  fi
  command -v getevent 2>/dev/null
}

# 薄 getevent：单次 -lqc 1 + 超时循环；无 drain/timeout 分叉
certbridge_volume_choice_getevent() {
  timeout_sec="${1:-20}"
  event_file="${TMPDIR:-/data/local/tmp}/certbridge-key-events.$$"
  ge="$(certbridge_volume_getevent_bin)" || return 2
  [ -n "$ge" ] || return 2

  start_ts=$(date +%s 2>/dev/null) || start_ts=0
  elapsed=0
  # 丢掉残留事件
  "$ge" -lqc 1 >/dev/null 2>&1 &
  _drain=$!
  sleep 0.2 2>/dev/null || true
  kill "$_drain" 2>/dev/null || true
  wait "$_drain" 2>/dev/null || true

  while [ "$elapsed" -lt "$timeout_sec" ]; do
    remaining=$((timeout_sec - elapsed))
    [ "$remaining" -lt 1 ] && remaining=1
    rm -f "$event_file"
    if command -v timeout >/dev/null 2>&1; then
      timeout "$remaining" "$ge" -lqc 1 >"$event_file" 2>/dev/null || true
    else
      "$ge" -lqc 1 >"$event_file" 2>/dev/null &
      _pid=$!
      w=0
      while [ "$w" -lt "$remaining" ]; do
        kill -0 "$_pid" 2>/dev/null || break
        [ -s "$event_file" ] && break
        sleep 1
        w=$((w + 1))
      done
      kill "$_pid" 2>/dev/null || true
      wait "$_pid" 2>/dev/null || true
    fi
    if [ -s "$event_file" ]; then
      if grep -qE 'KEY_VOLUMEUP[[:space:]]+DOWN|[[:space:]]0073[[:space:]]+00000001' "$event_file" 2>/dev/null; then
        rm -f "$event_file"
        echo "  $(i18n_msg install.vol_up_label 2>/dev/null || echo '→ Vol+')"
        return 0
      fi
      if grep -qE 'KEY_VOLUMEDOWN[[:space:]]+DOWN|[[:space:]]0072[[:space:]]+00000001' "$event_file" 2>/dev/null; then
        rm -f "$event_file"
        echo "  $(i18n_msg install.vol_down_label 2>/dev/null || echo '→ Vol-')"
        return 1
      fi
    fi
    if [ "$start_ts" -gt 0 ]; then
      now_ts=$(date +%s 2>/dev/null) || now_ts=0
      [ "$now_ts" -gt 0 ] && elapsed=$((now_ts - start_ts)) || elapsed=$((elapsed + 1))
    else
      elapsed=$((elapsed + 1))
    fi
  done

  rm -f "$event_file"
  echo "  $(i18n_msg install.vol_timeout_label 2>/dev/null || echo '→ timeout')"
  return 2
}

certbridge_volume_choice() {
  timeout_sec="${1:-20}"
  case "$timeout_sec" in
    "" | *[!0-9]*) timeout_sec=20 ;;
  esac
  [ "$timeout_sec" -ge 3 ] || timeout_sec=3

  vk="$(certbridge_volume_volkey_bin 2>/dev/null)" || vk=
  if [ -n "$vk" ] && [ -x "$vk" ]; then
    "$vk" "$timeout_sec"
    _vk_rc=$?
    case "$_vk_rc" in
      0)
        echo "  $(i18n_msg install.vol_up_label 2>/dev/null || echo '→ Vol+')"
        return 0
        ;;
      1)
        echo "  $(i18n_msg install.vol_down_label 2>/dev/null || echo '→ Vol-')"
        return 1
        ;;
      *)
        echo "  $(i18n_msg install.vol_timeout_label 2>/dev/null || echo '→ timeout')"
        return 2
        ;;
    esac
  fi

  # Magisk / 部分管理器已注入 chooseport
  if type chooseport >/dev/null 2>&1; then
    chooseport "$timeout_sec"
    _cp=$?
    case "$_cp" in
      0)
        echo "  $(i18n_msg install.vol_up_label 2>/dev/null || echo '→ Vol+')"
        return 0
        ;;
      1)
        echo "  $(i18n_msg install.vol_down_label 2>/dev/null || echo '→ Vol-')"
        return 1
        ;;
      *)
        echo "  $(i18n_msg install.vol_timeout_label 2>/dev/null || echo '→ timeout')"
        return 2
        ;;
    esac
  fi

  certbridge_volume_choice_getevent "$timeout_sec"
}
