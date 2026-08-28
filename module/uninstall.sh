#!/system/bin/sh
# 仅卸载带 CertBridge 会话标记的临时层；开机持久层仍由重启统一清理。

MODDIR=${0%/*}
LOG_FILE="$MODDIR/data/install.log"
if [ -x "$MODDIR/bin/hot_mount.sh" ]; then
  sh "$MODDIR/bin/hot_mount.sh" unmount >>"$LOG_FILE" 2>&1 || \
    echo "uninstall: temporary session could not be fully removed; reboot required" >>"$LOG_FILE"
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] uninstall: module removed; reboot required to clear mounts" >>"$LOG_FILE" 2>/dev/null
for _cb_mnt in /dev/.cb0 /dev/.cb1 \
    /dev/.cb0/apex /dev/.cb0/system \
    /data/local/tmp/.fs0 /data/local/tmp/.fs1 \
    /data/local/tmp/.fs0/apex /data/local/tmp/.fs0/system \
    /data/local/tmp/sys-ca-merge /data/local/tmp/sys-ca-merge-hot \
    /data/local/tmp/sys-ca-merge/apex /data/local/tmp/sys-ca-merge/system; do
  umount "$_cb_mnt" 2>/dev/null
done
rm -rf /dev/.cb0 /dev/.cb1 \
  /data/local/tmp/.fs0 /data/local/tmp/.fs1 \
  /data/local/tmp/sys-ca-merge /data/local/tmp/sys-ca-merge-hot \
  /data/local/tmp/certbridge-* 2>/dev/null
rm -rf "$MODDIR/data/runtime-mounts" 2>/dev/null

# 清理免重启更新产生的外部副本、worker、锁和模块专属暂存。
# 不使用通配的 modules_update 清理，避免影响其它模块。
command -v pkill >/dev/null 2>&1 && pkill -f '/data/adb/.certbridge_hot_update.sh' 2>/dev/null
rm -rf \
  /data/adb/.certbridge_hot_update_payload \
  /data/adb/.certbridge_hot_update.sh \
  /data/adb/.CACertStore.hot_update.lock \
  /data/adb/modules_update/CACertStore 2>/dev/null
rm -f "$MODDIR/update" 2>/dev/null
