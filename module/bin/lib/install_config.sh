#!/system/bin/sh
# 由 install_flow 加载；安装阶段专用
# 写 certs.conf 与组件裁剪
certbridge_install_write_config() {
  sed -i "s/^reqable=.*/reqable=$INSTALL_REQABLE/" "$MODPATH/config/certs.conf"
  sed -i "s/^proxypin=.*/proxypin=$INSTALL_PROXYPIN/" "$MODPATH/config/certs.conf"
  # 安装选项同步到 user.conf，避免旧开关覆盖本次安装选择
  mkdir -p "$MODPATH/data/state" 2>/dev/null || true
  _uc="$MODPATH/data/state/user.conf"
  {
    if [ -f "$_uc" ]; then
      awk -F= -v rq="$INSTALL_REQABLE" -v pp="$INSTALL_PROXYPIN" '
        $1 == "reqable" { print "reqable=" rq; rqdone=1; next }
        $1 == "proxypin" { print "proxypin=" pp; ppdone=1; next }
        { print }
        END {
          if (!rqdone) print "reqable=" rq
          if (!ppdone) print "proxypin=" pp
        }
      ' "$_uc"
    else
      printf 'reqable=%s\nproxypin=%s\n' "$INSTALL_REQABLE" "$INSTALL_PROXYPIN"
    fi
  } >"$_uc.tmp" 2>/dev/null && mv -f "$_uc.tmp" "$_uc"
  chmod 0600 "$_uc" 2>/dev/null || true
  if grep -q '^mount_mode=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    sed -i "s/^mount_mode=.*/mount_mode=$INSTALL_MOUNT_MODE/" "$MODPATH/config/certs.conf"
  else
    echo "mount_mode=$INSTALL_MOUNT_MODE" >>"$MODPATH/config/certs.conf"
  fi
  if grep -q '^schema_version=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    sed -i "s/^schema_version=.*/schema_version=4/" "$MODPATH/config/certs.conf"
  else
    echo "schema_version=4" >>"$MODPATH/config/certs.conf"
  fi
  if ! grep -q '^tmpfs_style=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    echo "tmpfs_style=dev" >>"$MODPATH/config/certs.conf"
  fi
  if ! grep -q '^quiet_prop=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    echo "quiet_prop=1" >>"$MODPATH/config/certs.conf"
  fi
  # 旧键迁移 / 缺省实验项
  if grep -q '^experimental_14_apex_only=' "$MODPATH/config/certs.conf" 2>/dev/null && \
      ! grep -q '^experimental_14_system=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    case "$(awk -F= '$1=="experimental_14_apex_only"{print $2; exit}' "$MODPATH/config/certs.conf" | tr 'A-Z' 'a-z')" in
      1|true|yes|on) echo "experimental_14_system=skip" >>"$MODPATH/config/certs.conf" ;;
      *) echo "experimental_14_system=skip" >>"$MODPATH/config/certs.conf" ;;
    esac
  fi
  # 旧值归一
  if grep -qE '^experimental_14_system=(off|overlay|default|follow)' "$MODPATH/config/certs.conf" 2>/dev/null; then
    sed -i 's/^experimental_14_system=.*/experimental_14_system=auto/' "$MODPATH/config/certs.conf"
  fi
  if grep -qE '^experimental_14_system=(none|apex_only)' "$MODPATH/config/certs.conf" 2>/dev/null; then
    sed -i 's/^experimental_14_system=.*/experimental_14_system=skip/' "$MODPATH/config/certs.conf"
  fi
  if ! grep -q '^experimental_14_system=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    echo "experimental_14_system=skip" >>"$MODPATH/config/certs.conf"
  fi
  if grep -q '^experimental_14_apex_only=' "$MODPATH/config/certs.conf" 2>/dev/null; then
    tmp_cfg="$MODPATH/config/.certs.conf.mig.$$"
    awk -F= '$1 != "experimental_14_apex_only" { print }' "$MODPATH/config/certs.conf" >"$tmp_cfg" 2>/dev/null && \
      cat "$tmp_cfg" >"$MODPATH/config/certs.conf"
    rm -f "$tmp_cfg"
  fi
  if [ "$INSTALL_HOT" = "1" ]; then
    if grep -q '^hot_allow=' "$MODPATH/config/certs.conf" 2>/dev/null; then
      sed -i "s/^hot_allow=.*/hot_allow=1/" "$MODPATH/config/certs.conf"
    else
      echo "hot_allow=1" >>"$MODPATH/config/certs.conf"
    fi
  fi
  if [ "$INSTALL_HIDE" = "1" ]; then
    if grep -q '^hide_allow=' "$MODPATH/config/certs.conf" 2>/dev/null; then
      sed -i "s/^hide_allow=.*/hide_allow=$INSTALL_HIDE_ALLOW/" "$MODPATH/config/certs.conf"
    else
      echo "hide_allow=$INSTALL_HIDE_ALLOW" >>"$MODPATH/config/certs.conf"
    fi
  else
    # 未安装隐藏组件：不保留 hide_allow，避免误导
    if grep -q '^hide_allow=' "$MODPATH/config/certs.conf" 2>/dev/null; then
      sed -i '/^hide_allow=/d' "$MODPATH/config/certs.conf"
    fi
    rm -f "$MODPATH/data/state/hide-assist.conf" 2>/dev/null
  fi
  if [ "$INSTALL_ZN_HIDE" = "1" ]; then
    if grep -q '^zn_hide_allow=' "$MODPATH/config/certs.conf" 2>/dev/null; then
      sed -i "s/^zn_hide_allow=.*/zn_hide_allow=$INSTALL_ZN_HIDE_ALLOW/" "$MODPATH/config/certs.conf"
    else
      echo "zn_hide_allow=$INSTALL_ZN_HIDE_ALLOW" >>"$MODPATH/config/certs.conf"
    fi
  else
    if grep -q '^zn_hide_allow=' "$MODPATH/config/certs.conf" 2>/dev/null; then
      sed -i '/^zn_hide_allow=/d' "$MODPATH/config/certs.conf"
    fi
  fi
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
  SOURCES_DIR="$CERT_POOL/sources"
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
