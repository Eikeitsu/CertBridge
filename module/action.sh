#!/system/bin/sh
MODDIR=${0%/*}
. "$MODDIR/bin/common.sh"

echo "========================================"
echo " 系统 CA 证书 · Action"
echo "========================================"

echo "[1/3] 刷新权限..."
chmod 0755 "$BINDIR"/*.sh 2>/dev/null
chmod 0644 "$CONF" 2>/dev/null
[ -d "$MODDIR/webroot" ] && find "$MODDIR/webroot" -type f -exec chmod 0644 {} \;

echo "[2/3] 同步证书..."
sync_active_certs

echo "[3/3] 重新注入 APEX..."
sh "$BINDIR/apex_inject.sh" inject

active=$(ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | wc -l)
echo "  当前启用证书: $active 个"
echo "  日志: $LOG_FILE"
echo "========================================"
echo " Action 完成，可打开 WebUI 查看状态"
echo "========================================"