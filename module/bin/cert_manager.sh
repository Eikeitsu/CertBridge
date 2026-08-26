#!/system/bin/sh
# CLI for WebUI. Read commands never mutate module state.
# Certificate changes are persisted and applied only after reboot.
# 命令实现拆在 bin/lib/cli_*.sh

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

# shellcheck disable=SC1090
. "$LIBDIR/cli_status.sh"
# shellcheck disable=SC1090
. "$LIBDIR/cli_certs.sh"
# shellcheck disable=SC1090
. "$LIBDIR/cli_config.sh"
# shellcheck disable=SC1090
. "$LIBDIR/cli_hot.sh"

case "$1" in
  status) cmd_status ;;
  list_custom) cmd_list_custom ;;
  list_applied_fps) cmd_list_applied_fps ;;
  toggle) cmd_toggle "$2" "$3" ;;
  sync_apps) cmd_sync_apps ;;
  set_mount_mode) cmd_set_mount_mode "$2" ;;
  set_tmpfs_style) cmd_set_tmpfs_style "$2" ;;
  install_custom) cmd_install_custom "$2" ;;
  import_app_preset) cmd_import_app_preset "$2" ;;
  remove_custom) cmd_remove_custom "$2" ;;
  cert_info) cmd_cert_info "$2" ;;
  hot_mount) cmd_hot_mount "$2" "$3" ;;
  hot_unmount) cmd_hot_unmount ;;
  set_hot_allow) cmd_set_hot_allow "$2" ;;
  set_hide_allow) cmd_set_hide_allow "$2" ;;
  set_zn_hide_allow) cmd_set_zn_hide_allow "$2" ;;
  get_zn_whitelist) cmd_get_zn_whitelist ;;
  set_zn_whitelist) cmd_set_zn_whitelist "$2" ;;
  reinject|sync)
    echo "error=hot_reload_disabled"
    echo "reboot_required=1"
    exit 1
    ;;
  *)
    echo "usage: cert_manager.sh {status|list_custom|list_applied_fps|toggle|sync_apps|set_mount_mode|set_tmpfs_style|set_hot_allow|set_hide_allow|set_zn_hide_allow|get_zn_whitelist|set_zn_whitelist|install_custom|import_app_preset|remove_custom|cert_info|hot_mount|hot_unmount}"
    exit 1
    ;;
esac
