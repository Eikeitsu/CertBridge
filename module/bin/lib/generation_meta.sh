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

# 自定义证书指纹：仅内容 cksum 集合（排序），避免文件名与 applied 目标名不一致时误判
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

# 生效快照中的自定义证书指纹（applied-certs.list 的 custom:* 行，第 3 列为 cksum）
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
# 只比对会影响下次开机注入的项；不做 generation_valid（含大量 cksum，WebUI 热路径过慢）
config_matches_applied() {
  # applied.conf 缺失时，仍可用 applied-certs.list 判断证书开关是否回到开机态
  if [ -f "$APPLIED_CONF" ]; then
    app_req=$(read_applied_conf reqable 1 | tr -d ' \t\r\n')
    app_pp=$(read_applied_conf proxypin 1 | tr -d ' \t\r\n')
    app_mm=$(read_applied_conf mount_mode compatible | tr 'A-Z' 'a-z' | tr -d ' \t\r\n')
    case "$app_mm" in magic|builtin|lightweight) app_mm=magic ;; *) app_mm=compatible ;; esac
    app_tf=$(read_applied_conf tmpfs_style dev | tr 'A-Z' 'a-z' | tr -d ' \t\r\n')
    case "$app_tf" in
      legacy|classic|verbose|long) app_tf=legacy ;;
      short|tmp) app_tf=short ;;
      mnt) app_tf=mnt ;;
      *) app_tf=dev ;;
    esac
    app_e14=$(read_applied_conf experimental_14_system skip | tr 'A-Z' 'a-z' | tr -d ' \t\r\n')
    case "$app_e14" in
      auto|off|default|follow|overlay|apex_overlay) app_e14=auto ;;
      *) app_e14=skip ;;
    esac
    app_bz=$(read_applied_conf boot_bind_zygote 0 | tr -d ' \t\r\n')
    app_ba=$(read_applied_conf boot_multi_apex 0 | tr -d ' \t\r\n')
  elif [ -s "$APPLIED_MAP" ]; then
    app_req=0
    app_pp=0
    grep -q '^reqable|' "$APPLIED_MAP" 2>/dev/null && app_req=1
    grep -q '^proxypin|' "$APPLIED_MAP" 2>/dev/null && app_pp=1
    # 无 applied.conf 时非证书项以当前值为准（只拦证书开关回转）
    app_mm=$(get_mount_mode)
    app_tf=$(get_tmpfs_style)
    app_e14=$(get_experimental_14_system)
    app_bz=$(read_conf boot_bind_zygote 0 | tr -d ' \t\r\n')
    app_ba=$(read_conf boot_multi_apex 0 | tr -d ' \t\r\n')
  else
    return 1
  fi

  cur_req=$(read_conf reqable 1 | tr -d ' \t\r\n')
  cur_pp=$(read_conf proxypin 1 | tr -d ' \t\r\n')
  cur_mm=$(get_mount_mode)
  cur_tf=$(get_tmpfs_style)
  cur_e14=$(get_experimental_14_system)
  cur_bz=$(read_conf boot_bind_zygote 0 | tr -d ' \t\r\n')
  cur_ba=$(read_conf boot_multi_apex 0 | tr -d ' \t\r\n')

  [ "$cur_req" = "$app_req" ] || return 1
  [ "$cur_pp" = "$app_pp" ] || return 1
  [ "$cur_mm" = "$app_mm" ] || return 1
  [ "$cur_tf" = "$app_tf" ] || return 1
  [ "$cur_e14" = "$app_e14" ] || return 1
  [ "$cur_bz" = "$app_bz" ] || return 1
  [ "$cur_ba" = "$app_ba" ] || return 1

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
