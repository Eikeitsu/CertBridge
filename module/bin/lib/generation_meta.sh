#!/system/bin/sh
# 由 common 经 generation.sh 加载
# 待重启标记与 applied 查询
mark_reboot_required() {
  mkdir -p "$STATEDIR" 2>/dev/null || return 0
  echo "配置已变更，重启后生效" >"$PENDING_FILE" 2>/dev/null || return 0
  chmod 0600 "$PENDING_FILE" 2>/dev/null || true
  return 0
}

clear_reboot_required() {
  rm -f "$PENDING_FILE" 2>/dev/null
}

read_applied_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$APPLIED_CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$APPLIED_CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

_overlay_conf_onto() {
  src="$1"
  dest="$2"
  [ -f "$src" ] || return 0
  [ -f "$dest" ] || : >"$dest"
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      ""|\#*) continue ;;
    esac
    key=${line%%=*}
    [ -n "$key" ] && [ "$key" != "$line" ] || continue
    value=${line#*=}
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$dest" >"$dest.new" 2>/dev/null && mv -f "$dest.new" "$dest"
  done <"$src"
}

custom_certs_fingerprint() {
  [ -d "$CUSTOM_DIR" ] || { echo ""; return 0; }
  (
    for f in "$CUSTOM_DIR"/*.*; do
      [ -f "$f" ] || continue
      base=$(basename "$f")
      case "$base" in *.meta) continue ;; esac
      is_cert_filename "$base" 2>/dev/null || continue
      cksum "$f" 2>/dev/null | awk '{print $1 ":" $2}'
    done
  ) | sort | tr '\n' ';'
}

applied_custom_fingerprint() {
  [ -s "$APPLIED_MAP" ] || { echo ""; return 0; }
  (
    while IFS='|' read -r label name checksum display || [ -n "$label" ]; do
      case "$label" in
        custom:*)
          [ -n "$checksum" ] || continue
          echo "$checksum"
          ;;
      esac
    done <"$APPLIED_MAP"
  ) | sort | tr '\n' ';'
}

_norm_bool01() {
  case "$(printf '%s' "$1" | tr -d ' \t\r\n')" in
    1|true|yes|on) echo 1 ;;
    *) echo 0 ;;
  esac
}

_file_bool01() {
  file="$1"
  key="$2"
  default="$3"
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$file" 2>/dev/null | tr -d ' \t\r\n')
  [ -n "$val" ] || val=$default
  _norm_bool01 "$val"
}

# 开机时证书开关：applied.conf 有键用它；否则以 applied-certs.list 是否注入为准
_boot_cert_enabled() {
  kind="$1"
  if [ -f "$APPLIED_CONF" ] && grep -q "^${kind}=" "$APPLIED_CONF" 2>/dev/null; then
    _file_bool01 "$APPLIED_CONF" "$kind" 0
    return 0
  fi
  if [ -s "$APPLIED_MAP" ] && grep -q "^${kind}|" "$APPLIED_MAP" 2>/dev/null; then
    echo 1
  else
    echo 0
  fi
}

# 当前证书开关意图：只认外置 user.conf；未写过的键视为「未改＝与开机一致」
# （绝不能 read_conf 落入 legacy/模板，否则只拨 ProxyPin 会被另一张证的旧值永久卡住 pending）
_cur_cert_enabled() {
  kind="$1"
  USER_CONF="${USER_CONF:-${CB_EXT_DIR:-/data/adb/certbridge}/user.conf}"
  if [ -f "$USER_CONF" ] && grep -q "^${kind}=" "$USER_CONF" 2>/dev/null; then
    _file_bool01 "$USER_CONF" "$kind" 0
    return 0
  fi
  _boot_cert_enabled "$kind"
}

# 仅证书开关是否回到开机态（toggle 专用；自定义证书由 install/remove 路径负责）
cert_state_matches_applied() {
  if [ ! -f "$APPLIED_CONF" ] && [ ! -s "$APPLIED_MAP" ]; then
    # 无开机快照可读时，不制造假 pending（否则关开永不清）
    return 0
  fi
  cur_req=$(_cur_cert_enabled reqable)
  cur_pp=$(_cur_cert_enabled proxypin)
  app_req=$(_boot_cert_enabled reqable)
  app_pp=$(_boot_cert_enabled proxypin)
  [ "$cur_req" = "$app_req" ] || return 1
  [ "$cur_pp" = "$app_pp" ] || return 1
  return 0
}

# 完整比对（挂载模式等 setter 用）：以 applied.conf 为底叠当前 user.conf
config_matches_applied() {
  USER_CONF="${USER_CONF:-${CB_EXT_DIR:-/data/adb/certbridge}/user.conf}"
  USER_CONF_LEGACY="${USER_CONF_LEGACY:-$STATEDIR/user.conf}"

  cert_state_matches_applied || return 1
  [ "$(custom_certs_fingerprint)" = "$(applied_custom_fingerprint)" ] || return 1

  [ -f "$APPLIED_CONF" ] || return 0

  tmp="${STATEDIR:-/data/local/tmp}/.cb_match.$$"
  mkdir -p "${STATEDIR:-/data/local/tmp}" 2>/dev/null || true
  cp -f "$APPLIED_CONF" "$tmp" 2>/dev/null || {
    rm -f "$tmp"
    return 1
  }
  _overlay_conf_onto "$USER_CONF_LEGACY" "$tmp"
  _overlay_conf_onto "$USER_CONF" "$tmp"

  for key in mount_mode tmpfs_style experimental_14_system boot_bind_zygote boot_multi_apex; do
    cur=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$tmp" 2>/dev/null | tr -d ' \t\r\n')
    app=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$APPLIED_CONF" 2>/dev/null | tr -d ' \t\r\n')
    if [ -z "$cur" ] && [ -z "$app" ]; then
      continue
    fi
    case "$key" in
      mount_mode)
        [ -n "$cur" ] || cur=compatible
        [ -n "$app" ] || app=compatible
        cur=$(printf '%s' "$cur" | tr 'A-Z' 'a-z')
        app=$(printf '%s' "$app" | tr 'A-Z' 'a-z')
        case "$cur" in magic|builtin|lightweight) cur=magic ;; *) cur=compatible ;; esac
        case "$app" in magic|builtin|lightweight) app=magic ;; *) app=compatible ;; esac
        ;;
      tmpfs_style)
        [ -n "$cur" ] || cur=dev
        [ -n "$app" ] || app=dev
        cur=$(printf '%s' "$cur" | tr 'A-Z' 'a-z')
        app=$(printf '%s' "$app" | tr 'A-Z' 'a-z')
        case "$cur" in legacy|classic|verbose|long) cur=legacy ;; short|tmp) cur=short ;; mnt) cur=mnt ;; *) cur=dev ;; esac
        case "$app" in legacy|classic|verbose|long) app=legacy ;; short|tmp) app=short ;; mnt) app=mnt ;; *) app=dev ;; esac
        ;;
      experimental_14_system)
        [ -n "$cur" ] || cur=skip
        [ -n "$app" ] || app=skip
        cur=$(printf '%s' "$cur" | tr 'A-Z' 'a-z')
        app=$(printf '%s' "$app" | tr 'A-Z' 'a-z')
        case "$cur" in auto|off|default|follow|overlay|apex_overlay) cur=auto ;; *) cur=skip ;; esac
        case "$app" in auto|off|default|follow|overlay|apex_overlay) app=auto ;; *) app=skip ;; esac
        ;;
      boot_bind_zygote|boot_multi_apex)
        [ -n "$cur" ] || cur=0
        [ -n "$app" ] || app=0
        cur=$(_norm_bool01 "$cur")
        app=$(_norm_bool01 "$app")
        ;;
    esac
    if [ "$cur" != "$app" ]; then
      rm -f "$tmp" "$tmp.new"
      return 1
    fi
  done

  rm -f "$tmp" "$tmp.new"
  return 0
}

# 证书开关专用：只看证书态，避免其它配置误伤「关开回原」
update_reboot_required_flag_certs() {
  if cert_state_matches_applied; then
    clear_reboot_required
    echo "reboot_required=0"
    echo "pending_reboot=0"
    return 0
  fi
  mark_reboot_required
  echo "reboot_required=1"
  echo "pending_reboot=1"
}

update_reboot_required_flag() {
  if type prune_redundant_user_conf_defaults >/dev/null 2>&1; then
    prune_redundant_user_conf_defaults 2>/dev/null || true
  fi
  if config_matches_applied; then
    clear_reboot_required
    echo "reboot_required=0"
    echo "pending_reboot=0"
    return 0
  fi
  mark_reboot_required
  echo "reboot_required=1"
  echo "pending_reboot=1"
}

get_applied_name() {
  grep -m1 "^$1|" "$APPLIED_MAP" 2>/dev/null | cut -d'|' -f2 | tr -d '\r'
}

get_applied_display() {
  label="$1"
  fallback="$2"
  name=$(grep -m1 "^${label}|" "$APPLIED_MAP" 2>/dev/null | cut -d'|' -f4 | tr -d '\r')
  if [ -n "$name" ]; then
    echo "$name"
    return 0
  fi
  echo "${fallback:-$label}"
}

is_addon_applied() {
  [ -n "$(get_applied_name "$1")" ]
}
