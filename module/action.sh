#!/system/bin/sh
# Action：状态刷新 +（若已安装）免重启热挂载/卸载
# 交互同 Magisk 习惯：第一级二选一；子菜单逐项上=执行 / 下=跳过

MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

echo "========================================"
echo " 系统 CA 证书 · Action"
echo "========================================"

certbridge_action_ask() {
  title="$1"
  echo ""
  echo "----------------------------------------"
  echo " $title"
  echo " 音量上：执行　　音量下：跳过"
  echo " 20 秒未选择则跳过"
  echo "----------------------------------------"
  certbridge_volume_choice 20
  case "$?" in
    0) return 0 ;;
    *) return 1 ;;
  esac
}

certbridge_action_refresh() {
  echo "----------------------------------------"
  echo "[刷新] 权限与状态"
  echo "----------------------------------------"
  echo "[1/4] 刷新权限..."
  chmod 0755 "$BINDIR"/*.sh 2>/dev/null
  [ -d "$BINDIR/lib" ] && chmod 0755 "$BINDIR/lib"/*.sh 2>/dev/null
  chmod 0600 "$CONF" 2>/dev/null
  [ -d "$MODDIR/webroot" ] && find "$MODDIR/webroot" -type f -exec chmod 0644 {} \;
  echo "  完成"

  echo "[2/4] 本次启动证书集..."
  source_n=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)
  echo "  开机读取系统 CA: ${source_n:-0} 个"
  active=$(count_certs "$GEN_CERTS")
  echo "  当前完整证书库: $active 个"

  echo "[3/4] 配置与注入..."
  if [ -f "$PENDING_FILE" ]; then
    echo "  配置已变更，请重启后生效"
  else
    echo "  当前没有待应用变更"
  fi
  if [ -f "$STATEDIR/inject-error" ]; then
    echo "  注入异常: $(cat "$STATEDIR/inject-error" 2>/dev/null)"
  else
    echo "  注入状态: 正常或未报错"
  fi
  echo "  模块状态: $(compute_status_tag)"

  echo "[4/4] 临时热挂载..."
  if [ -x "$BINDIR/hot_mount.sh" ]; then
    hot_status=$(sh "$BINDIR/hot_mount.sh" status 2>/dev/null)
    hot_active=$(echo "$hot_status" | awk -F= '$1 == "hot_active" { print $2; exit }')
    hot_added=$(echo "$hot_status" | awk -F= '$1 == "hot_added" { print $2; exit }')
    hot_partial=$(echo "$hot_status" | awk -F= '$1 == "hot_partial" { print $2; exit }')
    if [ "$hot_active" = "1" ]; then
      echo "  已启用（${hot_added:-0} 张）"
      [ "$hot_partial" = "1" ] && echo "  警告: 部分命名空间挂载失败"
    else
      echo "  未启用"
    fi
  else
    echo "  组件未安装（安装时可选择免重启热挂载）"
  fi
  echo "  日志: $LOG_FILE"
  refresh_module_description >/dev/null 2>&1
  echo "----------------------------------------"
  echo " 刷新完成"
}

certbridge_action_hot_run() {
  mode="$1"
  sd_path="${2:-}"
  echo "----------------------------------------"
  echo "[热挂载] mode=$mode"
  echo "----------------------------------------"
  if [ -n "$sd_path" ]; then
    sh "$BINDIR/hot_mount.sh" mount "$mode" "$sd_path"
  else
    sh "$BINDIR/hot_mount.sh" mount "$mode"
  fi
  rc=$?
  refresh_module_description >/dev/null 2>&1
  echo "----------------------------------------"
  [ "$rc" -eq 0 ] && echo " 热挂载结束" || echo " 热挂载失败（见上方输出）"
  return "$rc"
}

certbridge_action_hot_unmount() {
  echo "----------------------------------------"
  echo "[卸载] 临时热挂载会话"
  echo "----------------------------------------"
  sh "$BINDIR/hot_mount.sh" unmount
  rc=$?
  refresh_module_description >/dev/null 2>&1
  echo "----------------------------------------"
  [ "$rc" -eq 0 ] && echo " 卸载结束" || echo " 卸载未完成（可能需重启清理）"
  return "$rc"
}

certbridge_action_tools_menu() {
  echo ""
  echo "========================================"
  echo " 实用功能"
  echo " 逐项询问：上=执行，下=跳过"
  echo "========================================"

  if [ ! -x "$BINDIR/hot_mount.sh" ]; then
    echo " 未安装免重启热挂载组件，无可用操作。"
    echo " 可重新刷入模块并在自定义安装中启用热挂载。"
    return 0
  fi

  echo " 说明: 仅临时提升用户区/存储卡 CA，不改永久配置；"
  echo "       请仅使用可信证书。默认存储卡目录: /sdcard/CertBridge"

  if certbridge_action_ask "是否挂载用户区证书（免重启）？"; then
    certbridge_action_hot_run user
  else
    echo " 已跳过：用户区挂载"
  fi

  if certbridge_action_ask "是否挂载存储卡证书（/sdcard/CertBridge）？"; then
    certbridge_action_hot_run sd /sdcard/CertBridge
  else
    echo " 已跳过：存储卡挂载"
  fi

  if certbridge_action_ask "是否挂载全部（用户区 + 存储卡）？"; then
    certbridge_action_hot_run all /sdcard/CertBridge
  else
    echo " 已跳过：全部挂载"
  fi

  if certbridge_action_ask "是否卸载当前临时热挂载？"; then
    certbridge_action_hot_unmount
  else
    echo " 已跳过：卸载"
  fi
}

# 第一级：上=刷新（默认），下=实用功能，超时=刷新
echo ""
echo "========================================"
echo " 请选择"
echo " 音量上：刷新权限与状态（默认）"
echo " 音量下：实用功能（免重启挂载/卸载）"
echo " 20 秒未选择将执行刷新"
echo "========================================"
certbridge_volume_choice 20
case "$?" in
  1)
    echo "已选择：实用功能"
    certbridge_action_tools_menu
    ;;
  *)
    echo "已选择：刷新状态"
    certbridge_action_refresh
    ;;
esac

echo "========================================"
echo " Action 结束"
echo "========================================"
