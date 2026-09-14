#!/system/bin/sh
# 模块描述 / 状态标签 / Root 识别
# 实现：status_runtime / status_summary / status_describe / status_tag

# shellcheck disable=SC1090
. "$LIBDIR/status_runtime.sh"
# shellcheck disable=SC1090
. "$LIBDIR/status_summary.sh"
# shellcheck disable=SC1090
. "$LIBDIR/status_describe.sh"
# shellcheck disable=SC1090
. "$LIBDIR/status_tag.sh"
