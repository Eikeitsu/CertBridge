#!/system/bin/sh
# 将已校验的开机证书集注入到系统信任库。
# 为每个目标路径准备独立临时层并设置 SELinux，再绑定到相关命名空间。
# 只读重挂载失败时不撤销已经成功的绑定。
# 实现拆在 bin/lib/inject/

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

# shellcheck disable=SC1090
. "$LIBDIR/inject/inject_stage.sh"
# shellcheck disable=SC1090
. "$LIBDIR/inject/inject_bind.sh"
# shellcheck disable=SC1090
. "$LIBDIR/inject/inject_ops.sh"

case "${1:-boot}" in
  boot) inject_boot_namespaces ;;
  namespaces) inject_app_namespaces ;;
  verify) [ "$(check_store_injected)" != "0" ] ;;
  *)
    echo "usage: apex_inject.sh {boot|namespaces|verify}"
    exit 1
    ;;
esac
