#!/system/bin/sh
# 刷入安装编排入口：音量键选择、App CA 导入、写配置与组件裁剪
# 由 customize.sh 在 CERTBRIDGE_PROFILE=install 下经 common.sh 加载
# 实现拆在 install_choose / install_import / install_apply

# shellcheck disable=SC1090
. "$LIBDIR/install_choose.sh"
# shellcheck disable=SC1090
. "$LIBDIR/install_import.sh"
# shellcheck disable=SC1090
. "$LIBDIR/install_apply.sh"
