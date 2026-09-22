#!/system/bin/sh
# 配置读写
#
# 可变项写入 /data/adb/certbridge/user.conf（模块目录外）。
# 模块内 config/ 与 data/state/ 在部分机热更新后会出现「写成功但读回旧值」。

USER_CONF="${USER_CONF:-${CB_EXT_DIR:-/data/adb/certbridge}/user.conf}"
USER_CONF_LEGACY="${USER_CONF_LEGACY:-$STATEDIR/user.conf}"

_conf_get_from_file() {
  file="$1"
  key="$2"
  [ -f "$file" ] || return 1
  val=$(awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "")
      gsub(/\r/, "")
      print
      exit
    }
  ' "$file" 2>/dev/null)
  [ -n "$val" ] || return 1
  printf '%s\n' "$val"
}

# 写入并读回校验；优先 cp
_conf_set_in_file() {
  file="$1"
  key="$2"
  value="$3"
  dir=$(dirname "$file")
  mkdir -p "$dir" 2>/dev/null || return 1
  tmp="$dir/.cb_write.$$.$key"
  if [ -f "$file" ]; then
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$file" >"$tmp" 2>/dev/null || { rm -f "$tmp"; return 1; }
  else
    printf '%s=%s\n' "$key" "$value" >"$tmp" 2>/dev/null || return 1
  fi
  chmod 0600 "$tmp" 2>/dev/null
  wrote=0
  if cp -f "$tmp" "$file" 2>/dev/null; then
    wrote=1
  elif cat "$tmp" >"$file" 2>/dev/null; then
    wrote=1
  elif mv -f "$tmp" "$file" 2>/dev/null; then
    wrote=1
    tmp=""
  fi
  rm -f "$tmp" 2>/dev/null
  [ "$wrote" = "1" ] || return 1
  got=$(_conf_get_from_file "$file" "$key" | tr -d ' \t\r\n')
  [ "$got" = "$value" ] && return 0
  grep -q "^${key}=${value}$" "$file" 2>/dev/null
}

read_conf() {
  key="$1"
  default="${2:-}"
  USER_CONF="${USER_CONF:-${CB_EXT_DIR:-/data/adb/certbridge}/user.conf}"
  USER_CONF_LEGACY="${USER_CONF_LEGACY:-$STATEDIR/user.conf}"
  if val=$(_conf_get_from_file "$USER_CONF" "$key" 2>/dev/null); then
    printf '%s\n' "$val"
    return 0
  fi
  if val=$(_conf_get_from_file "$USER_CONF_LEGACY" "$key" 2>/dev/null); then
    printf '%s\n' "$val"
    return 0
  fi
  if val=$(_conf_get_from_file "$CONF" "$key" 2>/dev/null); then
    printf '%s\n' "$val"
    return 0
  fi
  printf '%s\n' "$default"
}

# 只信任模块外 user.conf；开关热路径绝不写模块树（叠层假写/卡死）
write_conf() {
  key="$1"
  value="$2"
  case "$key" in
    reqable|proxypin|schema_version|mount_mode|tmpfs_style|quiet_prop|hot_allow|hide_allow|zn_hide_allow|experimental_14_system|force_bind_capture|late_inject|boot_bind_zygote|boot_multi_apex|service_probe|ui_lang)
      ;;
    *) return 1 ;;
  esac
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  USER_CONF="$CB_EXT_DIR/user.conf"
  mkdir -p "$CB_EXT_DIR" 2>/dev/null || return 1
  _conf_set_in_file "$USER_CONF" "$key" "$value" || return 1
  return 0
}

# 生成生效快照用：模块模板 + user.conf 覆盖
snapshot_effective_conf() {
  dest="$1"
  [ -n "$dest" ] || return 1
  mkdir -p "$(dirname "$dest")" 2>/dev/null || return 1
  tmp="${STATEDIR:-/data/local/tmp}/.effective.$$"
  if [ -f "$CONF" ]; then
    cp -f "$CONF" "$tmp" 2>/dev/null || cat "$CONF" >"$tmp" 2>/dev/null || : >"$tmp"
  else
    : >"$tmp"
  fi
  for _uc in "$USER_CONF" "$USER_CONF_LEGACY"; do
    [ -f "$_uc" ] || continue
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
      ' "$tmp" >"$tmp.new" 2>/dev/null && mv -f "$tmp.new" "$tmp"
    done <"$_uc"
  done
  chmod 0600 "$tmp" 2>/dev/null
  if cp -f "$tmp" "$dest" 2>/dev/null || cat "$tmp" >"$dest" 2>/dev/null || mv -f "$tmp" "$dest" 2>/dev/null; then
    rm -f "$tmp" "$tmp.new" 2>/dev/null
    return 0
  fi
  rm -f "$tmp" "$tmp.new" 2>/dev/null
  return 1
}

# 写配置后：与开机 applied 快照比对；改回原值则清除待重启
# stdout: reboot_required= / pending_reboot=（见 update_reboot_required_flag）
note_conf_dirty() {
  update_reboot_required_flag
}

is_enabled() {
  [ "$(read_conf "$1" "1")" = "1" ]
}

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

get_experimental_14_system() {
  val=$(read_conf experimental_14_system "" | tr 'A-Z' 'a-z')
  if [ -z "$val" ]; then
    echo skip
    return 0
  fi
  case "$val" in
    skip|none|off_system|apex_only) echo skip ;;
    auto|off|default|follow|overlay|apex_overlay) echo auto ;;
    *) echo skip ;;
  esac
}

migrate_experimental_14_system_conf() {
  [ -f "$CONF" ] || [ -f "$USER_CONF" ] || [ -f "$USER_CONF_LEGACY" ] || return 0
  need_write=0
  cur=$(read_conf experimental_14_system "")
  if [ -z "$cur" ]; then
    need_write=1
  else
    case "$(printf '%s' "$cur" | tr 'A-Z' 'a-z')" in
      off|default|follow|overlay|apex_overlay|none|off_system|apex_only)
        need_write=1
        ;;
    esac
  fi
  drop_legacy=0
  [ -f "$CONF" ] && grep -q '^experimental_14_apex_only=' "$CONF" 2>/dev/null && drop_legacy=1
  [ "$need_write" = "1" ] || [ "$drop_legacy" = "1" ] || return 0

  if [ "$need_write" = "1" ]; then
    if [ -z "$cur" ]; then
      write_conf experimental_14_system skip 2>/dev/null || true
    else
      case "$(printf '%s' "$cur" | tr 'A-Z' 'a-z')" in
        off|default|follow|overlay|apex_overlay)
          write_conf experimental_14_system auto 2>/dev/null || true
          ;;
        none|off_system|apex_only)
          write_conf experimental_14_system skip 2>/dev/null || true
          ;;
      esac
    fi
  fi
  if [ "$drop_legacy" = "1" ] && [ -f "$CONF" ]; then
    tmp="$CONFDIR/.migrate-exp14.$$"
    awk -F= '$1 != "experimental_14_apex_only" { print }' "$CONF" >"$tmp" 2>/dev/null && \
      cat "$tmp" >"$CONF" 2>/dev/null
    rm -f "$tmp"
  fi
  return 0
}

binds_system_cacerts() {
  if [ "$(get_api)" -ge 34 ] && [ "$(get_experimental_14_system)" = "skip" ]; then
    return 1
  fi
  is_magic_mount_mode && return 1
  return 0
}

service_should_probe() {
  [ "$(read_conf late_inject 0)" = "1" ] || return 1
  [ "$(read_conf service_probe 0)" = "1" ]
}

needs_system_magic_overlay() {
  if [ "$(get_api)" -ge 34 ] && [ "$(get_experimental_14_system)" = "skip" ]; then
    return 1
  fi
  is_magic_mount_mode && return 0
  return 1
}

get_tmpfs_style() {
  style=$(read_conf tmpfs_style dev | tr 'A-Z' 'a-z')
  case "$style" in
    legacy|classic|verbose|long) echo legacy ;;
    short|tmp) echo short ;;
    mnt) echo mnt ;;
    *) echo dev ;;
  esac
}

apply_tmpfs_style() {
  case "$(get_tmpfs_style)" in
    legacy)
      RUNTIME_MOUNT_ROOT="/data/local/tmp/sys-ca-merge"
      HOT_RUNTIME_ROOT="/data/local/tmp/sys-ca-merge-hot"
      ;;
    short)
      RUNTIME_MOUNT_ROOT="/data/local/tmp/.fs0"
      HOT_RUNTIME_ROOT="/data/local/tmp/.fs1"
      ;;
    mnt)
      RUNTIME_MOUNT_ROOT="/mnt/.ca0"
      HOT_RUNTIME_ROOT="/mnt/.ca1"
      ;;
    *)
      RUNTIME_MOUNT_ROOT="/dev/.fs0"
      HOT_RUNTIME_ROOT="/dev/.fs1"
      ;;
  esac
}

is_quiet_prop() {
  case "$(read_conf quiet_prop 0 | tr 'A-Z' 'a-z')" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}
