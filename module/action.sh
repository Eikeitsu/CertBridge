#!/system/bin/sh
# Action：功能尽量丰富的只读仪表盘（无音量菜单）。
# 约束：SukiSU 等管理器 Action 总时长约 10s；不做热挂载写操作 / 全量 verify。
# 改证书 / 热挂载 → WebUI。

MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

echo "======== 证书桥 · Action ========"

# ---- 轻量修权（静默）----
chmod 0755 "$BINDIR"/*.sh 2>/dev/null
[ -d "$BINDIR/lib" ] && chmod 0755 "$BINDIR/lib"/*.sh 2>/dev/null
[ -f "$CONF" ] && chmod 0600 "$CONF" 2>/dev/null
if [ -d "$MODDIR/webroot" ]; then
  chmod 0755 "$MODDIR/webroot" "$MODDIR/webroot"/js "$MODDIR/webroot"/css 2>/dev/null
  chmod 0644 "$MODDIR/webroot"/*.* "$MODDIR/webroot"/js/* "$MODDIR/webroot"/css/* 2>/dev/null
fi

# ---- 运行 ----
echo "-------- 运行 --------"

_tag=$(refresh_module_description 2>/dev/null)
_desc=$(compose_module_description 2>/dev/null)
_ver=$(grep '^version=' "$MODDIR/module.prop" 2>/dev/null | cut -d= -f2-)
[ -n "$_ver" ] && echo "版本: $_ver"
[ -n "$_tag" ] && echo "状态: $_tag"
[ -n "$_desc" ] && echo "简介: $_desc"

_api=$(get_api 2>/dev/null)
_rel=$(getprop ro.build.version.release 2>/dev/null)
_root=$(detect_root_impl 2>/dev/null)
[ -n "$_api" ] && echo "系统: Android ${_rel:-?} (API $_api)"
[ -n "$_root" ] && echo "Root: $_root"
echo "boot-token: $(current_boot_token 2>/dev/null)"

if [ -f "$MODDIR/disable" ]; then
  echo "模块: 管理器已禁用"
else
  echo "模块: 开启"
fi

if inject_error_present 2>/dev/null; then
  echo "注入错误: $(format_inject_error_line 2>/dev/null)"
  _inj_hint=$(read_inject_error_field hint 2>/dev/null)
  [ -n "$_inj_hint" ] && echo "建议: $_inj_hint"
elif runtime_status_fresh 2>/dev/null; then
  _apex=$(read_runtime_status apex_ok 2>/dev/null)
  case "$_apex" in
    1) echo "注入: 正常" ;;
    0) echo "注入: 失败" ;;
    *) echo "注入: 检测中/未知" ;;
  esac
else
  echo "注入: 缓存未就绪"
fi

if [ -f "$PENDING_FILE" ]; then
  echo "待重启: 是"
  _pend=$(compose_pending_cert_summary 2>/dev/null)
  if [ -n "$_pend" ]; then
    _pn=${_pend%%|*}
    _pnames=${_pend#*|}
    echo "待生效: ${_pn} · ${_pnames}"
  fi
else
  echo "待重启: 否"
fi

if generation_valid 2>/dev/null; then
  echo "证书集: 有效"
else
  echo "证书集: 未就绪/无效"
fi

if [ -x "$BINDIR/hot_mount.sh" ]; then
  hot_status=$(sh "$BINDIR/hot_mount.sh" status light 2>/dev/null)
  hot_active=$(echo "$hot_status" | awk -F= '$1 == "hot_active" { print $2; exit }')
  hot_added=$(echo "$hot_status" | awk -F= '$1 == "hot_added" { print $2; exit }')
  hot_partial=$(echo "$hot_status" | awk -F= '$1 == "hot_partial" { print $2; exit }')
  hot_stale=$(echo "$hot_status" | awk -F= '$1 == "hot_stale" { print $2; exit }')
  hot_ns=$(echo "$hot_status" | awk -F= '$1 == "hot_namespaces" { print $2; exit }')
  hot_fail=$(echo "$hot_status" | awk -F= '$1 == "hot_failed" { print $2; exit }')
  if [ "$hot_active" = "1" ]; then
    echo "热挂载: 已启用（${hot_added:-0} 张 · ns ${hot_ns:-?}）"
    [ "$hot_partial" = "1" ] && echo "热挂载: 部分失败（${hot_fail:-?}）"
    [ "$hot_stale" = "1" ] && echo "热挂载: 会话过期"
  else
    echo "热挂载: 未启用"
  fi
else
  echo "热挂载: 组件未安装"
fi

# ---- 配置 / 证书 ----
echo "-------- 配置 --------"

echo "挂载模式: $(get_mount_mode 2>/dev/null)"
source_n=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)
echo "开机系统 CA: ${source_n:-0}"
echo "当前证书库: $(count_certs "$GEN_CERTS" 2>/dev/null)"
echo "自定义证书: $(count_certs "$CUSTOM_DIR" 2>/dev/null)"
echo "Addon 数: $(count_addon_certs 2>/dev/null)"

_req_en=$(read_conf reqable 1)
_pp_en=$(read_conf proxypin 1)
_req_act=0
_pp_act=0
is_addon_applied reqable 2>/dev/null && _req_act=1
is_addon_applied proxypin 2>/dev/null && _pp_act=1
echo "Reqable: 开关=${_req_en} · 生效=${_req_act} · $(get_applied_display reqable Reqable 2>/dev/null)"
echo "ProxyPin: 开关=${_pp_en} · 生效=${_pp_act} · $(get_applied_display proxypin ProxyPin 2>/dev/null)"

_summary=$(compose_applied_cert_summary named 2>/dev/null)
if [ -n "$_summary" ]; then
  _n=${_summary%%|*}
  _names=${_summary#*|}
  echo "当前生效: ${_n} · ${_names}"
else
  echo "当前生效: 无"
fi

_webui=$(compose_webui_description 2>/dev/null)
[ -n "$_webui" ] && echo "WebUI 文案: $_webui"

echo "管理器简介已刷新"

# ---- 工具 ----
echo "-------- 工具 --------"
echo "日志: $LOG_FILE"
if [ -f "$LOG_FILE" ]; then
  _tail=$(tail -n 2 "$LOG_FILE" 2>/dev/null | tr '\n' ' ' | tr -d '\r')
  [ -n "$_tail" ] && echo "日志尾: $_tail"
fi
echo "状态 CLI: sh $BINDIR/cert_manager.sh status"
echo "证书开关 / 自定义导入 / 热挂载 → WebUI"
echo "======== 结束 ========"
