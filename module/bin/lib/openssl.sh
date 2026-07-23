#!/system/bin/sh
# OpenSSL 定位：优先使用模块自带静态二进制（安装环境通常没有系统 openssl）

find_bundled_openssl() {
  base="$BINDIR/openssl"
  [ -d "$base" ] || return 1
  abi=$(getprop ro.product.cpu.abi 2>/dev/null)
  cand=""
  case "$abi" in
    arm64-v8a) cand="$base/openssl-arm64" ;;
    armeabi-v7a|armeabi) cand="$base/openssl-arm" ;;
    x86_64) cand="$base/openssl-x64" ;;
    x86) cand="$base/openssl-x86" ;;
  esac
  if [ -z "$cand" ] || [ ! -x "$cand" ]; then
    for c in "$base/openssl-arm64" "$base/openssl-arm" "$base/openssl-x64" "$base/openssl-x86"; do
      [ -x "$c" ] || continue
      cand="$c"
      break
    done
  fi
  [ -n "$cand" ] && [ -x "$cand" ] || return 1
  # Magisk 解压后偶发无执行位，尝试补齐
  chmod 0755 "$cand" 2>/dev/null
  "$cand" version >/dev/null 2>&1 || return 1
  echo "$cand"
}

find_openssl() {
  if bundled=$(find_bundled_openssl); then
    echo "$bundled"
    return 0
  fi

  candidate=""
  for binary in \
    openssl \
    /system/bin/openssl \
    /system/xbin/openssl \
    /vendor/bin/openssl \
    /data/data/com.termux/files/usr/bin/openssl \
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
