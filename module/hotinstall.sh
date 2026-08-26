#!/system/bin/sh
# 热更新后重新注入
PATH=/data/adb/ap/bin:/data/adb/ksu/bin:/data/adb/magisk:$PATH
MODDIR="${0%/*}"

rm -f "$MODDIR/update" 2>/dev/null

# 永久注入依赖 post-fs-data 生成 + service 加固命名空间
if [ -f "$MODDIR/post-fs-data.sh" ]; then
	sh "$MODDIR/post-fs-data.sh" >/dev/null 2>&1 || true
fi
if [ -f "$MODDIR/service.sh" ]; then
	sh "$MODDIR/service.sh" >/dev/null 2>&1 || true
fi

echo "certbridge: hotinstall done" >>/dev/kmsg 2>/dev/null || true
