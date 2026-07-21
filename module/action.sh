#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

echo "========================================"
echo " 系统 CA 证书 · Action"
echo "========================================"

echo "[1/3] 刷新权限..."
chmod 0755 "$BINDIR"/*.sh 2>/dev/null
chmod 0600 "$CONF" 2>/dev/null
[ -d "$MODDIR/webroot" ] && find "$MODDIR/webroot" -type f -exec chmod 0644 {} \;

echo "[2/3] 检查本次启动实时证书集..."
source_n=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)
echo "  开机读取系统 CA: ${source_n:-0} 个"

echo "[3/3] 检查待应用配置..."
if [ -f "$PENDING_FILE" ]; then
  echo "  配置已变更，请重启后生效"
else
  echo "  当前没有待应用变更"
fi

active=$(count_certs "$GEN_CERTS")
echo "  当前完整证书库: $active 个"
if [ -x "$BINDIR/hot_mount.sh" ]; then
  hot_status=$(sh "$BINDIR/hot_mount.sh" status 2>/dev/null)
  hot_active=$(echo "$hot_status" | awk -F= '$1 == "hot_active" { print $2; exit }')
  hot_added=$(echo "$hot_status" | awk -F= '$1 == "hot_added" { print $2; exit }')
  if [ "$hot_active" = "1" ]; then
    echo "  临时热挂载: 已启用（${hot_added:-0} 张）"
  else
    echo "  临时热挂载: 未启用"
  fi
else
  echo "  临时热挂载: 未安装"
fi
echo "  日志: $LOG_FILE"
echo "========================================"
if [ -x "$BINDIR/hot_mount.sh" ]; then
  echo " Action 仅显示状态；临时挂载请使用 WebUI 或 CLI"
else
  echo " Action 仅显示状态"
fi
echo "========================================"