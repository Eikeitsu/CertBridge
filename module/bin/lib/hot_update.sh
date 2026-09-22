#!/system/bin/sh
# Hot update (split: detect / describe / apply)
# shellcheck disable=SC1090
. "$LIBDIR/hot_update_detect.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot_update_describe.sh"
# shellcheck disable=SC1090
. "$LIBDIR/hot_update_apply.sh"
