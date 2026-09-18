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
# shellcheck disable=SC1090
. "$LIBDIR/cli_help.sh"

RAW_CMD="$1"
CMD=$(cli_normalize_cmd "$RAW_CMD")

case "$CMD" in
  help)
    cmd_help "$2"
    exit $?
    ;;
  "" )
    # 无参数：打印帮助（友好入口）
    cmd_help
    exit 0
    ;;
  status) cmd_status "$2" ;;
  verify) cmd_verify ;;
  get) cmd_get_conf "$2" ;;
  set) cmd_set_conf "$2" "$3" ;;
  list_custom) cmd_list_custom ;;
  list_applied_fps) cmd_list_applied_fps ;;
  toggle) cmd_toggle "$2" "$3" ;;
  sync_apps) cmd_sync_apps ;;
  set_mount_mode) cmd_set_mount_mode "$2" ;;
  set_experimental_14_system) cmd_set_experimental_14_system "$2" ;;
  set_tmpfs_style) cmd_set_tmpfs_style "$2" ;;
  set_quiet_prop) cmd_set_quiet_prop "$2" ;;
  install_custom) cmd_install_custom "$2" ;;
  import_app_preset) cmd_import_app_preset "$2" ;;
  remove_custom) cmd_remove_custom "$2" ;;
  cert_info) cmd_cert_info "$2" ;;
  hot_mount) cmd_hot_mount "$2" "$3" ;;
  hot_unmount) cmd_hot_unmount ;;
  set_hot_allow) cmd_set_hot_allow "$2" ;;
  set_hide_allow) cmd_set_hide_allow "$2" ;;
  hide_reregister) cmd_hide_reregister ;;
  set_zn_hide_allow) cmd_set_zn_hide_allow "$2" ;;
  set_force_bind_capture) cmd_set_force_bind_capture "$2" ;;
  set_late_inject) cmd_set_late_inject "$2" ;;
  get_zn_whitelist) cmd_get_zn_whitelist ;;
  set_zn_whitelist) cmd_set_zn_whitelist "$2" ;;
  reinject)
    echo "error=hot_reload_disabled"
    echo "reboot_required=1"
    echo "hint=永久配置改完需重启；临时证书用 hot_mount / hot_unmount"
    exit 1
    ;;
  *)
    cli_unknown "$RAW_CMD"
    exit 1
    ;;
esac
