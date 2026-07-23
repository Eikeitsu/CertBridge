#!/system/bin/sh
# OpenSSL 定位：优先使用模块自带静态二进制（安装环境通常没有系统 openssl）
# zip 默认只打 arm/arm64；安装时再 trim 到当前 ABI
# 全架构：OPENSSL_ABIS=all npm run package:module

OPENSSL_BUNDLE_NAMES="openssl-arm64 openssl-arm openssl-x64 openssl-x86"

# 解析模块内 openssl 目录
resolve_bundled_openssl_dir() {
  for d in \
    "${BINDIR}/openssl" \
    "${MODDIR}/bin/openssl" \
    "${MODPATH}/bin/openssl"
  do
    [ -n "$d" ] && [ -d "$d" ] && {
      echo "$d"
      return 0
    }
  done
  return 1
}

# 当前设备对应的二进制文件名（不含路径）
preferred_bundled_openssl_name() {
  abi=$(getprop ro.product.cpu.abi 2>/dev/null)
  case "$abi" in
    arm64-v8a) echo "openssl-arm64" ;;
    armeabi-v7a|armeabi) echo "openssl-arm" ;;
    x86_64) echo "openssl-x64" ;;
    x86) echo "openssl-x86" ;;
    *) return 1 ;;
  esac
}

# 按 ABI 选择模块内 openssl 路径（只看文件是否存在，不看执行位）
resolve_bundled_openssl_path() {
  base=$(resolve_bundled_openssl_dir) || return 1

  pref=$(preferred_bundled_openssl_name 2>/dev/null)
  if [ -n "$pref" ] && [ -f "$base/$pref" ]; then
    echo "$base/$pref"
    return 0
  fi
  for name in $OPENSSL_BUNDLE_NAMES; do
    [ -f "$base/$name" ] || continue
    echo "$base/$name"
    return 0
  done
  return 1
}

# 安装时删除其它架构，只保留将实际使用的那一份
trim_bundled_openssl_to_abi() {
  base=$(resolve_bundled_openssl_dir) || return 0
  keep=$(resolve_bundled_openssl_path) || return 0
  keep_name=${keep##*/}
  removed=0
  for name in $OPENSSL_BUNDLE_NAMES; do
    [ "$name" = "$keep_name" ] && continue
    [ -f "$base/$name" ] || continue
    rm -f "$base/$name"
    removed=$((removed + 1))
  done
  if [ "$removed" -gt 0 ]; then
    echo "keep=$keep_name removed=$removed"
  else
    echo "keep=$keep_name removed=0"
  fi
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

# Lite：dex + app_process，伪装成 openssl（支持 x509 / version）
resolve_cbx509_wrapper() {
  for s in \
    "${BINDIR}/cbx509.sh" \
    "${MODDIR}/bin/cbx509.sh" \
    "${MODPATH}/bin/cbx509.sh"
  do
    [ -n "$s" ] && [ -f "$s" ] || continue
    dex_dir="${s%/*}/cbx509"
    [ -f "$dex_dir/classes.dex" ] || continue
    if [ ! -x /system/bin/app_process64 ] && \
       [ ! -x /system/bin/app_process ] && \
       [ ! -x /system/bin/app_process32 ] && \
       [ ! -x /system/bin/dalvikvm ] && \
       [ ! -x /system/bin/dalvikvm64 ]; then
      continue
    fi
    chmod 0755 "$s" 2>/dev/null || true
    echo "$s"
    return 0
  done
  return 1
}

# 安装诊断：把失败原因写到 stdout（供 install.log）
diagnose_bundled_openssl() {
  echo "abi=$(getprop ro.product.cpu.abi 2>/dev/null)"
  echo "preferred=$(preferred_bundled_openssl_name 2>/dev/null)"
  echo "BINDIR=${BINDIR:-}"
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
  for d in "${BINDIR}/cbx509" "${MODDIR}/bin/cbx509" "${MODPATH}/bin/cbx509"; do
    [ -n "$d" ] || continue
    if [ -f "$d/classes.dex" ]; then
      echo "cbx509_dex=$d/classes.dex"
      echo "cbx509_dex_size=$(wc -c <"$d/classes.dex" 2>/dev/null)"
    fi
  done
  cand=$(resolve_bundled_openssl_path) || {
    echo "resolve_openssl=fail"
    if w=$(resolve_cbx509_wrapper 2>/dev/null); then
      echo "cbx509_wrapper=$w"
      return 0
    fi
    echo "resolve_cbx509=fail"
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
  if lite=$(resolve_cbx509_wrapper); then
    echo "$lite"
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
