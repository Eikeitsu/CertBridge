#!/system/bin/sh
# CertBridge temporary CA session.
# Builds an immutable merged store, binds it into active mount namespaces,
# and removes only mounts carrying this session's marker.
# 实现拆在 bin/lib/hot/；本文件负责路径、trap 与命令入口。

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

HOT_ROOT="$CERT_POOL/hot"
HOT_CURRENT="$HOT_ROOT/current"
HOT_CERTS="$HOT_CURRENT/cacerts"
HOT_LEDGER="$HOT_CURRENT/mounts.list"
HOT_STATE="$STATEDIR/hot-session.conf"
HOT_MARKER="certbridge_session"
# 仅换 bind 物理路径；标记 / remount,ro / 校验逻辑保持原版
HOT_BIND_ROOT="${HOT_RUNTIME_ROOT:-/data/local/tmp/.fs1}"
HOT_MAX_FILES=128
HOT_ADDED=0
HOT_SKIPPED=0
HOT_HAS_LOCK=0

# shellcheck disable=SC1090
. "$LIBDIR/hot/hot_state.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot/hot_certs.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot/hot_ns.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot/hot_bind.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot/hot_build.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot/hot_session.sh"

trap hot_exit_cleanup 0
trap 'hot_exit_cleanup; exit 1' 1 2 15

case "${1:-status}" in
  mount) hot_start "$2" "$3" ;;
  unmount) hot_stop ;;
  unmount_locked)
    [ "$CERTBRIDGE_LOCK_HELD" = "1" ] || { echo "error=lock_required"; exit 1; }
    hot_stop_locked
    ;;
  status) hot_status "${2:-light}" ;;
  *)
    echo "usage: hot_mount.sh {mount <user|sd|all> [sd_path]|unmount|status [light|live]}"
    exit 1
    ;;
esac
