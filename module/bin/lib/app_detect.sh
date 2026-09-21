#!/system/bin/sh
# 已安装抓包 App 的 CA 路径探测（不含导入 / 解析）

# WebUI / 管理器进程常落在隔离 mount ns，看不到其它 App 的 Android/data；
# 安装脚本多在全局 ns，故「刷入能扫到、WebUI 找不到」。经 init ns 探测/拷出。
_app_cert_in_init_ns() {
  p="$1"
  [ -n "$p" ] || return 1
  # 优先 /proc/1/root（无需 nsenter，Magisk WebUI 更常见）
  [ -e "/proc/1/root$p" ] && return 0
  command -v nsenter >/dev/null 2>&1 || return 1
  [ -d /proc/1/ns/mnt ] || return 1
  nsenter --mount=/proc/1/ns/mnt -- test -f "$p" 2>/dev/null
}

# 保证当前 ns 可读：本 ns 直接返回；否则从 init ns 拷到可读位置
ensure_readable_cert_file() {
  src="$1"
  [ -n "$src" ] || return 1
  case "$src" in /*) ;; *) return 1 ;; esac
  if [ -f "$src" ] && [ -r "$src" ]; then
    echo "$src"
    return 0
  fi
  # status 热路径可关 init 探测
  [ "${_APP_CERT_TRY_INIT_NS:-1}" != "0" ] || return 1

  # 同 inode 视图：部分环境可直接读 /proc/1/root$src
  if [ -f "/proc/1/root$src" ] && [ -r "/proc/1/root$src" ]; then
    echo "/proc/1/root$src"
    return 0
  fi

  _app_cert_in_init_ns "$src" || return 1
  # 拷贝落到模块外，避免叠层目录不可写
  probe_dir="${CB_EXT_DIR:-/data/adb/certbridge}/live_probe"
  mkdir -p "$probe_dir" 2>/dev/null || {
    probe_dir="${DATADIR:-/data/local/tmp}/live_probe"
    mkdir -p "$probe_dir" 2>/dev/null || return 1
  }
  tag=$(echo "$src" | cksum 2>/dev/null | awk '{print $1}')
  [ -n "$tag" ] || tag="x"
  dest="$probe_dir/ns_${tag}.crt"
  copied=0
  if [ -f "/proc/1/root$src" ]; then
    cp -f "/proc/1/root$src" "$dest" 2>/dev/null && copied=1
  fi
  if [ "$copied" != "1" ] && command -v nsenter >/dev/null 2>&1; then
    nsenter --mount=/proc/1/ns/mnt -- cat "$src" >"$dest" 2>/dev/null && copied=1
  fi
  [ "$copied" = "1" ] || {
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
    # 必须返回「当前 ns 可读」路径，否则后续 openssl 导入必失败
    if readable=$(ensure_readable_cert_file "$p" 2>/dev/null); then
      echo "$readable"
      return 0
    fi
  done
  return 1
}

# 查找已安装抓包 App 导出的 CA 路径
# try_init_ns：1=本 ns 没有时经 init mount ns 再探（WebUI 隔离 ns 需要）；0=仅本 ns（status 热路径）
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
        "/sdcard/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/sdcard/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/data/com.reqable.android.pro/files/certificate/reqable-root.crt"
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
      # 包名路径里的 adg 是第三方目录名，kind 统一用 adguard
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
      # 多为用户导出到下载目录；亦试常见自定义路径
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
