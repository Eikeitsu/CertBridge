#!/system/bin/sh
# OpenSSL 定位（安装 / CLI / 热挂载共用）

find_openssl() {
  candidate=""
  for binary in \
    openssl \
    /system/bin/openssl \
    /system/xbin/openssl \
    /vendor/bin/openssl \
    /data/adb/magisk/busybox \
    /data/adb/ksu/bin/busybox \
    /data/adb/ap/bin/busybox \
    /data/adb/modules/busybox-ndk/system/bin/busybox
  do
    if [ "$binary" = "openssl" ]; then
      command -v openssl >/dev/null 2>&1 || continue
      candidate=$(command -v openssl)
      [ -n "$candidate" ] || continue
      "$candidate" version >/dev/null 2>&1 || continue
      echo "$candidate"
      return 0
    fi
    case "$binary" in
      */busybox)
        [ -x "$binary" ] || continue
        "$binary" openssl version >/dev/null 2>&1 || continue
        echo "$binary openssl"
        return 0
        ;;
      *)
        [ -x "$binary" ] || continue
        "$binary" version >/dev/null 2>&1 || continue
        echo "$binary"
        return 0
        ;;
    esac
  done
  return 1
}
