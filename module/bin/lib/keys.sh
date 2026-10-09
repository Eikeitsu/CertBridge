#!/system/bin/sh
# 音量键读取（仅供安装 customize / install_flow；Action 不再等键）
# 返回：0=音量上，1=音量下，2=超时或无法读取
# 可选参数：超时秒数（默认 20）
#
# 优先 install/tools/volkey（EVIOCGRAB，不弹系统音量条）；装完随 install/ 清除。
# 缺二进制时回退 getevent（BakaSU / 官方 KSU 管理器常会弹 HUD）。

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

certbridge_volume_match_up() {
  grep -qE 'KEY_VOLUMEUP[[:space:]]+DOWN|[[:space:]]0073[[:space:]]+00000001' "$1" 2>/dev/null
}

certbridge_volume_match_down() {
  grep -qE 'KEY_VOLUMEDOWN[[:space:]]+DOWN|[[:space:]]0072[[:space:]]+00000001' "$1" 2>/dev/null
}

certbridge_volume_read_one() {
  out="$1"
  ge="$2"
  max_sec="$3"
  pid=""
  w=0

  case "$max_sec" in
    "" | *[!0-9]*) max_sec=1 ;;
  esac
  [ "$max_sec" -ge 1 ] || max_sec=1

  rm -f "$out"
  : >"$out"

  if command -v timeout >/dev/null 2>&1; then
    timeout "$max_sec" "$ge" -lqc 1 >"$out" 2>/dev/null || true
    return 0
  fi

  "$ge" -lqc 1 >"$out" 2>/dev/null &
  pid=$!
  while [ "$w" -lt "$max_sec" ]; do
    kill -0 "$pid" 2>/dev/null || break
    [ -s "$out" ] && break
    sleep 1
    w=$((w + 1))
  done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  return 0
}

certbridge_volume_drain() {
  ge="$1"
  event_file="$2"
  until_ts=0
  now_ts=0

  until_ts=$(date +%s 2>/dev/null) || until_ts=0
  if [ "$until_ts" -gt 0 ]; then
    until_ts=$((until_ts + 1))
    while true; do
      now_ts=$(date +%s 2>/dev/null) || break
      [ "$now_ts" -ge "$until_ts" ] && break
      certbridge_volume_read_one "$event_file" "$ge" 1
      [ -s "$event_file" ] || break
    done
  else
    certbridge_volume_read_one "$event_file" "$ge" 1
  fi
  rm -f "$event_file"
}

certbridge_volume_choice_getevent() {
  timeout_sec="${1:-20}"
  event_file=""
  ge=""
  start_ts=0
  now_ts=0
  elapsed=0
  remaining=0

  event_file="${TMPDIR:-/data/local/tmp}/certbridge-key-events.$$"
  ge="$(certbridge_volume_getevent_bin)" || return 2
  [ -n "$ge" ] || return 2

  certbridge_volume_drain "$ge" "$event_file"

  start_ts=$(date +%s 2>/dev/null) || start_ts=0
  elapsed=0

  while [ "$elapsed" -lt "$timeout_sec" ]; do
    remaining=$((timeout_sec - elapsed))
    [ "$remaining" -lt 1 ] && remaining=1
    certbridge_volume_read_one "$event_file" "$ge" "$remaining"
    if [ -s "$event_file" ]; then
      if certbridge_volume_match_up "$event_file"; then
        rm -f "$event_file"
        echo "  $(i18n_msg install.vol_up_label 2>/dev/null || echo '→ Vol+')"
        return 0
      fi
      if certbridge_volume_match_down "$event_file"; then
        rm -f "$event_file"
        echo "  $(i18n_msg install.vol_down_label 2>/dev/null || echo '→ Vol-')"
        return 1
      fi
    fi

    if [ "$start_ts" -gt 0 ]; then
      now_ts=$(date +%s 2>/dev/null) || now_ts=0
      if [ "$now_ts" -gt 0 ]; then
        elapsed=$((now_ts - start_ts))
      else
        elapsed=$((elapsed + 1))
      fi
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

  certbridge_volume_choice_getevent "$timeout_sec"
}
