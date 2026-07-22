#!/system/bin/sh
# OpenSSL 定位（CLI / 热挂载共用）

find_openssl() {
  for binary in openssl /system/bin/openssl /data/adb/magisk/busybox; do
    if [ "$binary" = "/data/adb/magisk/busybox" ]; then
      [ -x "$binary" ] && "$binary" openssl version >/dev/null 2>&1 && {
        echo "$binary openssl"
        return 0
      }
    elif command -v "$binary" >/dev/null 2>&1 || [ -x "$binary" ]; then
      echo "$binary"
      return 0
    fi
  done
  return 1
}
