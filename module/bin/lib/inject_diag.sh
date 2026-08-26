#!/system/bin/sh
# 注入失败诊断：结构化写入 inject-error，供 WebUI / Action / module.prop 展示

INJECT_FAIL_FILE="${INJECT_FAIL_FILE:-$STATEDIR/inject-fail.conf}"
INJECT_ERROR_FILE="${INJECT_ERROR_FILE:-$STATEDIR/inject-error}"
# shellcheck disable=SC1090
. "$LIBDIR/inject_error.sh"
# shellcheck disable=SC1090
. "$LIBDIR/inject_verify_diag.sh"
