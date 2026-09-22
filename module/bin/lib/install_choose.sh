#!/system/bin/sh
# 由 install_flow / common 加载；安装阶段专用（短文案 + i18n）
certbridge_choose_component() {
  component_name="$1"
  ui_print "--------------------------------"
  ui_print " $(i18n_fmt install.ask_component name="$component_name")"
  ui_print " $(i18n_msg common.timeout_20)"
  certbridge_volume_choice
  case "$?" in
    0)
      COMPONENT_CHOICE=1
      ui_print "- $(i18n_fmt install.component_yes name="$component_name")"
      ;;
    1)
      COMPONENT_CHOICE=0
      ui_print "- $(i18n_fmt install.component_no name="$component_name")"
      ;;
    *)
      COMPONENT_CHOICE=0
      ui_print "- $(i18n_fmt install.component_timeout name="$component_name")"
      ;;
  esac
}

certbridge_ask_import_detected() {
  app_label="$1"
  ui_print "--------------------------------"
  ui_print " $(i18n_fmt install.ask_import name="$app_label")"
  ui_print " $(i18n_msg common.timeout_20)"
  certbridge_volume_choice
  case "$?" in
    0) return 0 ;;
    *) return 1 ;;
  esac
}

certbridge_install_prepare_dirs() {
  mkdir -p "$MODPATH/bin" "$MODPATH/config" "$MODPATH/data/state"
  mkdir -p "$MODPATH/certs/builtin/proxypin"
  mkdir -p "$MODPATH/certs/sources/reqable" "$MODPATH/certs/sources/proxypin"
  mkdir -p "$MODPATH/data/state/addon-sources/reqable" "$MODPATH/data/state/addon-sources/proxypin"
  mkdir -p "${CB_EXT_DIR:-/data/adb/certbridge}/addon-sources/reqable" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/addon-sources/proxypin" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/source-stash/reqable" \
    "${CB_EXT_DIR:-/data/adb/certbridge}/source-stash/proxypin"
  mkdir -p "$MODPATH/certs/custom" "$MODPATH/certs/generation"
  rm -rf "$MODPATH/certs/builtin/reqable"
}

certbridge_install_choose_mode() {
  INSTALL_MODE="default"
  INSTALL_REQABLE=1
  INSTALL_PROXYPIN=1
  INSTALL_WEBUI=1
  INSTALL_HOT=1
  INSTALL_HIDE=1
  INSTALL_HIDE_ALLOW=0
  INSTALL_ZN_HIDE=0
  INSTALL_ZN_HIDE_ALLOW=0
  INSTALL_MOUNT_MODE="compatible"

  if [ -f "${CB_EXT_DIR:-/data/adb/certbridge}/install_auto" ]; then
    ui_print "- $(i18n_msg install.auto_mode)"
    rm -f "${CB_EXT_DIR:-/data/adb/certbridge}/install_auto" 2>/dev/null
    cb_ext_rmdir_if_empty 2>/dev/null || rmdir /data/adb/certbridge 2>/dev/null
    return 0
  fi

  ui_print "--------------------------------"
  ui_print " $(i18n_msg install.pick_mode)"
  ui_print " $(i18n_msg install.mode_keys)"
  ui_print " $(i18n_msg common.timeout_20)"
  certbridge_volume_choice
  case "$?" in
    1)
      INSTALL_MODE="custom"
      ui_print "- $(i18n_msg install.mode_custom_picked)"
      certbridge_choose_component "$(i18n_msg install.comp_reqable)"
      INSTALL_REQABLE="$COMPONENT_CHOICE"
      certbridge_choose_component "$(i18n_msg install.comp_proxypin)"
      INSTALL_PROXYPIN="$COMPONENT_CHOICE"
      certbridge_choose_component "$(i18n_msg install.comp_webui)"
      INSTALL_WEBUI="$COMPONENT_CHOICE"
      certbridge_choose_component "$(i18n_msg install.comp_hot)"
      INSTALL_HOT="$COMPONENT_CHOICE"
      certbridge_choose_component "$(i18n_msg install.comp_hide)"
      INSTALL_HIDE="$COMPONENT_CHOICE"
      if [ "$INSTALL_HIDE" = "1" ]; then
        INSTALL_HIDE_ALLOW=1
      else
        INSTALL_HIDE_ALLOW=0
      fi
      certbridge_choose_component "$(i18n_msg install.comp_zn)"
      INSTALL_ZN_HIDE="$COMPONENT_CHOICE"
      if [ "$INSTALL_ZN_HIDE" = "1" ]; then
        INSTALL_ZN_HIDE_ALLOW=1
      else
        INSTALL_ZN_HIDE_ALLOW=0
      fi
      ui_print "--------------------------------"
      ui_print " $(i18n_msg install.mount_pick)"
      ui_print " $(i18n_msg common.timeout_20)"
      certbridge_volume_choice
      case "$?" in
        1)
          INSTALL_MOUNT_MODE="magic"
          ui_print "- $(i18n_msg install.mount_magic)"
          ;;
        *)
          INSTALL_MOUNT_MODE="compatible"
          ui_print "- $(i18n_msg install.mount_compatible)"
          ;;
      esac
      ;;
    0) ui_print "- $(i18n_msg install.mode_default_picked)" ;;
    *) ui_print "- $(i18n_msg install.mode_timeout)" ;;
  esac
}
