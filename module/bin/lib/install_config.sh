#!/system/bin/sh
# 由 install_flow 加载；安装阶段专用
# 写 certs.conf 与组件裁剪
#
# Magisk 模块目录上 sed -i 偶发打出「大段 NUL + 尾部文本」；
# 凡写 $MODPATH/config/*.conf 与外置 user.conf 一律 awk→tmp→mv。

# 将 key=value 原子写入任意 conf（文件可尚不存在）
_certbridge_install_uc_put() {
  _uc_file="$1"
  _uc_key="$2"
  _uc_val="$3"
  mkdir -p "$(dirname "$_uc_file")" 2>/dev/null || true
  if [ -f "$_uc_file" ]; then
    awk -F= -v key="$_uc_key" -v value="$_uc_val" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$_uc_file" >"$_uc_file.tmp" 2>/dev/null && mv -f "$_uc_file.tmp" "$_uc_file"
  else
    printf '%s=%s\n' "$_uc_key" "$_uc_val" >"$_uc_file"
  fi
  chmod 0600 "$_uc_file" 2>/dev/null || true
}

_certbridge_install_uc_del() {
  _uc_file="$1"
  _uc_key="$2"
  [ -f "$_uc_file" ] || return 0
  awk -F= -v key="$_uc_key" '$1 != key { print }' "$_uc_file" >"$_uc_file.tmp" 2>/dev/null && \
    mv -f "$_uc_file.tmp" "$_uc_file"
  chmod 0600 "$_uc_file" 2>/dev/null || true
}

certbridge_install_write_config() {
  _cfg="$MODPATH/config/certs.conf"
  _certbridge_install_uc_put "$_cfg" reqable "$INSTALL_REQABLE"
  _certbridge_install_uc_put "$_cfg" proxypin "$INSTALL_PROXYPIN"
  # 安装选项同步到模块外 user.conf（与运行时 write_conf 同路径）
  mkdir -p /data/adb/certbridge "$MODPATH/data/state" 2>/dev/null || true
  _uc="/data/adb/certbridge/user.conf"
  if [ ! -f "$_uc" ] && [ -f "$MODPATH/data/state/user.conf" ]; then
    cp -f "$MODPATH/data/state/user.conf" "$_uc" 2>/dev/null || true
  fi
  _certbridge_install_uc_put "$_uc" reqable "$INSTALL_REQABLE"
  _certbridge_install_uc_put "$_uc" proxypin "$INSTALL_PROXYPIN"
  _certbridge_install_uc_put "$_uc" mount_mode "$INSTALL_MOUNT_MODE"
  cp -f "$_uc" "$MODPATH/data/state/user.conf" 2>/dev/null || true
  _certbridge_install_uc_put "$_cfg" mount_mode "$INSTALL_MOUNT_MODE"
  _certbridge_install_uc_put "$_cfg" schema_version 4
  if ! grep -q '^tmpfs_style=' "$_cfg" 2>/dev/null; then
    _certbridge_install_uc_put "$_cfg" tmpfs_style dev
  fi
  if ! grep -q '^quiet_prop=' "$_cfg" 2>/dev/null; then
    _certbridge_install_uc_put "$_cfg" quiet_prop 0
  fi
  # 旧键迁移 / 缺省实验项
  if grep -q '^experimental_14_apex_only=' "$_cfg" 2>/dev/null && \
      ! grep -q '^experimental_14_system=' "$_cfg" 2>/dev/null; then
    case "$(awk -F= '$1=="experimental_14_apex_only"{print $2; exit}' "$_cfg" | tr 'A-Z' 'a-z')" in
      1|true|yes|on) _certbridge_install_uc_put "$_cfg" experimental_14_system skip ;;
      *) _certbridge_install_uc_put "$_cfg" experimental_14_system skip ;;
    esac
  fi
  # 旧值归一
  if grep -qE '^experimental_14_system=(off|overlay|default|follow)' "$_cfg" 2>/dev/null; then
    _certbridge_install_uc_put "$_cfg" experimental_14_system auto
  fi
  if grep -qE '^experimental_14_system=(none|apex_only)' "$_cfg" 2>/dev/null; then
    _certbridge_install_uc_put "$_cfg" experimental_14_system skip
  fi
  if ! grep -q '^experimental_14_system=' "$_cfg" 2>/dev/null; then
    _certbridge_install_uc_put "$_cfg" experimental_14_system skip
  fi
  if grep -q '^experimental_14_apex_only=' "$_cfg" 2>/dev/null; then
    _certbridge_install_uc_del "$_cfg" experimental_14_apex_only
  fi
  if [ "$INSTALL_HOT" = "1" ]; then
    _certbridge_install_uc_put "$_cfg" hot_allow 1
    # 默认安装升级时 preserve 会再写回用户旧值；此处先落模板默认
    _certbridge_install_uc_put "$_uc" hot_allow 1
  else
    _certbridge_install_uc_del "$_uc" hot_allow
  fi
  if [ "$INSTALL_HIDE" = "1" ]; then
    _certbridge_install_uc_put "$_cfg" hide_allow "$INSTALL_HIDE_ALLOW"
    _certbridge_install_uc_put "$_uc" hide_allow "$INSTALL_HIDE_ALLOW"
  else
    # 未安装隐藏组件：不保留 hide_allow，避免误导
    _certbridge_install_uc_del "$_cfg" hide_allow
    _certbridge_install_uc_del "$_uc" hide_allow
    rm -f "$MODPATH/data/state/hide-assist.conf" 2>/dev/null
  fi
  if [ "$INSTALL_ZN_HIDE" = "1" ]; then
    _certbridge_install_uc_put "$_cfg" zn_hide_allow "$INSTALL_ZN_HIDE_ALLOW"
    _certbridge_install_uc_put "$_uc" zn_hide_allow "$INSTALL_ZN_HIDE_ALLOW"
  else
    _certbridge_install_uc_del "$_cfg" zn_hide_allow
    _certbridge_install_uc_del "$_uc" zn_hide_allow
  fi
  chmod 0600 "$_uc" 2>/dev/null || true
  cp -f "$_uc" "$MODPATH/data/state/user.conf" 2>/dev/null || true
  cat >"$MODPATH/config/install-profile.conf" <<EOF
install_mode=$INSTALL_MODE
webui=$INSTALL_WEBUI
hot_reload=$INSTALL_HOT
hide_assist=$INSTALL_HIDE
zn_hide=$INSTALL_ZN_HIDE
mount_mode=$INSTALL_MOUNT_MODE
reqable_source=$([ "$REQABLE_SRC_OK" = "1" ] && echo app || echo none)
proxypin_source=$PROXYPIN_SRC
EOF
  MODDIR="$MODPATH"
  CONFDIR="$MODPATH/config"
  CONF="$CONFDIR/certs.conf"
  STATEDIR="$MODPATH/data/state"
  CERT_POOL="$MODPATH/certs"
  CUSTOM_DIR="$CERT_POOL/custom"
  BUILTIN_DIR="$CERT_POOL/builtin"
  SOURCES_DIR="${CB_EXT_DIR:-/data/adb/certbridge}/addon-sources"
  mkdir -p "$SOURCES_DIR/reqable" "$SOURCES_DIR/proxypin" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/source-stash/reqable" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/source-stash/proxypin" 2>/dev/null || true
  mkdir -p "$MODPATH/data/state/addon-sources/reqable" "$MODPATH/data/state/addon-sources/proxypin" 2>/dev/null || true
  GEN_CERTS="$CERT_POOL/generation/current/cacerts"
  APPLIED_MAP="$STATEDIR/applied-certs.list"
  mkdir -p "$STATEDIR"
  # 按最终 conf（含 experimental_14_system）准备 system 叠层
  prepare_mount_mode_overlay "$MODPATH" >/dev/null 2>&1 || true
}

certbridge_install_trim_components() {
  if [ "$INSTALL_WEBUI" != "1" ]; then
    rm -rf "$MODPATH/webroot"
  fi
  if [ "$INSTALL_HOT" != "1" ]; then
    rm -f "$MODPATH/bin/hot_mount.sh"
    rm -rf "$MODPATH/bin/lib/hot"
  fi
  if [ "$INSTALL_HIDE" != "1" ]; then
    rm -f "$MODPATH/bin/lib/hide_assist.sh"
    rm -f "$MODPATH/bin/lib/hide_actions.sh"
    rm -f "$MODPATH/bin/lib/hide_probe.sh"
    rm -f "$MODPATH/bin/lib/hide_clear.sh"
    rm -f "$MODPATH/bin/lib/hide_register.sh"
    rm -f "$MODPATH/bin/lib/hide_status.sh"
    rm -f "$MODPATH/data/state/hide-assist.conf" 2>/dev/null
  fi
  if [ "$INSTALL_ZN_HIDE" != "1" ]; then
    rm -rf "$MODPATH/zygisk"
    rm -f "$MODPATH/zn_modules.txt" 2>/dev/null
    rm -f "$MODPATH/libcb_zn_hide.so" 2>/dev/null
  else
    # 禁止空壳：空或仅空白的 zn_modules.txt 一律删除
    if [ -f "$MODPATH/zn_modules.txt" ]; then
      if ! grep -q '[^[:space:]]' "$MODPATH/zn_modules.txt" 2>/dev/null; then
        rm -f "$MODPATH/zn_modules.txt"
      fi
    fi
    # 勾选但 zip 未带 so：安装后无法生效，给出提示（不阻断）
    zn_so=0
    if [ -d "$MODPATH/zygisk" ]; then
      for f in "$MODPATH/zygisk"/*.so; do
        [ -f "$f" ] && zn_so=1 && break
      done
    fi
    if [ "$zn_so" != "1" ]; then
      ui_print "! 警告：已勾选 Zygisk 过滤，但模块包内无 zygisk/*.so"
      ui_print "  请使用含 NDK 构建产物的正式发布包"
    fi
  fi
}
