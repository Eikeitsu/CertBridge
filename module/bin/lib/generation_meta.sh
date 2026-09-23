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

# 读 applied.conf 中某键（缺省回退）
read_applied_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$APPLIED_CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$APPLIED_CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

# 用户是否在 user.conf（或 legacy）里显式写过该键
user_conf_has_key() {
  key="$1"
  USER_CONF="${USER_CONF:-${CB_EXT_DIR:-/data/adb/certbridge}/user.conf}"
  USER_CONF_LEGACY="${USER_CONF_LEGACY:-$STATEDIR/user.conf}"
  grep -q "^${key}=" "$USER_CONF" 2>/dev/null && return 0
  grep -q "^${key}=" "$USER_CONF_LEGACY" 2>/dev/null && return 0
  return 1
}

# 开机时该内置证书是否实际注入（以 applied-certs.list 为准）
applied_addon_enabled() {
  kind="$1"
  [ -s "$APPLIED_MAP" ] || return 1
  grep -q "^${kind}|" "$APPLIED_MAP" 2>/dev/null
}

# 自定义证书指纹：仅内容 cksum 集合（排序）
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

# 生效快照中的自定义证书指纹（applied-certs.list 的 custom:* 行）
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

# 当前配置是否与开机已生效快照一致？一致则不应再「待重启」
#
# 策略：
# - 证书开关：一律以 applied-certs.list 为准（真正注入过的才算开机态）
# - 自定义证书：比对内容指纹
# - mount/tmpfs/e14/boot_*：仅当用户在 user.conf 里显式写过才比对
#   （避免模块更新改了模板默认值、但用户没动过该项时，关开证书也清不掉 pending）
config_matches_applied() {
  if [ ! -s "$APPLIED_MAP" ] && [ ! -f "$APPLIED_CONF" ]; then
    return 1
  fi

  cur_req=$(read_conf reqable 1 | tr -d ' \t\r\n')
  cur_pp=$(read_conf proxypin 1 | tr -d ' \t\r\n')
  if [ -s "$APPLIED_MAP" ]; then
    app_req=0
    app_pp=0
    applied_addon_enabled reqable && app_req=1
    applied_addon_enabled proxypin && app_pp=1
  else
    app_req=$(read_applied_conf reqable 1 | tr -d ' \t\r\n')
    app_pp=$(read_applied_conf proxypin 1 | tr -d ' \t\r\n')
  fi
  [ "$cur_req" = "$app_req" ] || return 1
  [ "$cur_pp" = "$app_pp" ] || return 1

  if user_conf_has_key mount_mode; then
    cur_mm=$(get_mount_mode)
    app_mm=$(read_applied_conf mount_mode compatible | tr 'A-Z' 'a-z' | tr -d ' \t\r\n')
    case "$app_mm" in magic|builtin|lightweight) app_mm=magic ;; *) app_mm=compatible ;; esac
    [ "$cur_mm" = "$app_mm" ] || return 1
  fi

  if user_conf_has_key tmpfs_style; then
    cur_tf=$(get_tmpfs_style)
    app_tf=$(read_applied_conf tmpfs_style dev | tr 'A-Z' 'a-z' | tr -d ' \t\r\n')
    case "$app_tf" in
      legacy|classic|verbose|long) app_tf=legacy ;;
      short|tmp) app_tf=short ;;
      mnt) app_tf=mnt ;;
      *) app_tf=dev ;;
    esac
    [ "$cur_tf" = "$app_tf" ] || return 1
  fi

  if user_conf_has_key experimental_14_system; then
    cur_e14=$(get_experimental_14_system)
    app_e14=$(read_applied_conf experimental_14_system skip | tr 'A-Z' 'a-z' | tr -d ' \t\r\n')
    case "$app_e14" in
      auto|off|default|follow|overlay|apex_overlay) app_e14=auto ;;
      *) app_e14=skip ;;
    esac
    [ "$cur_e14" = "$app_e14" ] || return 1
  fi

  if user_conf_has_key boot_bind_zygote; then
    cur_bz=$(read_conf boot_bind_zygote 0 | tr -d ' \t\r\n')
    app_bz=$(read_applied_conf boot_bind_zygote 0 | tr -d ' \t\r\n')
    [ "$cur_bz" = "$app_bz" ] || return 1
  fi

  if user_conf_has_key boot_multi_apex; then
    cur_ba=$(read_conf boot_multi_apex 0 | tr -d ' \t\r\n')
    app_ba=$(read_applied_conf boot_multi_apex 0 | tr -d ' \t\r\n')
    [ "$cur_ba" = "$app_ba" ] || return 1
  fi

  cur_custom=$(custom_certs_fingerprint)
  app_custom=$(applied_custom_fingerprint)
  [ "$cur_custom" = "$app_custom" ] || return 1
  return 0
}

# 写配置后调用：与生效快照一致则清除 pending，否则标记待重启
# stdout: reboot_required=0|1 与 pending_reboot=0|1（两行）
update_reboot_required_flag() {
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
