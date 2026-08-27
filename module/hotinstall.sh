#!/system/bin/sh
# 热更新后重新注入，并刷新模块简介（避免停在「等待开机注入完成 / 待重启」）
PATH=/data/adb/ap/bin:/data/adb/ksu/bin:/data/adb/magisk:$PATH
MODDIR="${0%/*}"

rm -f "$MODDIR/update" 2>/dev/null

if [ -f "$MODDIR/bin/common.sh" ]; then
	# shellcheck disable=SC1090
	. "$MODDIR/bin/common.sh" 2>/dev/null || true
fi

# 热更新期间的过渡状态：管理器列表立即可见
STATEDIR="${STATEDIR:-$MODDIR/data/state}"
mkdir -p "$STATEDIR" 2>/dev/null
date '+%Y-%m-%d %H:%M:%S' >"$STATEDIR/hot-update" 2>/dev/null
chmod 0600 "$STATEDIR/hot-update" 2>/dev/null
if type update_module_description >/dev/null 2>&1; then
	update_module_description >/dev/null 2>&1 || true
fi

# 永久注入依赖 post-fs-data 生成 + service 加固命名空间
if [ -f "$MODDIR/post-fs-data.sh" ]; then
	sh "$MODDIR/post-fs-data.sh" >/dev/null 2>&1 || true
fi
if [ -f "$MODDIR/service.sh" ]; then
	sh "$MODDIR/service.sh" >/dev/null 2>&1 || true
fi

rm -f "$STATEDIR/hot-update" 2>/dev/null

# 注入已按新配置重建，则不应再显示「待重启」
if type update_reboot_required_flag >/dev/null 2>&1; then
	update_reboot_required_flag >/dev/null 2>&1 || true
fi
if type finalize_runtime_status >/dev/null 2>&1; then
	finalize_runtime_status hotupdate >/dev/null 2>&1 || true
elif type update_module_description >/dev/null 2>&1; then
	update_module_description >/dev/null 2>&1 || true
fi

echo "certbridge: hotinstall done" >>/dev/kmsg 2>/dev/null || true
