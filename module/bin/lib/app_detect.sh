#!/system/bin/sh
# 已安装抓包 App 的 CA 路径探测（不含导入 / 解析）
#
# WebUI / 管理器常在隔离 mount ns，本 ns 看不到 App 的 Android/data；
# 刷入脚本多在全局 ns，故「安装能扫到、WebUI 找不到」。
# 探测顺序：本 ns → /proc/<pid>/root → nsenter(init/zygote/system_server)。

_app_nsenter_bin() {
  for b in nsenter /system/bin/nsenter /system/xbin/nsenter; do
    command -v "$b" >/dev/null 2>&1 || [ -x "$b" ] || continue
    command -v "$b" >/dev/null 2>&1 && { command -v "$b"; return 0; }
    [ -x "$b" ] && { echo "$b"; return 0; }
  done
  if [ -x /data/adb/magisk/busybox ]; then
    echo "/data/adb/magisk/busybox nsenter"
    return 0
  fi
  if [ -x /data/adb/ksu/bin/busybox ]; then
    echo "/data/adb/ksu/bin/busybox nsenter"
    return 0
  fi
  return 1
}

# 候选 mount ns：init / zygote / system_server（WebUI 隔离时 init 的 /proc/1/root 可能无权限）
_app_mnt_ns_pids() {
  printf '%s\n' 1
  for n in zygote64 zygote system_server; do
    # shellcheck disable=SC2046
    for p in $(pidof "$n" 2>/dev/null); do
      printf '%s\n' "$p"
    done
  done
}

_app_test_file_in_ns() {
  p="$1"
  pid="$2"
  [ -n "$p" ] && [ -n "$pid" ] || return 1
  [ -e "/proc/$pid/root$p" ] && return 0
  ne=$(_app_nsenter_bin) || return 1
  [ -d "/proc/$pid/ns/mnt" ] || return 1
  # busybox nsenter 可能是两词
  # shellcheck disable=SC2086
  $ne --mount="/proc/$pid/ns/mnt" -- test -f "$p" 2>/dev/null
}

_app_cert_in_foreign_ns() {
  p="$1"
  [ -n "$p" ] || return 1
  for pid in $(_app_mnt_ns_pids); do
    _app_test_file_in_ns "$p" "$pid" && return 0
  done
  return 1
}

_app_copy_from_foreign_ns() {
  src="$1"
  dest="$2"
  [ -n "$src" ] && [ -n "$dest" ] || return 1
  for pid in $(_app_mnt_ns_pids); do
    if [ -f "/proc/$pid/root$src" ] && [ -r "/proc/$pid/root$src" ]; then
      cp -f "/proc/$pid/root$src" "$dest" 2>/dev/null && [ -s "$dest" ] && return 0
    fi
    ne=$(_app_nsenter_bin) || continue
    [ -d "/proc/$pid/ns/mnt" ] || continue
    # shellcheck disable=SC2086
    $ne --mount="/proc/$pid/ns/mnt" -- cat "$src" >"$dest" 2>/dev/null || {
      rm -f "$dest"
      continue
    }
    [ -s "$dest" ] && return 0
    rm -f "$dest"
  done
  return 1
}

# 保证当前 ns 可读：本 ns 直接返回；否则从它 ns 拷到模块外
ensure_readable_cert_file() {
  src="$1"
  [ -n "$src" ] || return 1
  case "$src" in /*) ;; *) return 1 ;; esac
  if [ -f "$src" ] && [ -r "$src" ]; then
    echo "$src"
    return 0
  fi
  [ "${_APP_CERT_TRY_INIT_NS:-1}" != "0" ] || return 1

  for pid in $(_app_mnt_ns_pids); do
    if [ -f "/proc/$pid/root$src" ] && [ -r "/proc/$pid/root$src" ]; then
      echo "/proc/$pid/root$src"
      return 0
    fi
  done

  _app_cert_in_foreign_ns "$src" || return 1
  probe_dir="${CB_EXT_DIR:-/data/adb/certbridge}/live_probe"
  mkdir -p "$probe_dir" 2>/dev/null || {
    probe_dir="${DATADIR:-/data/local/tmp}/live_probe"
    mkdir -p "$probe_dir" 2>/dev/null || return 1
  }
  tag=$(echo "$src" | cksum 2>/dev/null | awk '{print $1}')
  [ -n "$tag" ] || tag="x"
  dest="$probe_dir/ns_${tag}.crt"
  _app_copy_from_foreign_ns "$src" "$dest" || {
    rm -f "$dest"
    return 1
  }
  chmod 0644 "$dest" 2>/dev/null
  echo "$dest"
}

_app_cert_first_existing() {
  for p in "$@"; do
    [ -n "$p" ] || continue
    if readable=$(ensure_readable_cert_file "$p" 2>/dev/null); then
      echo "$readable"
      return 0
    fi
  done
  return 1
}

# 已知路径全失败时：在 init/zygote ns 里有界查找（仅开启热路径）
_app_cert_find_by_name() {
  name="$1"
  [ -n "$name" ] || return 1
  [ "${_APP_CERT_TRY_INIT_NS:-1}" != "0" ] || return 1
  ne=$(_app_nsenter_bin) || return 1
  for pid in 1 $(pidof zygote64 2>/dev/null) $(pidof zygote 2>/dev/null); do
    [ -d "/proc/$pid/ns/mnt" ] || continue
    found=$(
      # shellcheck disable=SC2086
      $ne --mount="/proc/$pid/ns/mnt" -- \
        find /data/media/0/Android/data /data/user/0 /data/data \
        -maxdepth 5 -name "$name" -type f 2>/dev/null | head -n1
    )
    [ -n "$found" ] || continue
    if readable=$(ensure_readable_cert_file "$found" 2>/dev/null); then
      echo "$readable"
      return 0
    fi
  done
  return 1
}

# 查找已安装抓包 App 导出的 CA 路径
# try_init_ns：1=跨 ns 探测；0=仅本 ns（status 轻量路径）
find_live_app_cert() {
  kind="$1"
  try_init_ns="${2:-1}"
  _APP_CERT_TRY_INIT_NS="$try_init_ns"
  case "$kind" in
    reqable)
      if path=$(_app_cert_first_existing \
        "/storage/emulated/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/sdcard/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/sdcard/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/data/com.reqable.android.pro/files/certificate/reqable-root.crt"); then
        echo "$path"
        return 0
      fi
      [ "$try_init_ns" = "1" ] || return 1
      _app_cert_find_by_name "reqable-root.crt"
      ;;
    proxypin)
      if path=$(_app_cert_first_existing \
        "/data/user/0/com.network.proxy/files/ca.crt" \
        "/data/user/0/com.wangyu.proxypin/files/ca.crt" \
        "/data/data/com.network.proxy/files/ca.crt" \
        "/data/data/com.wangyu.proxypin/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.network.proxy/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.wangyu.proxypin/files/ca.crt" \
        "/data/media/0/Android/data/com.network.proxy/files/ca.crt" \
        "/data/media/0/Android/data/com.wangyu.proxypin/files/ca.crt"); then
        echo "$path"
        return 0
      fi
      [ "$try_init_ns" = "1" ] || return 1
      # 禁止全盘搜 ca.crt（误伤）；只在已知包目录下找
      ne=$(_app_nsenter_bin) || return 1
      for pid in 1 $(pidof zygote64 2>/dev/null) $(pidof zygote 2>/dev/null); do
        [ -d "/proc/$pid/ns/mnt" ] || continue
        found=$(
          # shellcheck disable=SC2086
          $ne --mount="/proc/$pid/ns/mnt" -- \
            find /data/user/0/com.network.proxy /data/user/0/com.wangyu.proxypin \
              /data/data/com.network.proxy /data/data/com.wangyu.proxypin \
              /data/media/0/Android/data/com.network.proxy \
              /data/media/0/Android/data/com.wangyu.proxypin \
            -maxdepth 4 -name 'ca.crt' -type f 2>/dev/null | head -n1
        )
        [ -n "$found" ] || continue
        if readable=$(ensure_readable_cert_file "$found" 2>/dev/null); then
          echo "$readable"
          return 0
        fi
      done
      return 1
      ;;
    httpcanary)
      _app_cert_first_existing \
        "/data/user/0/com.guoshi.httpcanary/cache/HttpCanary.pem" \
        "/data/user/0/com.guoshi.httpcanary.premium/cache/HttpCanary.pem" \
        "/data/data/com.guoshi.httpcanary/cache/HttpCanary.pem" \
        "/data/data/com.guoshi.httpcanary.premium/cache/HttpCanary.pem"
      ;;
    adguard)
      if path=$(_app_cert_first_existing \
        "/data/user/0/com.adguard.android/files/ca.crt" \
        "/data/user/0/com.adguard.android/files/certificate.crt" \
        "/data/user/0/com.adguard.android.contentblocker/files/ca.crt" \
        "/data/data/com.adguard.android/files/ca.crt" \
        "/data/user/0/com.network.adg/files/ca.crt" \
        "/data/user/0/com.network.adg/files/certificate.crt" \
        "/data/user/0/com.adg.catcher/files/ca.crt" \
        "/data/data/com.network.adg/files/ca.crt"); then
        echo "$path"
        return 0
      fi
      for dir in /data/user/0/com.adguard* /data/data/com.adguard* \
        /data/user/0/*adg* /data/data/*adg*; do
        [ -d "$dir" ] || continue
        path=$(_app_cert_first_existing \
          "$dir/files/ca.crt" \
          "$dir/files/certificate.crt" \
          "$dir/cache/ca.pem" \
          "$dir/cache/HttpCanary.pem") || continue
        echo "$path"
        return 0
      done
      return 1
      ;;
    charles)
      _app_cert_first_existing \
        "/storage/emulated/0/Download/charles-ssl-proxying-certificate.pem" \
        "/storage/emulated/0/Download/charles-proxy-ssl-proxying-certificate.pem" \
        "/data/media/0/Download/charles-ssl-proxying-certificate.pem" \
        "/sdcard/Download/charles-ssl-proxying-certificate.pem" \
        "/storage/emulated/0/Documents/charles-ssl-proxying-certificate.pem" \
        "/data/local/tmp/charles-ssl-proxying-certificate.pem"
      ;;
    mitmproxy)
      _app_cert_first_existing \
        "/storage/emulated/0/Download/mitmproxy-ca-cert.pem" \
        "/storage/emulated/0/Download/mitmproxy-ca-cert.cer" \
        "/data/media/0/Download/mitmproxy-ca-cert.pem" \
        "/sdcard/Download/mitmproxy-ca-cert.pem" \
        "/storage/emulated/0/Documents/mitmproxy-ca-cert.pem" \
        "/data/local/tmp/mitmproxy-ca-cert.pem" \
        "/data/data/org.mitmproxy.android/files/mitmproxy-ca-cert.pem"
      ;;
    pcapdroid)
      _app_cert_first_existing \
        "/data/user/0/com.emanuelef.remote_capture/files/cacert.pem" \
        "/data/user/0/com.emanuelef.remote_capture/files/ca.crt" \
        "/data/data/com.emanuelef.remote_capture/files/cacert.pem" \
        "/data/data/com.emanuelef.remote_capture/files/ca.crt" \
        "/storage/emulated/0/Download/PCAPdroid_CA.crt" \
        "/storage/emulated/0/Download/PCAPdroid_CA.pem" \
        "/sdcard/Download/PCAPdroid_CA.crt"
      ;;
    *) return 1 ;;
  esac
}

app_cert_label() {
  case "$1" in
    reqable) echo "Reqable" ;;
    proxypin) echo "ProxyPin" ;;
    httpcanary) echo "HttpCanary" ;;
    adguard) echo "ADGuard" ;;
    charles) echo "Charles" ;;
    mitmproxy) echo "mitmproxy" ;;
    pcapdroid) echo "PCAPdroid" ;;
    *) echo "$1" ;;
  esac
}

# 可作为「自定义导入预设」探测的 kind（不含 Reqable/ProxyPin 源开关）
optional_custom_app_kinds() {
  echo "httpcanary adguard charles mitmproxy pcapdroid"
}
