#!/system/bin/sh
# 升级时保留用户核心配置（运行时以 /data/adb/certbridge/user.conf 为准）
#
# 预留不兼容重置：将 CERTBRIDGE_CONF_RESET_BELOW 设为 N（正整数）后，
# 若旧配置 schema_version < N，则跳过迁移、使用新包模板（全新安装行为）。
# 当前默认 0 = 永不因版本强制重置。

CERTBRIDGE_CONF_RESET_BELOW="${CERTBRIDGE_CONF_RESET_BELOW:-0}"

# 始终尝试保留的行为向配置（与本次音量键「装不装组件」无关）
certbridge_preserve_keys_core() {
  printf '%s\n' \
    mount_mode \
    tmpfs_style \
    experimental_14_system \
    quiet_prop \
    force_bind_capture \
    late_inject \
    boot_bind_zygote \
    boot_multi_apex \
    service_probe \
    ui_lang
}

# 默认安装时额外保留（自定义安装以本次音量键为准）
certbridge_preserve_keys_default_install() {
  printf '%s\n' reqable proxypin
}

# 仅当本次仍安装对应组件时保留
certbridge_preserve_keys_component() {
  printf '%s\n' hot_allow hide_allow zn_hide_allow
}

certbridge_preserve_snap_dir() {
  echo "${CB_EXT_DIR:-/data/adb/certbridge}/.upgrade-snapshot"
}

# 安装一开始调用：在写新模板前拍下旧 conf，避免部分管理器原地覆盖后丢失来源
certbridge_install_snapshot_for_upgrade() {
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  _snap=$(certbridge_preserve_snap_dir)
  mkdir -p "$CB_EXT_DIR" "$_snap" 2>/dev/null || true
  rm -f "$_snap/certs.conf" "$_snap/user.conf" "$_snap/state-user.conf" \
    "$_snap/module.prop" "$_snap/version.txt" 2>/dev/null || true

  CERTBRIDGE_IS_UPGRADE=0
  for _old in /data/adb/modules/CertBridge /data/adb/modules_update/CertBridge; do
    if [ -f "$_old/config/certs.conf" ]; then
      cp -f "$_old/config/certs.conf" "$_snap/certs.conf" 2>/dev/null || true
      [ -f "$_old/module.prop" ] && cp -f "$_old/module.prop" "$_snap/module.prop" 2>/dev/null || true
      [ -f "$_old/data/state/user.conf" ] && \
        cp -f "$_old/data/state/user.conf" "$_snap/state-user.conf" 2>/dev/null || true
      CERTBRIDGE_IS_UPGRADE=1
      break
    fi
  done
  if [ -f "$CB_EXT_DIR/user.conf" ]; then
    cp -f "$CB_EXT_DIR/user.conf" "$_snap/user.conf" 2>/dev/null || true
    CERTBRIDGE_IS_UPGRADE=1
  fi
  export CERTBRIDGE_IS_UPGRADE
  if [ "$CERTBRIDGE_IS_UPGRADE" = "1" ]; then
    log_info "install: upgrade snapshot → $_snap" 2>/dev/null || true
  fi
}

# 预留：schema 过旧则不迁移（当前 CONF_RESET_BELOW=0 永不触发）
certbridge_conf_should_reset() {
  _below="${CERTBRIDGE_CONF_RESET_BELOW:-0}"
  case "$_below" in
    ''|0|*[!0-9]*) return 1 ;;
  esac
  _snap=$(certbridge_preserve_snap_dir)
  _old_schema=0
  for _f in "$_snap/user.conf" "$_snap/certs.conf" "$_snap/state-user.conf" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/user.conf"; do
    [ -f "$_f" ] || continue
    _v=$(awk -F= '$1 == "schema_version" {
      sub(/^[^=]*=/, ""); gsub(/\r/, ""); print; exit
    }' "$_f" 2>/dev/null)
    case "$_v" in
      ''|*[!0-9]*) continue ;;
      *)
        _old_schema=$_v
        break
        ;;
    esac
  done
  [ "$_old_schema" -lt "$_below" ] 2>/dev/null
}

_certbridge_preserve_get() {
  _key="$1"
  _snap=$(certbridge_preserve_snap_dir)
  # 优先外置 user.conf 快照（运行时真源），再旧模块 conf
  for _f in \
    "$_snap/user.conf" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/user.conf" \
    "$_snap/state-user.conf" \
    "$_snap/certs.conf"; do
    [ -f "$_f" ] || continue
    _val=$(awk -F= -v key="$_key" '
      $1 == key {
        sub(/^[^=]*=/, "")
        gsub(/\r/, "")
        print
        exit
      }
    ' "$_f" 2>/dev/null)
    if [ -n "$_val" ]; then
      printf '%s\n' "$_val"
      return 0
    fi
  done
  return 1
}

_certbridge_preserve_put_file() {
  _file="$1"
  _key="$2"
  _value="$3"
  _dir=$(dirname "$_file")
  mkdir -p "$_dir" 2>/dev/null || return 1
  _tmp="$_dir/.preserve.$$.$_key"
  if [ -f "$_file" ]; then
    awk -F= -v key="$_key" -v value="$_value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$_file" >"$_tmp" 2>/dev/null || {
      rm -f "$_tmp"
      return 1
    }
  else
    printf '%s=%s\n' "$_key" "$_value" >"$_tmp" 2>/dev/null || return 1
  fi
  mv -f "$_tmp" "$_file" 2>/dev/null || {
    rm -f "$_tmp"
    return 1
  }
  return 0
}

# 默认安装升级：把旧 mount/开关写回 INSTALL_*，让 write_config / Magic 叠层用对值
# 自定义安装不改 INSTALL_*（音量键为准）；core 键仍由 preserve_user 合并
certbridge_install_restore_install_vars() {
  [ "${CERTBRIDGE_IS_UPGRADE:-0}" = "1" ] || return 0
  if certbridge_conf_should_reset; then
    return 0
  fi
  [ "${INSTALL_MODE:-}" = "custom" ] && return 0

  _m=$(_certbridge_preserve_get mount_mode) || true
  case "$_m" in
    magic|compatible) INSTALL_MOUNT_MODE="$_m" ;;
  esac
  _r=$(_certbridge_preserve_get reqable) || true
  case "$_r" in
    0|1) INSTALL_REQABLE="$_r" ;;
  esac
  _p=$(_certbridge_preserve_get proxypin) || true
  case "$_p" in
    0|1) INSTALL_PROXYPIN="$_p" ;;
  esac
  if [ "${INSTALL_HIDE:-0}" = "1" ]; then
    _h=$(_certbridge_preserve_get hide_allow) || true
    case "$_h" in
      0|1) INSTALL_HIDE_ALLOW="$_h" ;;
    esac
  fi
  if [ "${INSTALL_ZN_HIDE:-0}" = "1" ]; then
    _z=$(_certbridge_preserve_get zn_hide_allow) || true
    case "$_z" in
      0|1) INSTALL_ZN_HIDE_ALLOW="$_z" ;;
    esac
  fi
  export INSTALL_MOUNT_MODE INSTALL_REQABLE INSTALL_PROXYPIN \
    INSTALL_HIDE_ALLOW INSTALL_ZN_HIDE_ALLOW
  log_info "install: restored install vars from snapshot (mount=$INSTALL_MOUNT_MODE)" \
    2>/dev/null || true
}

_certbridge_preserve_apply_key() {
  _key="$1"
  _val=$(_certbridge_preserve_get "$_key") || return 1
  [ -n "$_val" ] || return 1

  case "$_key" in
    hot_allow)
      [ "${INSTALL_HOT:-0}" = "1" ] || return 1
      # 自定义安装：本次向导写入的 hot_allow=1 为准
      [ "${INSTALL_MODE:-}" = "custom" ] && return 1
      ;;
    hide_allow)
      [ "${INSTALL_HIDE:-0}" = "1" ] || return 1
      [ "${INSTALL_MODE:-}" = "custom" ] && return 1
      ;;
    zn_hide_allow)
      [ "${INSTALL_ZN_HIDE:-0}" = "1" ] || return 1
      [ "${INSTALL_MODE:-}" = "custom" ] && return 1
      ;;
    mount_mode|reqable|proxypin)
      # 已由 restore_install_vars + write_config 处理；此处再写一次作兜底
      if [ "${INSTALL_MODE:-}" = "custom" ]; then
        return 1
      fi
      ;;
  esac

  _uc="${CB_EXT_DIR:-/data/adb/certbridge}/user.conf"
  _certbridge_preserve_put_file "$_uc" "$_key" "$_val" || true
  chmod 0600 "$_uc" 2>/dev/null || true
  if [ -n "${MODPATH:-}" ] && [ -d "$MODPATH/config" ]; then
    _certbridge_preserve_put_file "$MODPATH/config/certs.conf" "$_key" "$_val" || true
    mkdir -p "$MODPATH/data/state" 2>/dev/null || true
    cp -f "$_uc" "$MODPATH/data/state/user.conf" 2>/dev/null || true
  fi
  return 0
}

# 升级时保留用户证书与关键状态，并把核心 conf 写回外置 user.conf
certbridge_install_preserve_user() {
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  OLD_MOD="/data/adb/modules/CertBridge"
  _snap=$(certbridge_preserve_snap_dir)

  # 路径类数据：旧模块 → 新包（不覆盖已有文件）
  if [ -d "$OLD_MOD" ] && [ -n "${MODPATH:-}" ] && [ -f "${LIBDIR:-}/hot_update.sh" ]; then
    # shellcheck disable=SC1090,SC1091
    . "$LIBDIR/hot_update.sh"
    hot_update_preserve_paths "$OLD_MOD" "$MODPATH" \
      certs/custom \
      certs/sources \
      certs/generation/current \
      data/state/addon-sources \
      data/state/source-stash \
      data/state/user.conf \
      data/state/addon-sources.migrated \
      data/state/applied-certs.list \
      data/state/applied.conf \
      data/state/hide-assist.conf \
      data/state/source.meta \
      config/zn_whitelist.txt
    if [ -f "$MODPATH/bin/common.sh" ]; then
      (
        MODDIR="$MODPATH"
        # shellcheck disable=SC1090,SC1091
        . "$MODPATH/bin/common.sh" 2>/dev/null || exit 0
        certbridge_seed_ext_from_module "$OLD_MOD" 2>/dev/null || true
        certbridge_seed_ext_from_module "$MODPATH" 2>/dev/null || true
      ) || true
    fi
  fi

  if [ "${CERTBRIDGE_IS_UPGRADE:-0}" != "1" ] && \
      [ ! -f "$_snap/certs.conf" ] && [ ! -f "$_snap/user.conf" ]; then
    return 0
  fi

  if certbridge_conf_should_reset; then
    ui_print "- 配置 schema 过旧，跳过迁移（使用新模板）"
    log_info "install: conf reset (schema < ${CERTBRIDGE_CONF_RESET_BELOW})" 2>/dev/null || true
    return 0
  fi

  _restored=0
  while IFS= read -r _k; do
    [ -n "$_k" ] || continue
    if _certbridge_preserve_apply_key "$_k"; then
      _restored=$((_restored + 1))
    fi
  done <<EOF
$(certbridge_preserve_keys_core)
$(certbridge_preserve_keys_default_install)
$(certbridge_preserve_keys_component)
EOF

  if [ "$_restored" -gt 0 ] 2>/dev/null; then
    ui_print "- 已保留 $_restored 项用户配置"
    log_info "install: preserved $_restored conf keys → user.conf" 2>/dev/null || true
  fi
}
