#!/system/bin/sh
# 挂载隐藏协助：SuSFS try_umount / 内核 umount + 隐藏栈探测（可选安装组件）

SUSFS_BIN="${SUSFS_BIN:-/data/adb/ksu/bin/ksu_susfs}"
HIDE_STATE_FILE="${HIDE_STATE_FILE:-$STATEDIR/hide-assist.conf}"
# shellcheck disable=SC1090
. "$LIBDIR/hide_actions.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hide_status.sh"
