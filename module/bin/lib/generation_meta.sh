# 由 common 经 generation.sh 加载
# 待重启标记与 applied 查询
mark_reboot_required() {
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "配置已变更，重启后生效" >"$PENDING_FILE"
  chmod 0600 "$PENDING_FILE" 2>/dev/null
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

# 自定义证书指纹：文件名 + cksum，排序后拼接
custom_certs_fingerprint() {
  [ -d "$CUSTOM_DIR" ] || { echo ""; return 0; }
  (
    for f in "$CUSTOM_DIR"/*.*; do
      [ -f "$f" ] || continue
      base=$(basename "$f")
      case "$base" in *.meta) continue ;; esac
      is_cert_filename "$base" 2>/dev/null || continue
      sum=$(cksum "$f" 2>/dev/null | awk '{print $1 ":" $2}')
      echo "${base}|${sum}"
    done
  ) | sort | tr '\n' ';'
}

# 生效快照中的自定义证书指纹（applied-certs.list 的 custom:* 行）
applied_custom_fingerprint() {
  [ -s "$APPLIED_MAP" ] || { echo ""; return 0; }
  (
    while IFS='|' read -r label name checksum display; do
      case "$label" in
        custom:*)
          [ -n "$name" ] || continue
          echo "${name}|${checksum}"
          ;;
      esac
    done <"$APPLIED_MAP"
  ) | sort | tr '\n' ';'
}

# 当前配置是否与开机已生效快照一致？一致则不应再「待重启」
config_matches_applied() {
  [ -f "$APPLIED_CONF" ] || return 1
  generation_valid 2>/dev/null || return 1

  cur_req=$(read_conf reqable 1)
  cur_pp=$(read_conf proxypin 1)
  cur_mm=$(get_mount_mode)
  cur_tf=$(get_tmpfs_style)
  app_req=$(read_applied_conf reqable 1)
  app_pp=$(read_applied_conf proxypin 1)
  app_mm=$(read_applied_conf mount_mode compatible | tr 'A-Z' 'a-z')
  case "$app_mm" in magic|builtin|lightweight) app_mm=magic ;; *) app_mm=compatible ;; esac
  app_tf=$(read_applied_conf tmpfs_style dev | tr 'A-Z' 'a-z')
  case "$app_tf" in
    legacy|classic|verbose|long) app_tf=legacy ;;
    short|tmp) app_tf=short ;;
    *) app_tf=dev ;;
  esac

  [ "$cur_req" = "$app_req" ] || return 1
  [ "$cur_pp" = "$app_pp" ] || return 1
  [ "$cur_mm" = "$app_mm" ] || return 1
  [ "$cur_tf" = "$app_tf" ] || return 1

  cur_custom=$(custom_certs_fingerprint)
  app_custom=$(applied_custom_fingerprint)
  [ "$cur_custom" = "$app_custom" ] || return 1
  return 0
}

# 写配置后调用：与生效快照一致则清除 pending，否则标记待重启
# stdout: reboot_required=0|1
update_reboot_required_flag() {
  if config_matches_applied; then
    clear_reboot_required
    echo "reboot_required=0"
    return 0
  fi
  mark_reboot_required
  echo "reboot_required=1"
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
