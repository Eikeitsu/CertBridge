#!/system/bin/sh
# 卸载清理：尽量撤掉本模块留下的挂载、外部数据与隐藏登记。
# 脚本 bind / Magic Mount 叠层需重启后才与「从未安装」一致；隐藏侧（ksud/NoHello）在此尽量当场清掉。

MODDIR=${0%/*}
# shellcheck disable=SC1090
. "$MODDIR/bin/common.sh" 2>/dev/null || {
  # common 加载失败时仍做最小清理
  rm -rf /data/adb/certbridge \
    /data/adb/.certbridge_hot_update_payload \
    /data/adb/.certbridge_hot_update.sh \
    /data/adb/.CertBridge.hot_update.lock \
    /data/adb/modules_update/CertBridge 2>/dev/null
  exit 0
}

log_use_runtime
log_info "uninstall: start"

# 1) 热挂载临时层
if [ -x "$BINDIR/hot_mount.sh" ]; then
  sh "$BINDIR/hot_mount.sh" unmount >/dev/null 2>&1 || \
    log_warn "uninstall: hot unmount incomplete; reboot required"
fi

# 2) 隐藏协助：内核 umount / umount-config / SuSFS try_umount.txt / NoHello
if type hide_clear_applied >/dev/null 2>&1; then
  hide_clear_applied 2>/dev/null || true
  hide_cleanup_orphan_susfs_persist_dirs 2>/dev/null || true
  log_info "uninstall: hide assist cleared"
else
  # 未装隐藏组件时的兜底：仍尝试删常见 cacerts 路径的 ksud 登记
  _ksud=
  for cand in /data/adb/ksu/bin/ksud /data/adb/ksud/bin/ksud /data/adb/ksu/ksud; do
    [ -x "$cand" ] && _ksud="$cand" && break
  done
  if [ -n "$_ksud" ]; then
    for target in \
      /apex/com.android.conscrypt/cacerts \
      /system/etc/security/cacerts; do
      "$_ksud" kernel umount del "$target" >/dev/null 2>&1 || true
      "$_ksud" umount-config del "$target" >/dev/null 2>&1 || true
    done
    for apex_dir in /apex/com.android.conscrypt@*/cacerts; do
      [ -d "$apex_dir" ] || continue
      "$_ksud" kernel umount del "$apex_dir" >/dev/null 2>&1 || true
      "$_ksud" umount-config del "$apex_dir" >/dev/null 2>&1 || true
    done
  fi
fi

# 3) 卸掉本模块 tmpfs / 临时根（不保证当前进程 ns 内的 apex bind，需重启）
for _cb_mnt in \
    /dev/.fs0 /dev/.fs1 /dev/.fs0/apex /dev/.fs0/system \
    /dev/.cb0 /dev/.cb1 /dev/.cb0/apex /dev/.cb0/system \
    /mnt/.ca0 /mnt/.ca1 /mnt/.ca0/apex /mnt/.ca0/system \
    /data/local/tmp/.fs0 /data/local/tmp/.fs1 \
    /data/local/tmp/.fs0/apex /data/local/tmp/.fs0/system \
    /data/local/tmp/sys-ca-merge /data/local/tmp/sys-ca-merge-hot \
    /data/local/tmp/sys-ca-merge/apex /data/local/tmp/sys-ca-merge/system; do
  umount "$_cb_mnt" 2>/dev/null
done
rm -rf /dev/.fs0 /dev/.fs1 /dev/.cb0 /dev/.cb1 \
  /mnt/.ca0 /mnt/.ca1 \
  /data/local/tmp/.fs0 /data/local/tmp/.fs1 \
  /data/local/tmp/sys-ca-merge /data/local/tmp/sys-ca-merge-hot \
  /data/local/tmp/certbridge-* 2>/dev/null
rm -rf "$MODDIR/data/runtime-mounts" 2>/dev/null

# 4) 免重启更新副本、worker、锁；模块外数据（含 CLI / user.conf / 证书源）
command -v pkill >/dev/null 2>&1 && {
  pkill -f '/data/adb/certbridge/hot_update.sh' 2>/dev/null
  pkill -f '/data/adb/.certbridge_hot_update.sh' 2>/dev/null
}
rm -rf \
  /data/adb/certbridge \
  /data/adb/.certbridge_hot_update_payload \
  /data/adb/.certbridge_hot_update.sh \
  /data/adb/.CertBridge.hot_update.lock \
  /data/adb/modules_update/CertBridge 2>/dev/null
rm -f "$MODDIR/update" 2>/dev/null

log_info "uninstall: done; reboot to drop leftover cacerts binds / Magic Mount"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] uninstall: done; reboot required for mounts" >>"${RUNTIME_LOG_FILE:-/dev/null}" 2>/dev/null || true
