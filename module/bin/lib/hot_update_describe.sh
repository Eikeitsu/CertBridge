#!/system/bin/sh
# Hot update: describe
# 免重启更新：非首次安装且「需重启路径」无变更时，请求热更新并拉起 hotinstall.sh
# - 管理器提供热更新接口时只 export；否则自行做 modules_update → modules 切换
#
# 外部短时文件统一放在 /data/adb/certbridge/（与无人值守 install_auto 同目录），
# 用完删除；并清理历史 /data/adb/.certbridge_* 残留。

CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
CB_HOT_PAYLOAD_DIR="${CB_HOT_PAYLOAD_DIR:-$CB_EXT_DIR/hot_update_payload}"
CB_HOT_WORKER="${CB_HOT_WORKER:-$CB_EXT_DIR/hot_update.sh}"

# 热更新时把安装包里的「等待开机」占位简介换成过渡文案
# 可选环境：HOT_UPDATE_DESC
hot_update_write_desc() {
	_prop="$MODPATH/module.prop"
	[ -n "$HOT_UPDATE_DESC" ] || return 0
	[ -f "$_prop" ] || return 0
	_tmp="$_prop.tmp.$$"
	awk -F= -v desc="$HOT_UPDATE_DESC" '
		BEGIN { done=0 }
		$1 == "description" { print "description=" desc; done=1; next }
		{ print }
		END { if (!done) print "description=" desc }
	' "$_prop" >"$_tmp" && mv -f "$_tmp" "$_prop"
	chmod 0644 "$_prop" 2>/dev/null
}

# 把完整的新模块先保存到管理器不会清理的目录。
# 这样即使安装器随后删除 modules_update，也不会丢失待热切换的内容。

# 把完整的新模块先保存到管理器不会清理的目录。
# 这样即使安装器随后删除 modules_update，也不会丢失待热切换的内容。
hot_update_snapshot_payload() {
	_snapshot_src="$1"
	_snapshot_id="$2"
	_snapshot_base="$CB_HOT_PAYLOAD_DIR"
	_snapshot_tmp="$_snapshot_base/.${_snapshot_id}.tmp.$$"
	_snapshot_dst="$_snapshot_base/$_snapshot_id"
	HOT_UPDATE_PAYLOAD=""
	[ -d "$_snapshot_src" ] || return 1
	hot_update_legacy_cleanup
	mkdir -p "$_snapshot_base" 2>/dev/null || return 1
	rm -rf "$_snapshot_tmp" 2>/dev/null
	mkdir -p "$_snapshot_tmp" 2>/dev/null || return 1
	_snapshot_err="$(cp -rfp "$_snapshot_src"/. "$_snapshot_tmp"/ 2>&1)"
	_snapshot_rc=$?
	if [ "$_snapshot_rc" -ne 0 ]; then
		rm -rf "$_snapshot_tmp" 2>/dev/null
		ui_print "! 无法保存热更新副本 rc=$_snapshot_rc ${_snapshot_err:-无输出}"
		return 1
	fi
	for _snapshot_file in module.prop post-fs-data.sh service.sh bin/common.sh hotinstall.sh; do
		if [ ! -f "$_snapshot_tmp/$_snapshot_file" ]; then
			rm -rf "$_snapshot_tmp" 2>/dev/null
			ui_print "! 热更新副本缺少 $_snapshot_file，保留标准重启更新"
			return 1
		fi
		_snapshot_sum="$(cksum "$_snapshot_tmp/$_snapshot_file" 2>/dev/null | awk '{print $1":"$2}')"
		if [ -z "$_snapshot_sum" ]; then
			rm -rf "$_snapshot_tmp" 2>/dev/null
			ui_print "! 热更新副本校验失败，保留标准重启更新"
			return 1
		fi
	done
	rm -rf "$_snapshot_dst" 2>/dev/null
	if ! mv -f "$_snapshot_tmp" "$_snapshot_dst" 2>/dev/null; then
		rm -rf "$_snapshot_tmp" 2>/dev/null
		ui_print "! 无法提交热更新副本，保留标准重启更新"
		return 1
	fi
	HOT_UPDATE_PAYLOAD="$_snapshot_dst"
	return 0
}
