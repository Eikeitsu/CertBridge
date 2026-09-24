#!/system/bin/sh
# Hot update: apply
# 免重启更新：非首次安装且「需重启路径」无变更时，请求热更新并拉起 hotinstall.sh
# - 管理器提供热更新接口时只 export；否则自行做 modules_update → modules 切换
#
# 外部短时文件统一放在 /data/adb/certbridge/（与无人值守 install_auto 同目录），
# 用完删除；并清理历史 /data/adb/.certbridge_* 残留。

CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
CB_HOT_PAYLOAD_DIR="${CB_HOT_PAYLOAD_DIR:-$CB_EXT_DIR/hot_update_payload}"
CB_HOT_WORKER="${CB_HOT_WORKER:-$CB_EXT_DIR/hot_update.sh}"

hot_update_request() {
	_modid="$1"
	_script="${HOT_UPDATE_SCRIPT:-hotinstall.sh}"
	[ -n "$_modid" ] || return 1
	[ -f "$MODPATH/$_script" ] || {
		ui_print "! 缺少 $_script，无法免重启更新"
		return 1
	}

	hot_update_write_desc

	export MODULE_HOT_INSTALL_REQUEST="true"
	export MODULE_HOT_RUN_SCRIPT="$_script"

	if [ "$MOUNTIFY_HAS_HOT_INSTALL" = "true" ] || [ "$NOMOUNT_HAS_HOT_INSTALL" = "true" ]; then
		ui_print "- 已请求管理器免重启热更新"
		ui_print "- 安装完成后请刷新模块列表，无需重启"
		return 0
	fi

	# Magisk / 普通 KSU·APatch：保留标准更新目录，同时把完整包复制到
	# 管理器目录之外。worker 优先使用这个副本，避免安装器清理
	# modules_update 后没有可用更新源。
	#
	# 这个作业必须脱离安装器：管理器跑完 customize.sh 后会结束整个会话，
	# 普通 `( ... ) &` 会被连带杀掉，表现就是 modules_update 残留 + modules 下留着 update。
	# 副本准备或热切换失败时不碰 update/modules_update，交给重启流程兜底。
	if ! hot_update_snapshot_payload "$MODPATH" "$_modid"; then
		ui_print "- 热更新副本创建失败：保留标准更新流程，请重启后生效"
		return 1
	fi

	hot_update_spawn_worker "$_modid" "$_script" "$HOT_UPDATE_PAYLOAD" || {
		ui_print "- 热更新任务启动失败：保留标准更新流程，请重启后生效"
		return 1
	}
	ui_print "- 已安排免重启热更新（无需重启）"
	ui_print "- 服务会立即重启；模块列表残留标记会在后台清理"
	return 0
}

hot_update_clear_stale_lock() {
	# 新路径 + 旧锁路径一并检查
	for _stale_lock in \
		"$CB_EXT_DIR/$1.hot_update.lock" \
		"/data/adb/.$1.hot_update.lock"; do
		[ -d "$_stale_lock" ] || continue
		if [ -f "$_stale_lock/pid" ]; then
			_stale_pid="$(cat "$_stale_lock/pid" 2>/dev/null | tr -d ' \r\n')"
			case "$_stale_pid" in
				""|*[!0-9]*) ;;
				*)
					kill -0 "$_stale_pid" 2>/dev/null && return 1
					rm -rf "$_stale_lock" 2>/dev/null
					[ -e "$_stale_lock" ] && return 1
					continue
					;;
			esac
		fi
		# 兼容旧版留下的空锁目录；有内容但无法确认归属时不强删。
		rmdir "$_stale_lock" 2>/dev/null
	done
	return 0
}

# 生成收尾作业脚本。参数: 目标路径

# 生成收尾作业脚本。参数: 目标路径
hot_update_write_worker() {
	_worker_path="$1"
	[ -n "$_worker_path" ] || return 1
	cat >"$_worker_path" <<'HOT_UPDATE_WORKER'
#!/system/bin/sh
# 由安装流程生成并脱离安装器运行；参数: <modid> <hotinstall 脚本名> [副本路径]
MODID="$1"
SCRIPT="$2"
PAYLOAD="${3:-/data/adb/certbridge/hot_update_payload/$MODID}"
OLD="/data/adb/modules/$MODID"
NEW="/data/adb/modules_update/$MODID"
LOG="$OLD/data/hot-update.log"
LOCK="/data/adb/certbridge/${MODID}.hot_update.lock"
EXT_DIR="/data/adb/certbridge"
LEGACY_PAYLOAD_BASE="/data/adb/.certbridge_hot_update_payload"
LEGACY_WORKER="/data/adb/.certbridge_hot_update.sh"

if ! mkdir "$LOCK" 2>/dev/null; then
	exit 0
fi
echo "$$" >"$LOCK/pid" 2>/dev/null
hu_cleanup_lock() {
	rm -rf "$LOCK" 2>/dev/null
}
trap hu_cleanup_lock 0 1 2 15

hu_log() {
	mkdir -p "$OLD/data" 2>/dev/null
	echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >>"$LOG" 2>/dev/null
	chmod 0600 "$LOG" 2>/dev/null
}

# 暂存目录的轻量指纹：文件数 + 占用大小

# 暂存目录的轻量指纹：文件数 + 占用大小
hu_sig() {
	_n="$(find "$NEW" -type f 2>/dev/null | wc -l | tr -d ' ')"
	_k="$(du -sk "$NEW" 2>/dev/null | awk '{print $1}')"
	echo "${_n:-0}:${_k:-0}"
}

hu_verify_file() {
	_src_sum="$(cksum "$1" 2>/dev/null | awk '{print $1":"$2}')"
	_dst_sum="$(cksum "$2" 2>/dev/null | awk '{print $1":"$2}')"
	[ -n "$_src_sum" ] && [ "$_src_sum" = "$_dst_sum" ]
}

hu_version() {
	sed -n 's/^versionCode=//p' "$1" 2>/dev/null | head -n1 | tr -d ' \r'
}

# 等管理器写完：指纹连续 3 次（约 3s）不变即认为收尾结束

# 等管理器写完：指纹连续 3 次（约 3s）不变即认为收尾结束
hu_wait_stable() {
	_prev=""
	_same=0
	_i=0
	while [ "$_i" -lt 60 ]; do
		sleep 1
		_i=$((_i + 1))
		[ -d "$NEW" ] || continue
		_cur="$(hu_sig)"
		if [ "$_cur" = "$_prev" ]; then
			_same=$((_same + 1))
			[ "$_same" -ge 3 ] && return 0
		else
			_same=0
		fi
		_prev="$_cur"
	done
	return 1
}

[ -n "$MODID" ] || exit 0
hu_log "start: 收尾作业已启动 (pid $$)"
if [ -d "$PAYLOAD" ]; then
	SRC="$PAYLOAD"
	hu_log "source: 使用管理器目录外的完整副本 $SRC"
else
	SRC="$NEW"
	if ! hu_wait_stable; then
		hu_log "abort: modules_update 未在 60s 内稳定，保留标准更新标记"
		exit 0
	fi
fi

[ -d "$SRC" ] || { hu_log "abort: 无更新源 $SRC，保留标准更新标记"; exit 0; }
[ -d "$OLD" ] || { hu_log "abort: 无 $OLD"; exit 0; }
[ -f "$OLD/disable" ] && { hu_log "abort: 模块已禁用"; exit 0; }
[ -f "$OLD/remove" ] && { hu_log "abort: 模块待卸载"; exit 0; }
# 关键文件齐全才敢覆盖：暂存被中断时不能拿半个包盖掉正在用的模块
for f in module.prop post-fs-data.sh service.sh bin/common.sh hotinstall.sh; do
	[ -f "$SRC/$f" ] || { hu_log "abort: 更新源缺少 $f，保留标准更新标记"; exit 0; }
done
RUN_VERSION="$(hu_version "$SRC/module.prop")"
case "$RUN_VERSION" in "" | *[!0-9]*) hu_log "abort: 更新源版本号无效，保留标准更新标记"; exit 0 ;; esac

# 就地覆盖（只增改不删），全程不出现空模块窗口。
# webroot 含打包产物：先整目录替换，避免旧 js/css 残留。
# 不使用 cp -a：部分 Android toybox/第三方环境对该短选项兼容性不一致。
if [ -d "$SRC/webroot" ] && [ -f "$SRC/webroot/index.html" ]; then
	rm -rf "$OLD/webroot" 2>/dev/null
fi
_cp_err="$(cp -rfp "$SRC"/. "$OLD"/ 2>&1)"
_cp_rc=$?
if [ "$_cp_rc" -ne 0 ]; then
	hu_log "fail: 覆盖 $OLD 失败 rc=$_cp_rc err=${_cp_err:-无输出}，保留标准更新标记"
	exit 1
fi
for f in module.prop post-fs-data.sh service.sh bin/common.sh hotinstall.sh; do
	[ -f "$OLD/$f" ] || {
		hu_log "fail: 覆盖后校验缺少 $f，保留标准更新标记"
		exit 1
	}
	hu_verify_file "$SRC/$f" "$OLD/$f" || {
		hu_log "fail: 覆盖后校验不一致 $f，保留标准更新标记"
		exit 1
	}
done
hu_log "ok: 已就地覆盖到 $OLD"

# 生效优先：先清 update 并拉起 hotinstall。
# 暂存目录先留给安装器收尾（InstallX 等会继续对 modules_update 做
# chcon/chown/chmod）；过早删除会刷屏 No such file，并可能被当成安装失败。
if [ -e "$OLD/update" ]; then
	rm -f "$OLD/update" "$OLD/remove" 2>/dev/null || {
		hu_log "fail: 无法清理更新标记，保留标准更新流程"
		exit 1
	}
	[ ! -e "$OLD/update" ] || {
		hu_log "fail: update 标记仍存在，保留标准更新流程"
		exit 1
	}
fi
if [ -f "$OLD/$SCRIPT" ]; then
	if command -v setsid >/dev/null 2>&1; then
		setsid sh "$OLD/$SCRIPT" </dev/null >/dev/null 2>&1 &
	else
		nohup sh "$OLD/$SCRIPT" </dev/null >/dev/null 2>&1 &
	fi
	hu_log "ok: 已启动 $SCRIPT（立即生效，pid $!）"
else
	hu_log "fail: 缺少 $SCRIPT，保留标准更新标记"
	exit 1
fi

# 等安装器不再改动暂存（最少约 10s），再删同版本 modules_update。

# 等安装器不再改动暂存（最少约 10s），再删同版本 modules_update。
hu_wait_installer_idle() {
	_prev=""
	_same=0
	_i=0
	_min_wait=10
	while [ "$_i" -lt 45 ]; do
		sleep 1
		_i=$((_i + 1))
		[ -d "$NEW" ] || return 0
		_cur="$(hu_sig)"
		if [ "$_cur" = "$_prev" ]; then
			_same=$((_same + 1))
		else
			_same=0
		fi
		_prev="$_cur"
		if [ "$_i" -ge "$_min_wait" ] && [ "$_same" -ge 3 ]; then
			return 0
		fi
	done
	return 1
}

if [ -d "$NEW" ]; then
	if hu_wait_installer_idle; then
		hu_log "info: 安装器收尾已空闲，开始清理暂存"
	else
		hu_log "warn: 等待安装器超时，仍尝试清理同版本暂存"
	fi
	_pending_version="$(hu_version "$NEW/module.prop")"
	if [ "$_pending_version" = "$RUN_VERSION" ] || [ ! -f "$NEW/module.prop" ]; then
		rm -rf "$NEW" 2>/dev/null
		if [ -e "$NEW" ]; then
			hu_log "warn: 首次清理 $NEW 未成功，将在观察期重试"
		else
			hu_log "ok: 已清理 $NEW"
		fi
	else
		hu_log "info: 检测到其他待更新版本 ${_pending_version:-未知}，暂不清理"
	fi
fi

if [ -d "$PAYLOAD" ]; then
	if rm -rf "$PAYLOAD" 2>/dev/null && [ ! -e "$PAYLOAD" ]; then
		rmdir "$EXT_DIR/hot_update_payload" 2>/dev/null
		rmdir "$LEGACY_PAYLOAD_BASE" 2>/dev/null
		hu_log "ok: 已清理热更新外部副本"
	else
		hu_log "warn: 热更新外部副本清理失败，将在后台再次尝试"
	fi
fi

# 更新主体已完成：释放锁，继续观察管理器可能回写的残留标记。
hu_cleanup_lock
rm -f "$EXT_DIR/hot_update.sh" "$LEGACY_WORKER" 2>/dev/null
rmdir "$EXT_DIR" 2>/dev/null

# 管理器可能在我们之后才 touch update / 回写暂存，持续观察一段时间。
# 只清理同一版本的残留；发现版本更高或尚未写完整的更新就立即停止，
# 避免把用户随后刷入的新包误删。
_i=0
_seen_update=0
while [ "$_i" -lt 120 ]; do
	if [ -e "$NEW" ]; then
		_pending_version="$(hu_version "$NEW/module.prop")"
		if [ "$_pending_version" = "$RUN_VERSION" ] || [ ! -f "$NEW/module.prop" ]; then
			rm -rf "$NEW" 2>/dev/null
			[ ! -e "$NEW" ] || break
			rm -f "$OLD/update" "$OLD/remove" 2>/dev/null
			_seen_update=$((_seen_update + 1))
		else
			hu_log "info: 检测到其他待更新版本 ${_pending_version:-未知}，停止清理"
			break
		fi
	elif [ -f "$OLD/update" ]; then
		rm -f "$OLD/update" "$OLD/remove" 2>/dev/null
		_seen_update=$((_seen_update + 1))
	fi
	sleep 1
	_i=$((_i + 1))
done
[ "$_seen_update" -gt 0 ] && hu_log "info: 期间清理 update 标记 ${_seen_update} 次"
[ -e "$NEW" ] && hu_log "warn: $NEW 仍残留"
[ -f "$OLD/update" ] && hu_log "warn: $OLD/update 仍残留"
rm -rf "$PAYLOAD" 2>/dev/null
rmdir "$EXT_DIR/hot_update_payload" 2>/dev/null
rmdir "$LEGACY_PAYLOAD_BASE" 2>/dev/null
rm -f "$EXT_DIR/hot_update.sh" "$LEGACY_WORKER" 2>/dev/null
rmdir "$EXT_DIR" 2>/dev/null
HOT_UPDATE_WORKER
	chmod 0700 "$_worker_path" 2>/dev/null
}

# 写出并脱离当前会话启动收尾作业。参数: <modid> <hotinstall 脚本名> [副本路径]

# 写出并脱离当前会话启动收尾作业。参数: <modid> <hotinstall 脚本名> [副本路径]
hot_update_spawn_worker() {
	_sw_modid="$1"
	_sw_script="${2:-hotinstall.sh}"
	_sw_payload="${3:-$CB_HOT_PAYLOAD_DIR/$_sw_modid}"
	[ -n "$_sw_modid" ] || return 1
	hot_update_clear_stale_lock "$_sw_modid" || return 1
	hot_update_legacy_cleanup
	mkdir -p "$CB_EXT_DIR" 2>/dev/null || return 1
	_sw_path="$CB_HOT_WORKER"
	hot_update_write_worker "$_sw_path" || return 1
	# setsid 才能真正脱离安装器的会话；没有就退回 nohup
	if command -v setsid >/dev/null 2>&1; then
		setsid sh "$_sw_path" "$_sw_modid" "$_sw_script" "$_sw_payload" </dev/null >/dev/null 2>&1 &
	else
		nohup sh "$_sw_path" "$_sw_modid" "$_sw_script" "$_sw_payload" </dev/null >/dev/null 2>&1 &
	fi
	return 0
}

# 返回: 0=已请求热更；1=需重启 / 首次安装

# 返回: 0=已请求热更；1=需重启 / 首次安装
hot_update_try() {
	_modid="$1"
	shift
	_old="/data/adb/modules/$_modid"
	_new="${MODPATH:-}"

	if [ -z "$_new" ] || [ ! -d "$_new" ]; then
		return 1
	fi

	if [ ! -d "$_old" ] || [ -f "$_old/remove" ]; then
		ui_print "- 首次安装：请重启后生效"
		return 1
	fi

	if [ -f "$_old/disable" ]; then
		ui_print "- 模块当前为禁用状态：请重启（或启用后）再生效"
		return 1
	fi

	if hot_update_needs_reboot "$_old" "$_new" "$@"; then
		ui_print "- 本次变更含开机挂载/策略类文件：请重启后生效"
		return 1
	fi

	hot_update_request "$_modid"
}
