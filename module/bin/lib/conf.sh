#!/system/bin/sh
# 配置读写

read_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

# 原子写配置：同目录临时文件 + cat 落盘（避免跨挂载点 mv 失败导致 write_failed）
write_conf() {
  key="$1"
  value="$2"
  case "$key" in
    reqable|proxypin|schema_version|mount_mode|tmpfs_style|quiet_prop|hot_allow|hide_allow|zn_hide_allow|experimental_14_system|force_bind_capture)
      ;;
    *) return 1 ;;
  esac
  mkdir -p "$CONFDIR" 2>/dev/null || return 1
  tmp="$CONFDIR/.write.$$.$key"
  if [ -f "$CONF" ]; then
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$CONF" >"$tmp" 2>/dev/null || { rm -f "$tmp"; return 1; }
  else
    printf '%s=%s\n' "$key" "$value" >"$tmp" 2>/dev/null || return 1
  fi
  chmod 0600 "$tmp" 2>/dev/null
  # 优先同卷 cat 覆盖；失败再尝试 mv
  if cat "$tmp" >"$CONF" 2>/dev/null; then
    rm -f "$tmp"
    return 0
  fi
  if mv -f "$tmp" "$CONF" 2>/dev/null; then
    return 0
  fi
  rm -f "$tmp"
  return 1
}

# WebUI 热路径：只打 pending，不做 generation_valid / 指纹扫描
note_conf_dirty() {
  mark_reboot_required
  echo "reboot_required=1"
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
migrate_experimental_14_system_conf() {
  [ -f "$CONF" ] || return 0
  if ! grep -q '^experimental_14_system=' "$CONF" 2>/dev/null; then
    write_conf experimental_14_system skip 2>/dev/null || true
  else
    case "$(read_conf experimental_14_system skip | tr 'A-Z' 'a-z')" in
      off|default|follow|overlay|apex_overlay)
        write_conf experimental_14_system auto 2>/dev/null || true
        ;;
      none|off_system|apex_only)
        write_conf experimental_14_system skip 2>/dev/null || true
        ;;
    esac
  fi
  if grep -q '^experimental_14_apex_only=' "$CONF" 2>/dev/null; then
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
