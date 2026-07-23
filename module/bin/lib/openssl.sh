#!/system/bin/sh
# OpenSSL 定位：优先使用模块自带静态二进制（安装环境通常没有系统 openssl）

# 按 ABI 选择模块内 openssl 路径（只看文件是否存在，不看执行位）
resolve_bundled_openssl_path() {
  base=""
  for d in \
    "${BINDIR}/openssl" \
    "${MODDIR}/bin/openssl" \
    "${MODPATH}/bin/openssl"
  do
    [ -n "$d" ] && [ -d "$d" ] && {
      base="$d"
      break
    }
  done
  [ -n "$base" ] || return 1

  abi=$(getprop ro.product.cpu.abi 2>/dev/null)
  cand=""
  case "$abi" in
    arm64-v8a) cand="$base/openssl-arm64" ;;
    armeabi-v7a|armeabi) cand="$base/openssl-arm" ;;
    x86_64) cand="$base/openssl-x64" ;;
    x86) cand="$base/openssl-x86" ;;
  esac
  if [ -n "$cand" ] && [ -f "$cand" ]; then
    echo "$cand"
    return 0
  fi
  for c in "$base/openssl-arm64" "$base/openssl-arm" "$base/openssl-x64" "$base/openssl-x86"; do
    [ -f "$c" ] || continue
    echo "$c"
    return 0
  done
  return 1
}

find_bundled_openssl() {
  cand=$(resolve_bundled_openssl_path) || return 1
  # Magisk/KSU 解压后通常没有 +x，必须先 chmod 再探测
  chmod 0755 "$cand" 2>/dev/null || chmod +x "$cand" 2>/dev/null || true
  if ! "$cand" version >/dev/null 2>&1; then
    return 1
  fi
  echo "$cand"
}

# 安装诊断：把失败原因写到 stdout（供 install.log）
diagnose_bundled_openssl() {
  echo "abi=$(getprop ro.product.cpu.abi 2>/dev/null)"
  echo "BINDER=${BINDIR:-}"
  echo "MODDIR=${MODDIR:-}"
  echo "MODPATH=${MODPATH:-}"
  for d in "${BINDIR}/openssl" "${MODDIR}/bin/openssl" "${MODPATH}/bin/openssl"; do
    [ -n "$d" ] || continue
    if [ -d "$d" ]; then
      echo "dir_ok=$d"
      ls -l "$d" 2>/dev/null | while IFS= read -r line; do
        echo "  $line"
      done
    else
      echo "dir_missing=$d"
    fi
  done
  cand=$(resolve_bundled_openssl_path) || {
    echo "resolve=fail"
    return 1
  }
  echo "candidate=$cand"
  chmod 0755 "$cand" 2>/dev/null || true
  if out=$("$cand" version 2>&1); then
    echo "version_ok=$out"
    return 0
  fi
  echo "version_fail=$out"
  return 1
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
        [ -f "$binary" ] || continue
        chmod 0755 "$binary" 2>/dev/null || true
        "$binary" version >/dev/null 2>&1 || continue
        echo "$binary"
        return 0
        ;;
    esac
  done
  return 1
}
