#!/system/bin/sh
# 配置读写

read_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

write_conf() {
  key="$1"
  value="$2"
  case "$key" in reqable|proxypin|schema_version|mount_mode|tmpfs_style) ;; *) return 1 ;; esac
  mkdir -p "$CONFDIR" 2>/dev/null
  tmp="$CONF.tmp.$$"
  if [ -f "$CONF" ]; then
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$CONF" >"$tmp" || return 1
  else
    echo "$key=$value" >"$tmp" || return 1
  fi
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$CONF"
}

is_enabled() {
  [ "$(read_conf "$1" "1")" = "1" ]
}

# compatible = 完整兼容（运行时整库 bind，默认）
# magic     = 轻量 Magic Mount（模块 system/ 仅叠 addon 证书）
get_mount_mode() {
  mode=$(read_conf mount_mode compatible | tr 'A-Z' 'a-z')
  case "$mode" in
    magic|builtin|lightweight) echo magic ;;
    *) echo compatible ;;
  esac
}

is_magic_mount_mode() {
  [ "$(get_mount_mode)" = "magic" ]
}

# short  = /data/local/tmp/.fs0 | .fs1（默认，降低 mountinfo 关键词特征）
# legacy = /data/local/tmp/sys-ca-merge | sys-ca-merge-hot（可读旧路径）
get_tmpfs_style() {
  style=$(read_conf tmpfs_style short | tr 'A-Z' 'a-z')
  case "$style" in
    legacy|classic|verbose|long) echo legacy ;;
    *) echo short ;;
  esac
}

apply_tmpfs_style() {
  case "$(get_tmpfs_style)" in
    legacy)
      RUNTIME_MOUNT_ROOT="/data/local/tmp/sys-ca-merge"
      HOT_RUNTIME_ROOT="/data/local/tmp/sys-ca-merge-hot"
      ;;
    *)
      RUNTIME_MOUNT_ROOT="/data/local/tmp/.fs0"
      HOT_RUNTIME_ROOT="/data/local/tmp/.fs1"
      ;;
  esac
}
