#!/system/bin/sh
# 仅卸载带 CertBridge 会话标记的临时层；开机持久层仍由重启统一清理。

MODDIR=${0%/*}
LOG_FILE="$MODDIR/data/install.log"
if [ -x "$MODDIR/bin/hot_mount.sh" ]; then
  sh "$MODDIR/bin/hot_mount.sh" unmount >>"$LOG_FILE" 2>&1 || \
    echo "uninstall: temporary session could not be fully removed; reboot required" >>"$LOG_FILE"
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] uninstall: module removed; reboot required to clear mounts" >>"$LOG_FILE" 2>/dev/null
rm -rf /data/local/tmp/certbridge-* 2>/dev/null
rm -rf "$MODDIR/data/runtime-mounts" 2>/dev/null
