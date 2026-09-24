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
# 写入 epoch，便于状态查询对卡死标记做 TTL 清理
date +%s >"$STATEDIR/hot-update" 2>/dev/null
chmod 0600 "$STATEDIR/hot-update" 2>/dev/null

hu_clear_hot_marker() {
	rm -f "$STATEDIR/hot-update" 2>/dev/null
}
trap hu_clear_hot_marker 0 1 2 15

if type update_module_description >/dev/null 2>&1; then
	update_module_description >/dev/null 2>&1 || true
fi

# 重建 generation 前必须把 addon 播到 /data/adb/certbridge，
# 否则 install_addon_certs_into 找不到源，会把已启用的 Reqable/ProxyPin 从集合里丢掉。
if type certbridge_seed_ext_from_module >/dev/null 2>&1; then
	certbridge_seed_ext_from_module "$MODDIR" >/dev/null 2>&1 || true
fi
if type certbridge_ensure_state_sources >/dev/null 2>&1; then
	certbridge_ensure_state_sources >/dev/null 2>&1 || true
fi
if type certbridge_install_cli_ext >/dev/null 2>&1; then
	certbridge_install_cli_ext >/dev/null 2>&1 || true
elif [ -f "$MODDIR/bin/lib/install_finish.sh" ]; then
	# shellcheck disable=SC1090
	. "$MODDIR/bin/lib/install_finish.sh" 2>/dev/null
	certbridge_install_cli_ext >/dev/null 2>&1 || true
fi

# 标记热更新路径：post-fs-data 在 rebuild 失败时会尝试把旧 generation 重新挂回去，
# 避免「已卸绑定但新集合未建好」的空窗长期残留。
export CERTBRIDGE_HOT_UPDATE=1

# 永久注入依赖 post-fs-data 生成 + service 加固命名空间
if [ -f "$MODDIR/post-fs-data.sh" ]; then
	sh "$MODDIR/post-fs-data.sh" >/dev/null 2>&1 || true
fi
if [ -f "$MODDIR/service.sh" ]; then
	# 安装器结束时可能连带清理当前会话；让常驻服务脱离该会话。
	if command -v setsid >/dev/null 2>&1; then
		setsid sh "$MODDIR/service.sh" </dev/null >/dev/null 2>&1 &
	else
		nohup sh "$MODDIR/service.sh" </dev/null >/dev/null 2>&1 &
	fi
fi

hu_clear_hot_marker
trap - 0 1 2 15

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
