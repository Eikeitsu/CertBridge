#!/system/bin/sh
# 已安装抓包 App 的 CA 路径探测（不含导入 / 解析）
#
# 安装脚本与 WebUI/CLI 共用本文件。
# 差异仅在于进程 mount ns：安装多在全局 ns 可直接读；
# WebUI 常在隔离 ns，需经 init ns 探测/拷出（ensure_readable_cert_file）。

_app_cert_in_init_ns() {
  p="$1"
  [ -n "$p" ] || return 1
  command -v nsenter >/dev/null 2>&1 || return 1
  [ -d /proc/1/ns/mnt ] || return 1
  nsenter --mount=/proc/1/ns/mnt -- test -f "$p" 2>/dev/null
}

# 保证当前 ns 可读：本 ns 直接返回；否则从 init ns 拷到外部目录
ensure_readable_cert_file() {
  src="$1"
  [ -n "$src" ] || return 1
  if [ -f "$src" ] && [ -r "$src" ]; then
    echo "$src"
    return 0
  fi
  # status 热路径可关 init 探测
  [ "${_APP_CERT_TRY_INIT_NS:-1}" != "0" ] || return 1
  _app_cert_in_init_ns "$src" || return 1
  probe_dir="${CB_EXT_DIR:-/data/adb/certbridge}/live_probe"
  mkdir -p "$probe_dir" 2>/dev/null || {
    probe_dir="${DATADIR:-/data/local/tmp}/live_probe"
    mkdir -p "$probe_dir" 2>/dev/null || return 1
  }
  tag=$(echo "$src" | cksum 2>/dev/null | awk '{print $1}')
  [ -n "$tag" ] || tag="x"
  dest="$probe_dir/ns_${tag}.crt"
  nsenter --mount=/proc/1/ns/mnt -- cat "$src" >"$dest" 2>/dev/null || {
    rm -f "$dest"
    return 1
  }
  [ -s "$dest" ] || {
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

# 查找已安装抓包 App 导出的 CA 路径
# try_init_ns：1=本 ns 没有时经 init mount ns 再探（WebUI 需要）；0=仅本 ns（status 轻量）
find_live_app_cert() {
  kind="$1"
  try_init_ns="${2:-1}"
  _APP_CERT_TRY_INIT_NS="$try_init_ns"
  case "$kind" in
    reqable)
      _app_cert_first_existing \
        "/storage/emulated/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android.pro/files/certificate/reqable-root.crt"
      ;;
    proxypin)
      _app_cert_first_existing \
        "/data/user/0/com.network.proxy/files/ca.crt" \
        "/data/user/0/com.wangyu.proxypin/files/ca.crt" \
        "/data/data/com.network.proxy/files/ca.crt" \
        "/data/data/com.wangyu.proxypin/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.network.proxy/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.wangyu.proxypin/files/ca.crt"
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

optional_custom_app_kinds() {
  echo "httpcanary adguard charles mitmproxy pcapdroid"
}
