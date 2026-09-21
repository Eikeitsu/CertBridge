#!/system/bin/sh
# 配置读写
#
# 可变项写入 STATEDIR/user.conf（模块 data 下，热更新可保留），
# 避免直接改 config/certs.conf：部分机 / 热更新后该文件写成功但读回仍是旧值 → 误报 write_failed。

USER_CONF="${USER_CONF:-$STATEDIR/user.conf}"

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

_conf_set_in_file() {
  file="$1"
  key="$2"
  value="$3"
  dir=$(dirname "$file")
  mkdir -p "$dir" 2>/dev/null || return 1
  tmp="$dir/.write.$$.$(basename "$file").$key"
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
  if cat "$tmp" >"$file" 2>/dev/null; then
    rm -f "$tmp"
  elif cp -f "$tmp" "$file" 2>/dev/null; then
    rm -f "$tmp"
  elif mv -f "$tmp" "$file" 2>/dev/null; then
    :
  else
    rm -f "$tmp"
    return 1
  fi
  # 读回确认（同一文件）
  got=$(_conf_get_from_file "$file" "$key" | tr -d ' \t\r\n')
  [ "$got" = "$value" ]
}

read_conf() {
  key="$1"
  default="${2:-}"
  if val=$(_conf_get_from_file "$USER_CONF" "$key" 2>/dev/null); then
    printf '%s\n' "$val"
    return 0
  fi
  if val=$(_conf_get_from_file "$CONF" "$key" 2>/dev/null); then
    printf '%s\n' "$val"
    return 0
  fi
  printf '%s\n' "$default"
}

# 原子写配置：优先 user.conf；成功后再尽力镜像到模块 certs.conf（失败忽略）
write_conf() {
  key="$1"
  value="$2"
  case "$key" in
    reqable|proxypin|schema_version|mount_mode|tmpfs_style|quiet_prop|hot_allow|hide_allow|zn_hide_allow|experimental_14_system|force_bind_capture|late_inject|boot_bind_zygote|boot_multi_apex|service_probe)
      ;;
    *) return 1 ;;
  esac
  mkdir -p "$STATEDIR" 2>/dev/null || return 1
  USER_CONF="${USER_CONF:-$STATEDIR/user.conf}"
  _conf_set_in_file "$USER_CONF" "$key" "$value" || return 1
  # 镜像到模块模板，方便人眼查看；不作为成功条件
  if [ -n "$CONF" ] && [ -d "$(dirname "$CONF")" ]; then
    _conf_set_in_file "$CONF" "$key" "$value" 2>/dev/null || true
  fi
  return 0
}

# 生成生效快照用：模块模板 + user.conf 覆盖
snapshot_effective_conf() {
  dest="$1"
  [ -n "$dest" ] || return 1
  mkdir -p "$(dirname "$dest")" 2>/dev/null || return 1
  tmp="$STATEDIR/.effective.$$"
  if [ -f "$CONF" ]; then
    cp -f "$CONF" "$tmp" 2>/dev/null || cat "$CONF" >"$tmp" 2>/dev/null || : >"$tmp"
  else
    : >"$tmp"
  fi
  if [ -f "$USER_CONF" ]; then
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
    done <"$USER_CONF"
  fi
  chmod 0600 "$tmp" 2>/dev/null
  if cat "$tmp" >"$dest" 2>/dev/null || cp -f "$tmp" "$dest" 2>/dev/null || mv -f "$tmp" "$dest" 2>/dev/null; then
    rm -f "$tmp" "$tmp.new" 2>/dev/null
    return 0
  fi
  rm -f "$tmp" "$tmp.new" 2>/dev/null
  return 1
}

# WebUI 热路径：只打 pending，不做 generation_valid / 指纹扫描
note_conf_dirty() {
  # 永不因 pending 文件失败而中断调用方（部分环境 set -e）
  mark_reboot_required || true
  echo "reboot_required=1"
  return 0
}

is_enabled() {
  [ "$(read_conf "$1" "1")" = "1" ]
}

# compatible = 完整兼容：运行时整库 bind，不依赖 Magic Mount / 元模块（Magisk/KSU/APatch 均可用）
# magic     = 轻量 Magic Mount：模块 system/ 仅叠 addon（依赖管理器叠层；KSU 常需元模块）；34+ 仍 bind APEX
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

# 实验项：Android 14+ 是否跳过 system（compatible / magic 均生效；7–13 忽略——无 APEX 时仍须动 system）
#   auto = 按 mount_mode 处理 system（compatible 脚本 bind；magic Magic Mount 叠 addon）
#   skip = 默认：跳过 system，仅脚本 bind APEX（不 bind、不叠层）
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

# 启动时迁旧键、统一为 auto|skip（缺省写 skip）
# 已规范化则只读返回，避免与 WebUI toggle 并发写 conf 造成 readback 失败
migrate_experimental_14_system_conf() {
  [ -f "$CONF" ] || [ -f "$USER_CONF" ] || return 0
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

# Android 14+ 且 skip：任何模式都不对 system 脚本 bind。
# 否则：magic 不 bind；compatible 整库 bind。
binds_system_cacerts() {
  if [ "$(get_api)" -ge 34 ] && [ "$(get_experimental_14_system)" = "skip" ]; then
    return 1
  fi
  is_magic_mount_mode && return 1
  return 0
}

# late_inject=0：service 几乎空跑（不 namespaces / 不退避 / 不 heal）
# service_probe 仅在 late_inject=1 时决定是否做退避校验与延迟 heal
service_should_probe() {
  [ "$(read_conf late_inject 0)" = "1" ] || return 1
  [ "$(read_conf service_probe 0)" = "1" ]
}

# Android 14+ 且 skip：清空 system 叠层（magic 也不叠）。
# 否则：仅 magic 同步 addon 叠层；compatible 清空（改走 bind）。
needs_system_magic_overlay() {
  if [ "$(get_api)" -ge 34 ] && [ "$(get_experimental_14_system)" = "skip" ]; then
    return 1
  fi
  is_magic_mount_mode && return 0
  return 1
}

# mnt    = /mnt/.ca0 | .ca1（/mnt 下短名临时层）
# dev    = /dev/.fs0 | .fs1（默认；避开 local/tmp 关键词，且无品牌路径前缀）
# short  = /data/local/tmp/.fs0 | .fs1
# legacy = /data/local/tmp/sys-ca-merge | sys-ca-merge-hot（可读旧路径）
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
  case "$(read_conf quiet_prop 1 | tr 'A-Z' 'a-z')" in
    0|false|no|off) return 1 ;;
    *) return 0 ;;
  esac
}
